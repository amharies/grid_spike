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
    """ iterate through all numeric columns of a dataframe and modify the data type
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

print("Sorting by account and date...")
df_long = df_long.sort_values(['CONS_NO', 'Date']).reset_index(drop=True)

print("Handling missingness...")
df_long['is_missing'] = df_long['Consumption'].isna().astype(np.int8)
df_long['Consumption'] = df_long['Consumption'].fillna(0.0)

print("Calculating Peer Daily Medians...")
peer_medians = df_long.groupby('Date')['Consumption'].median().astype(np.float32)
df_long = df_long.merge(peer_medians.rename('Peer_Median'), on='Date', how='left')
df_long['Peer_Deviation'] = df_long['Consumption'] - df_long['Peer_Median']

def extract_features_with_history(df_all, hist_start, hist_end, eval_start, eval_end):
    """
    Extracts features for an evaluation window [eval_start, eval_end] 
    by referencing the historical baseline window [hist_start, hist_end].
    Completely leakage-safe: no data after eval_end is ever accessed.
    """
    print(f"\n--- Extracting Features: History [{hist_start} to {hist_end}] -> Eval [{eval_start} to {eval_end}] ---")
    
    # 1. Historical baseline calculations
    hist_mask = (df_all['Date'] >= hist_start) & (df_all['Date'] <= hist_end)
    df_hist = df_all[hist_mask].copy()
    
    print("Computing historical baselines...")
    df_hist['dow'] = df_hist['Date'].dt.dayofweek
    dow_means = df_hist.groupby(['CONS_NO', 'dow'])['Consumption'].mean().unstack()
    acct_dow_deviation_std = dow_means.std(axis=1).fillna(0).rename('acct_dow_deviation_std')
    
    hist_stats = df_hist.groupby('CONS_NO').agg(
        hist_mean=('Consumption', 'mean'),
        hist_std=('Consumption', 'std'),
        hist_missing_rate=('is_missing', 'mean')
    )
    hist_stats['hist_std'] = hist_stats['hist_std'].fillna(0)
    hist_stats = hist_stats.join(acct_dow_deviation_std)
    
    del df_hist
    gc.collect()
    
    # 2. Evaluation period calculations
    eval_mask = (df_all['Date'] >= eval_start) & (df_all['Date'] <= eval_end)
    df_eval = df_all[eval_mask].copy().sort_values(['CONS_NO', 'Date']).reset_index(drop=True)
    
    print("Computing evaluation window features...")
    # Merge historical baseline stats into evaluation window
    df_eval = df_eval.merge(hist_stats[['hist_mean', 'hist_std', 'hist_missing_rate']], on='CONS_NO', how='left')
    df_eval['hist_mean'] = df_eval['hist_mean'].fillna(df_eval['Consumption'])
    df_eval['hist_std'] = df_eval['hist_std'].fillna(0)
    df_eval['hist_missing_rate'] = df_eval['hist_missing_rate'].fillna(0)
    
    # Missingness streaks
    df_eval['block'] = (df_eval['is_missing'] != df_eval.groupby('CONS_NO')['is_missing'].shift()).cumsum()
    df_eval['missing_streak'] = df_eval['is_missing'] * (df_eval.groupby(['CONS_NO', 'block']).cumcount() + 1)
    
    # Residuals against historical expected consumption
    df_eval['residual'] = df_eval['Consumption'] - df_eval['hist_mean']
    df_eval['negative_residual'] = np.where(df_eval['residual'] < 0, -df_eval['residual'], 0)
    
    # Rolling 7d and 30d
    gb_eval = df_eval.groupby('CONS_NO')
    df_eval['rolling_7_std'] = gb_eval['Consumption'].transform(lambda x: x.rolling(7, min_periods=1).std()).fillna(0)
    df_eval['rolling_30_mean'] = gb_eval['Consumption'].transform(lambda x: x.rolling(30, min_periods=1).mean())
    df_eval['rolling_30_std'] = gb_eval['Consumption'].transform(lambda x: x.rolling(30, min_periods=1).std()).fillna(0)
    
    # CUSUM logic with reset
    df_eval['is_positive_gap'] = df_eval['residual'] > 0
    df_eval['cusum_block'] = gb_eval['is_positive_gap'].cumsum()
    df_eval['cusum'] = df_eval.groupby(['CONS_NO', 'cusum_block'])['negative_residual'].cumsum()
    
    # Find change point date (date of maximum CUSUM)
    max_cusum_idx = gb_eval['cusum'].idxmax()
    change_dates = df_eval.loc[max_cusum_idx, ['CONS_NO', 'Date']].rename(columns={'Date': 'change_date'})
    df_eval = df_eval.merge(change_dates, on='CONS_NO', how='left')
    df_eval['is_post_change'] = df_eval['Date'] >= df_eval['change_date']
    
    eval_end_dt = pd.to_datetime(eval_end)
    change_dates['days_since_change'] = (eval_end_dt - change_dates['change_date']).dt.days
    days_since_change_series = change_dates.set_index('CONS_NO')['days_since_change']
    
    # Post-change mean
    post_change_means = df_eval[df_eval['is_post_change']].groupby('CONS_NO')['Consumption'].mean().rename('post_change_mean')
    
    print("Aggregating account-level metrics...")
    aggs = gb_eval.agg(
        valid_reading_days=('is_missing', lambda x: (~x.astype(bool)).sum()),
        longest_missing_streak=('missing_streak', 'max'),
        missing_rate=('is_missing', 'mean'),
        consumption_mean=('Consumption', 'mean'),
        consumption_std=('Consumption', 'std'),
        peer_dev_mean=('Peer_Deviation', 'mean'),
        total_deficit=('negative_residual', 'sum'),
        cusum_score=('cusum', 'max'),
        residual_std_60d=('negative_residual', 'std'),
        negative_residual_ratio=('residual', lambda x: (x < 0).mean()),
        large_deficit_ratio=('negative_residual', lambda x: (x > x.mean() + x.std()).mean()),
        acct_volatility_7_mean=('rolling_7_std', 'mean'),
        recent_mean=('rolling_30_mean', 'last'),
        recent_std=('rolling_30_std', 'last')
    ).reset_index()
    
    # Complete feature joins
    aggs = aggs.merge(hist_stats[['hist_mean', 'hist_std', 'hist_missing_rate', 'acct_dow_deviation_std']], on='CONS_NO', how='left')
    aggs = aggs.merge(post_change_means, on='CONS_NO', how='left')
    aggs['post_change_mean'] = aggs['post_change_mean'].fillna(aggs['consumption_mean'])
    aggs = aggs.merge(days_since_change_series, on='CONS_NO', how='left')
    aggs['days_since_change'] = aggs['days_since_change'].fillna(0)
    
    # Ratios & Shifts
    aggs['recent_vs_hist_missingness'] = aggs['missing_rate'] - aggs['hist_missing_rate'].fillna(0)
    aggs['acct_cv_30d_mean'] = np.where(aggs['recent_mean'] > 0, aggs['recent_std'] / aggs['recent_mean'], 0)
    aggs['recent_mean_shift'] = aggs['recent_mean'] - aggs['hist_mean']
    aggs['normalized_recent_mean_shift'] = np.where(
        aggs['hist_std'] > 0,
        aggs['recent_mean_shift'] / aggs['hist_std'],
        aggs['recent_mean_shift']
    )
    
    # Flag labels
    flags = df_eval[['CONS_NO', 'FLAG']].drop_duplicates()
    features = pd.merge(aggs, flags, on='CONS_NO', how='left')
    
    del df_eval
    gc.collect()
    
    return features

# Split definitions:
# Train: History [2014-01-01 to 2015-06-30] -> Eval [2015-07-01 to 2015-12-24]
train_features = extract_features_with_history(
    df_long,
    hist_start='2014-01-01', hist_end='2015-06-30',
    eval_start='2015-07-01', eval_end='2015-12-24'
)

# Val: History [2014-01-01 to 2015-12-24] -> Eval [2015-12-25 to 2016-05-27]
val_features = extract_features_with_history(
    df_long,
    hist_start='2014-01-01', hist_end='2015-12-24',
    eval_start='2015-12-25', eval_end='2016-05-27'
)

# Test: History [2014-01-01 to 2016-05-27] -> Eval [2016-05-28 to 2016-10-31]
test_features = extract_features_with_history(
    df_long,
    hist_start='2014-01-01', hist_end='2016-05-27',
    eval_start='2016-05-28', eval_end='2016-10-31'
)

del df_long
gc.collect()

# List of modeling features
feature_cols = [
    'valid_reading_days',
    'longest_missing_streak',
    'missing_rate',
    'recent_vs_hist_missingness',
    'consumption_mean',
    'consumption_std',
    'acct_cv_30d_mean',
    'acct_volatility_7_mean',
    'acct_dow_deviation_std',
    'residual_std_60d',
    'negative_residual_ratio',
    'large_deficit_ratio',
    'total_deficit',
    'cusum_score',
    'days_since_change',
    'recent_mean_shift',
    'normalized_recent_mean_shift',
    'post_change_mean',
    'peer_dev_mean'
]

print(f"\nFinal feature set ({len(feature_cols)} base features):")
for f in feature_cols:
    print(f" - {f}")

# Train Isolation Forest on train features
print("\nTraining Isolation Forest Anomaly Detector...")
iso = IsolationForest(n_estimators=100, random_state=42, n_jobs=-1)
train_features[feature_cols] = train_features[feature_cols].fillna(0)
val_features[feature_cols] = val_features[feature_cols].fillna(0)
test_features[feature_cols] = test_features[feature_cols].fillna(0)

iso.fit(train_features[feature_cols])
train_features['anomaly_score'] = -iso.score_samples(train_features[feature_cols])
val_features['anomaly_score'] = -iso.score_samples(val_features[feature_cols])
test_features['anomaly_score'] = -iso.score_samples(test_features[feature_cols])

feature_cols.append('anomaly_score')
print(f"Total features with anomaly_score: {len(feature_cols)}")

# Train LightGBM with proper class weights & metric
print("\nTraining LightGBM Classifier...")
pos_weight = (len(train_features) - train_features['FLAG'].sum()) / (train_features['FLAG'].sum() + 1e-5)
print(f"Class imbalance scale_pos_weight: {pos_weight:.2f}")

train_data = lgb.Dataset(train_features[feature_cols], label=train_features['FLAG'])
val_data = lgb.Dataset(val_features[feature_cols], label=val_features['FLAG'], reference=train_data)

params = {
    'objective': 'binary',
    'boosting_type': 'gbdt',
    'learning_rate': 0.02,
    'num_leaves': 31,
    'max_depth': 6,
    'feature_fraction': 0.8,
    'scale_pos_weight': 2.0, # Moderated weighting to optimize PR curve
    'verbose': -1
}

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
    callbacks=[lgb.early_stopping(50)]
)

# Test evaluation
print("\nEvaluating on Test Set...")
preds = model.predict(test_features[feature_cols])
test_features['risk_score'] = preds

# Strict deterministic ranking without ties
test_features = test_features.sort_values(by=['risk_score', 'CONS_NO'], ascending=[False, True]).reset_index(drop=True)
test_features['rank'] = test_features['risk_score'].rank(method='first', ascending=False).astype(int)

test_labels = test_features['FLAG']
precision, recall, _ = precision_recall_curve(test_labels, test_features['risk_score'])
test_pr_auc = auc(recall, precision)
test_roc_auc = roc_auc_score(test_labels, test_features['risk_score'])

print(f"\n==========================================")
print(f"TEST EVALUATION RESULTS (Iteration o2)")
print(f"Test AUC-PR:  {test_pr_auc:.4f}")
print(f"Test AUC-ROC: {test_roc_auc:.4f}")
print(f"Unique risk scores: {test_features['risk_score'].nunique()} / {len(test_features)}")
print(f"Rank Range: {test_features['rank'].min()} to {test_features['rank'].max()}")
print(f"==========================================")

for k in [50, 100, 200, 500, 1000]:
    top_k = test_features.head(k)
    prec_k = top_k['FLAG'].mean()
    print(f"Precision@{k}: {prec_k:.4f}")

# Export outputs to outputs/o2
output_dir = 'outputs/o2'
os.makedirs(output_dir, exist_ok=True)
print(f"\nGenerating and saving outputs to {output_dir}...")

# 1. Final ranked predictions
test_features[['CONS_NO', 'risk_score', 'rank']].to_csv(f'{output_dir}/final_predictions.csv', index=False)

# 2. Complete investigation features
test_features.to_csv(f'{output_dir}/investigation_features.csv', index=False)

# 3. PR Curve Plot
plt.figure(figsize=(8,6))
plt.plot(recall, precision, color='#1f77b4', lw=2, label=f'Model o2 (AUC-PR = {test_pr_auc:.4f})')
plt.xlabel('Recall', fontsize=12)
plt.ylabel('Precision', fontsize=12)
plt.title('Precision-Recall Curve — Model o2', fontsize=14)
plt.grid(True, alpha=0.3)
plt.legend(loc='upper right', fontsize=12)
plt.savefig(f'{output_dir}/pr_curve.png', dpi=300, bbox_inches='tight')
plt.close()

# 4. SHAP Explanation Plot
print("Computing SHAP feature explanations...")
explainer = shap.TreeExplainer(model)
shap_values = explainer.shap_values(test_features[feature_cols])

plt.figure(figsize=(10,8))
if isinstance(shap_values, list):
    shap.summary_plot(shap_values[1], test_features[feature_cols], show=False)
else:
    shap.summary_plot(shap_values, test_features[feature_cols], show=False)
plt.title('SHAP Feature Importance — Model o2', fontsize=14)
plt.savefig(f'{output_dir}/shap_summary.png', dpi=300, bbox_inches='tight')
plt.close()

print("\nAll outputs successfully generated and saved in outputs/o2!")
