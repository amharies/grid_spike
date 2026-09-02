import pandas as pd
import numpy as np
import lightgbm as lgb
from sklearn.metrics import precision_recall_curve, auc, roc_auc_score
from sklearn.ensemble import IsolationForest
import shap
import matplotlib.pyplot as plt
import os
import time
import warnings
warnings.filterwarnings('ignore')

print("=== REPRODUCING & BOOSTING HIGH AUC-PR MODEL ===")
start_t = time.time()

print("1. Loading raw dataset...")
file_path = 'ElectricityTheftDetection-master/ElectricityTheftDetection-master/data/data.csv'
df = pd.read_csv(file_path)

id_vars = ['CONS_NO', 'FLAG']
date_cols = [c for c in df.columns if c not in id_vars]

date_objs = pd.to_datetime(date_cols, format='%Y/%m/%d', errors='coerce')
valid_date_indices = [i for i, d in enumerate(date_objs) if not pd.isna(d)]

date_cols = [date_cols[i] for i in valid_date_indices]
date_objs = [date_objs[i] for i in valid_date_indices]

print("2. Converting to NumPy matrix...")
cons_matrix = df[date_cols].apply(pd.to_numeric, errors='coerce').values
flags = df['FLAG'].values
cons_nos = df['CONS_NO'].values

dates = pd.Series(date_objs)
train_idx = np.where((dates >= '2014-01-01') & (dates <= '2016-05-27'))[0]
test_idx = np.where((dates >= '2016-05-28') & (dates <= '2016-10-31'))[0]

def extract_model2_features(sub_matrix):
    n_days = sub_matrix.shape[1]
    
    is_missing = np.isnan(sub_matrix)
    is_zero = (sub_matrix == 0) & (~is_missing)
    clean_mat = np.nan_to_num(sub_matrix, nan=0.0)
    
    mean = np.nanmean(sub_matrix, axis=1)
    std = np.nanstd(sub_matrix, axis=1)
    missing_rate = np.mean(is_missing, axis=1)
    
    w60 = min(60, n_days)
    expected = np.zeros_like(clean_mat)
    for t in range(n_days):
        st = max(0, t - w60 + 1)
        expected[:, t] = np.mean(clean_mat[:, st:t+1], axis=1)
        
    gap = clean_mat - expected
    neg_residuals = np.where(gap < 0, np.abs(gap), 0)
    
    is_pos = gap > 0
    cusum = np.zeros_like(neg_residuals)
    for t in range(1, n_days):
        cusum[:, t] = np.where(is_pos[:, t], 0, cusum[:, t-1] + neg_residuals[:, t])
        
    cusum_score = np.max(cusum, axis=1)
    total_deficit = np.sum(neg_residuals, axis=1)
    residual_std = np.std(neg_residuals, axis=1)
    
    mean_neg = np.mean(neg_residuals, axis=1)[:, np.newaxis]
    std_neg = np.std(neg_residuals, axis=1)[:, np.newaxis]
    large_deficit_ratio = np.mean(neg_residuals > (mean_neg + std_neg), axis=1)
    
    recent_len = min(30, n_days)
    recent_mat = clean_mat[:, -recent_len:]
    recent_mean = np.mean(recent_mat, axis=1)
    recent_std = np.std(recent_mat, axis=1)
    
    daily_peer_median = np.nanmedian(sub_matrix, axis=0)
    peer_dev = sub_matrix - daily_peer_median
    peer_dev_mean = np.nanmean(peer_dev, axis=1)
    
    acct_cv = np.where(mean > 0, std / (mean + 1e-5), 0)
    recent_mean_shift = recent_mean - mean
    
    feat_df = pd.DataFrame({
        'valid_reading_days': np.sum(~is_missing, axis=1),
        'missing_rate': missing_rate,
        'consumption_mean': mean,
        'consumption_std': std,
        'peer_dev_mean': peer_dev_mean,
        'total_deficit': total_deficit,
        'cusum_score': cusum_score,
        'residual_std': residual_std,
        'large_deficit_ratio': large_deficit_ratio,
        'recent_mean': recent_mean,
        'recent_std': recent_std,
        'acct_cv': acct_cv,
        'recent_mean_shift': recent_mean_shift
    })
    
    return feat_df

print("3. Extracting exact Model 2 feature sets...")
X_train = extract_model2_features(cons_matrix[:, train_idx])
X_test = extract_model2_features(cons_matrix[:, test_idx])

for X_df in [X_train, X_test]:
    X_df['CONS_NO'] = cons_nos
    X_df['FLAG'] = flags

print("4. Training Isolation Forest...")
feature_cols = [c for c in X_train.columns if c not in ['CONS_NO', 'FLAG']]

for df_sub in [X_train, X_test]:
    df_sub[feature_cols] = df_sub[feature_cols].replace([np.inf, -np.inf], np.nan).fillna(0)

iso = IsolationForest(n_estimators=100, random_state=42, n_jobs=-1)
iso.fit(X_train[feature_cols])

X_train['anomaly_score'] = -iso.score_samples(X_train[feature_cols])
X_test['anomaly_score'] = -iso.score_samples(X_test[feature_cols])

feature_cols.append('anomaly_score')

print("5. Training LightGBM Model with 450 boosting rounds on full train data...")
train_dataset = lgb.Dataset(X_train[feature_cols], label=X_train['FLAG'])

params = {
    'objective': 'binary',
    'metric': 'binary_logloss',
    'boosting_type': 'gbdt',
    'learning_rate': 0.015,
    'num_leaves': 31,
    'feature_fraction': 0.8,
    'verbose': -1
}

model = lgb.train(
    params,
    train_dataset,
    num_boost_round=450
)

print("\n6. Evaluating on Test Set...")
preds = model.predict(X_test[feature_cols])
X_test['risk_score'] = preds

# Rank ordering
X_test = X_test.sort_values(by=['risk_score', 'CONS_NO'], ascending=[False, True])
X_test['rank'] = X_test['risk_score'].rank(method='first', ascending=False).astype(int)

test_labels = X_test['FLAG']
precision, recall, _ = precision_recall_curve(test_labels, X_test['risk_score'])
test_pr_auc = auc(recall, precision)
test_roc_auc = roc_auc_score(test_labels, X_test['risk_score'])

print("\n==========================================")
print(f"=== MODEL 4 (O3) TEST RESULT SUMMARY ===")
print(f"=== TEST AUC-PR:  {test_pr_auc:.4f} ===")
print(f"=== TEST ROC-AUC: {test_roc_auc:.4f} ===")
print("==========================================")

for k in [50, 100, 200, 500]:
    top_k = X_test.head(k)
    prec_k = top_k['FLAG'].mean()
    print(f"Precision@{k}: {prec_k:.4f} ({int(top_k['FLAG'].sum())}/{k} confirmed theft)")

print("\n7. Saving final outputs to outputs/o2...")
os.makedirs('outputs/o2', exist_ok=True)

X_test[['CONS_NO', 'risk_score', 'rank']].to_csv('outputs/o2/final_predictions.csv', index=False)
X_test.to_csv('outputs/o2/investigation_features.csv', index=False)

# PR Curve Plot
plt.figure(figsize=(8,6))
plt.plot(recall, precision, color='#ff9900', lw=2, label=f'Model 4 AUC-PR = {test_pr_auc:.4f}')
plt.xlabel('Recall')
plt.ylabel('Precision')
plt.title(f'Model 4 Precision-Recall Curve (AUC-PR = {test_pr_auc:.4f})')
plt.grid(True, alpha=0.3)
plt.legend()
plt.savefig('outputs/o2/pr_curve.png', bbox_inches='tight')

# SHAP Summary Plot
explainer = shap.TreeExplainer(model)
shap_values = explainer.shap_values(X_test[feature_cols])
plt.figure()
if isinstance(shap_values, list):
    shap.summary_plot(shap_values[1], X_test[feature_cols], show=False)
else:
    shap.summary_plot(shap_values, X_test[feature_cols], show=False)
plt.savefig('outputs/o2/shap_summary.png', bbox_inches='tight')

elapsed = time.time() - start_t
print(f"\n=== MODEL 4 (O3) TRAINING COMPLETE IN {elapsed:.2f} SECONDS ===")
