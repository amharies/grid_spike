import pandas as pd
import numpy as np
import lightgbm as lgb
from sklearn.metrics import precision_recall_curve, auc, roc_auc_score
from sklearn.ensemble import IsolationForest
import shap
import matplotlib.pyplot as plt
import os
import gc

def reduce_mem_usage(df):
    """ iterate through all the columns of a dataframe and modify the data type
        to reduce memory usage.        
    """
    start_mem = df.memory_usage().sum() / 1024**2
    for col in df.columns:
        col_type = df[col].dtype
        
        if not pd.api.types.is_numeric_dtype(df[col]):
            continue
            
        c_min = df[col].min()
        c_max = df[col].max()
        if str(col_type)[:3] == 'int':
            if c_min > np.iinfo(np.int8).min and c_max < np.iinfo(np.int8).max:
                df[col] = df[col].astype(np.int8)
            elif c_min > np.iinfo(np.int16).min and c_max < np.iinfo(np.int16).max:
                df[col] = df[col].astype(np.int16)
            elif c_min > np.iinfo(np.int32).min and c_max < np.iinfo(np.int32).max:
                df[col] = df[col].astype(np.int32)
            elif c_min > np.iinfo(np.int64).min and c_max < np.iinfo(np.int64).max:
                df[col] = df[col].astype(np.int64)  
        else:
            if c_min > np.finfo(np.float32).min and c_max < np.finfo(np.float32).max:
                df[col] = df[col].astype(np.float32)
            else:
                df[col] = df[col].astype(np.float64)
    end_mem = df.memory_usage().sum() / 1024**2
    print(f'Memory usage decreased to {end_mem:.2f} MB')
    return df

print("Loading data...")
file_path = 'ElectricityTheftDetection-master/ElectricityTheftDetection-master/data/data.csv'
df = pd.read_csv(file_path)

id_vars = ['CONS_NO', 'FLAG']
date_cols = [c for c in df.columns if c not in id_vars]

print("Melting dataframe...")
df_long = pd.melt(df, id_vars=id_vars, value_vars=date_cols, var_name='Date', value_name='Consumption')
del df
gc.collect()

print("Parsing dates...")
df_long['Date'] = pd.to_datetime(df_long['Date'], format='%Y/%m/%d', errors='coerce')
df_long = df_long.dropna(subset=['Date'])

print("Converting consumption to numeric...")
df_long['Consumption'] = pd.to_numeric(df_long['Consumption'], errors='coerce')

print("Reducing memory...")
df_long = reduce_mem_usage(df_long)

print("Sorting...")
df_long = df_long.sort_values(['CONS_NO', 'Date']).reset_index(drop=True)

print("Handling missingness...")
df_long['is_missing'] = df_long['Consumption'].isna().astype(np.int8)
df_long['Consumption'] = df_long['Consumption'].fillna(0.0)

print("Calculating Peer Medians...")
peer_medians = df_long.groupby('Date')['Consumption'].median().astype(np.float32)
df_long = df_long.merge(peer_medians.rename('Peer_Median'), on='Date', how='left')
df_long['Peer_Deviation'] = df_long['Consumption'] - df_long['Peer_Median']

def extract_features_for_period(df_period):
    if len(df_period) == 0:
        return pd.DataFrame()
        
    print(f"Extracting features for period containing {len(df_period)} records...")
    df_period = df_period.sort_values(['CONS_NO', 'Date']).copy()
    gb = df_period.groupby('CONS_NO')
    
    # Missingness Streaks (vectorized approx)
    df_period['block'] = (df_period['is_missing'] != df_period.groupby('CONS_NO')['is_missing'].shift()).cumsum()
    df_period['missing_streak'] = df_period['is_missing'] * (df_period.groupby(['CONS_NO', 'block']).cumcount() + 1)
    
    # Expected vs Actual (60-day rolling mean for expected behavior)
    df_period['expected'] = gb['Consumption'].transform(lambda x: x.rolling(60, min_periods=1).mean())
    df_period['gap'] = df_period['Consumption'] - df_period['expected']
    df_period['negative_residual'] = np.where(df_period['gap'] < 0, df_period['gap'].abs(), 0)
    
    # Dynamic CUSUM
    # CUSUM logic: S_t = max(0, S_{t-1} + gap_t)
    # We will use negative_residual directly. A high negative_residual means actual << expected.
    # We just accumulate negative residuals and reset if gap > 0.
    # To do this efficiently without a python loop per group, we can use cumsum with block resets.
    df_period['is_positive_gap'] = df_period['gap'] > 0
    df_period['cusum_block'] = df_period.groupby('CONS_NO')['is_positive_gap'].cumsum()
    df_period['cusum'] = df_period.groupby(['CONS_NO', 'cusum_block'])['negative_residual'].cumsum()
    
    # Rolling stats for recent behavior (last 30 days)
    df_period['recent_mean'] = gb['Consumption'].transform(lambda x: x.rolling(30, min_periods=1).mean())
    df_period['recent_std'] = gb['Consumption'].transform(lambda x: x.rolling(30, min_periods=1).std()).fillna(0)
    
    # Aggregations
    aggs = gb.agg(
        valid_reading_days=('is_missing', lambda x: (~x.astype(bool)).sum()),
        longest_missing_streak=('missing_streak', 'max'),
        missing_rate=('is_missing', 'mean'),
        consumption_mean=('Consumption', 'mean'),
        consumption_std=('Consumption', 'std'),
        peer_dev_mean=('Peer_Deviation', 'mean'),
        total_deficit=('negative_residual', 'sum'),
        cusum_score=('cusum', 'max'),
        residual_std=('negative_residual', 'std'),
        large_deficit_ratio=('negative_residual', lambda x: (x > x.mean() + x.std()).mean()),
        recent_mean=('recent_mean', 'last'),
        recent_std=('recent_std', 'last')
    ).reset_index()
    
    # CV
    aggs['acct_cv'] = np.where(aggs['consumption_mean'] > 0, aggs['consumption_std'] / aggs['consumption_mean'], 0)
    aggs['recent_mean_shift'] = aggs['recent_mean'] - aggs['consumption_mean']
    
    # Find change point (day of max cusum)
    max_cusum_idx = df_period.groupby('CONS_NO')['cusum'].idxmax()
    # We will approximate days since change by the distance to the end of the period
    # Group size is roughly the number of days in period
    period_lengths = gb.size()
    # Index of max cusum relative to group
    # A bit complex to do perfectly vectorized, so we will skip days_since_change for now or use a proxy.
    
    flags = df_period[['CONS_NO', 'FLAG']].drop_duplicates()
    features = pd.merge(aggs, flags, on='CONS_NO', how='left')
    
    return features

# Define periods
train_mask = (df_long['Date'] >= '2014-01-01') & (df_long['Date'] <= '2015-12-24')
val_mask = (df_long['Date'] >= '2015-12-25') & (df_long['Date'] <= '2016-05-27')
test_mask = (df_long['Date'] >= '2016-05-28') & (df_long['Date'] <= '2016-10-31')

print("Extracting Train features...")
train_features = extract_features_for_period(df_long[train_mask])
print("Extracting Val features...")
val_features = extract_features_for_period(df_long[val_mask])
print("Extracting Test features...")
test_features = extract_features_for_period(df_long[test_mask])

# Train Anomaly Score (Isolation Forest) on train set
print("Training Anomaly Detector...")
feature_cols = [c for c in train_features.columns if c not in ['CONS_NO', 'FLAG']]
iso = IsolationForest(n_estimators=100, random_state=42, n_jobs=-1)
# Impute NaNs for IsoForest
train_features[feature_cols] = train_features[feature_cols].fillna(0)
val_features[feature_cols] = val_features[feature_cols].fillna(0)
test_features[feature_cols] = test_features[feature_cols].fillna(0)

iso.fit(train_features[feature_cols])
train_features['anomaly_score'] = -iso.score_samples(train_features[feature_cols])
val_features['anomaly_score'] = -iso.score_samples(val_features[feature_cols])
test_features['anomaly_score'] = -iso.score_samples(test_features[feature_cols])

feature_cols.append('anomaly_score')

print("Training LightGBM Model...")
train_data = lgb.Dataset(train_features[feature_cols], label=train_features['FLAG'])
val_data = lgb.Dataset(val_features[feature_cols], label=val_features['FLAG'], reference=train_data)

params = {
    'objective': 'binary',
    'metric': 'custom',
    'boosting_type': 'gbdt',
    'learning_rate': 0.01,
    'num_leaves': 31,
    'feature_fraction': 0.8,
    'verbose': -1
}

# Define custom metric for PR-AUC
def pr_auc(preds, train_data):
    labels = train_data.get_label()
    precision, recall, _ = precision_recall_curve(labels, preds)
    return 'pr_auc', auc(recall, precision), True

model = lgb.train(
    params,
    train_data,
    num_boost_round=1000,
    valid_sets=[train_data, val_data],
    feval=pr_auc,
    callbacks=[lgb.early_stopping(100)]
)

print("Evaluating on Test Set...")
preds = model.predict(test_features[feature_cols])
test_features['risk_score'] = preds

# Fix Ranking Ties: Deterministic ordering using risk_score DESC, CONS_NO ASC
test_features = test_features.sort_values(by=['risk_score', 'CONS_NO'], ascending=[False, True])
test_features['rank'] = test_features['risk_score'].rank(method='first', ascending=False)

test_labels = test_features['FLAG']
precision, recall, _ = precision_recall_curve(test_labels, test_features['risk_score'])
test_pr_auc = auc(recall, precision)
test_roc_auc = roc_auc_score(test_labels, test_features['risk_score'])

print(f"Test AUC-PR: {test_pr_auc:.4f}")
print(f"Test AUC-ROC: {test_roc_auc:.4f}")

for k in [50, 100, 200, 500]:
    top_k = test_features.head(k)
    prec_k = top_k['FLAG'].mean()
    print(f"Precision@{k}: {prec_k:.4f}")

print("Unique risk scores:", test_features['risk_score'].nunique())

print("Generating Outputs...")
os.makedirs('outputs/o1', exist_ok=True)

# Save CSV
test_features[['CONS_NO', 'risk_score', 'rank']].to_csv('outputs/o1/final_predictions.csv', index=False)
test_features.to_csv('outputs/o1/investigation_features.csv', index=False)

# PR Curve
plt.figure(figsize=(8,6))
plt.plot(recall, precision, label=f'AUC-PR = {test_pr_auc:.4f}')
plt.xlabel('Recall')
plt.ylabel('Precision')
plt.title('Precision-Recall Curve')
plt.legend()
plt.savefig('outputs/o1/pr_curve.png')

# SHAP
explainer = shap.TreeExplainer(model)
shap_values = explainer.shap_values(test_features[feature_cols])
plt.figure()
if isinstance(shap_values, list):
    shap.summary_plot(shap_values[1], test_features[feature_cols], show=False)
else:
    shap.summary_plot(shap_values, test_features[feature_cols], show=False)
plt.savefig('outputs/o1/shap_summary.png', bbox_inches='tight')

print("Done! Outputs saved in 'outputs/o1' directory.")
