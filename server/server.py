from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "outputs", "o2")

try:
    df_features = pd.read_csv(os.path.join(DATA_DIR, "investigation_features.csv"))
    # ensure string types for IDs if necessary
    df_features['CONS_NO'] = df_features['CONS_NO'].astype(str)
except Exception as e:
    print(f"Error loading data: {e}")
    df_features = pd.DataFrame()

@app.get("/api/accounts")
def get_accounts(risk_min: float = 0.0, limit: int = 100):
    if df_features.empty:
        return []
    
    filtered = df_features[df_features["risk_score"] >= risk_min].copy()
    filtered = filtered.sort_values(by="risk_score", ascending=False).head(limit)
    filtered = filtered.replace({np.nan: None})
    return filtered.to_dict(orient="records")

@app.get("/api/accounts/{account_id}")
def get_account_details(account_id: str):
    if df_features.empty:
        raise HTTPException(status_code=404, detail="Data not available")
        
    account = df_features[df_features["CONS_NO"] == account_id]
            
    if account.empty:
        raise HTTPException(status_code=404, detail="Account not found")
        
    account = account.replace({np.nan: None})
    return account.to_dict(orient="records")[0]

@app.get("/api/accounts/{account_id}/timeline")
def get_account_timeline(account_id: str):
    # Mocking timeline generation based on account's features if raw data isn't easily accessible
    if df_features.empty:
        raise HTTPException(status_code=404, detail="Data not available")
        
    account = df_features[df_features["CONS_NO"] == account_id]
    if account.empty:
        raise HTTPException(status_code=404, detail="Account not found")
    
    acc_data = account.iloc[0]
    
    # We will generate a mocked 90-day timeline that visually represents the features:
    # 45 days before change point, 45 days after.
    
    try:
        baseline = float(acc_data.get('baseline_mean_90d', 10.0))
        drop_mag = float(acc_data.get('recent_mean_shift', -0.2))
        post_mean = baseline * (1 + drop_mag)
    except:
        baseline = 10.0
        post_mean = 5.0
        
    timeline = []
    import datetime
    
    # Try to parse change point date, default to 45 days ago
    end_date = datetime.date(2026, 1, 1) # Arbitrary latest date
    
    for i in range(90):
        current_date = end_date - datetime.timedelta(days=90-i)
        is_post_change = i >= 45
        
        expected = baseline
        if is_post_change:
            actual = np.random.normal(post_mean, post_mean * 0.1)
        else:
            actual = np.random.normal(baseline, baseline * 0.1)
            
        actual = max(0, actual)
        
        timeline.append({
            "date": current_date.isoformat(),
            "actual": round(actual, 2),
            "expected": round(expected, 2),
            "residual": round(actual - expected, 2)
        })
        
    return timeline
