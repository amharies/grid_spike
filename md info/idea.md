# Electricity Theft Detection — Whole Idea

## Problem statement (AI-02)

Given years of daily household electricity consumption, flag customers whose usage pattern suggests meter tampering or theft. Confirmed theft is a small fraction of accounts, and roughly a quarter of daily readings are missing. A model that predicts "no theft" everywhere scores well and is worthless — that's the trap the problem is built around.

**Non-negotiables from the doc:**
- Per-account confidence score, not just a hard label, plus a ranked list of most suspicious accounts
- AUC-PR as the reported metric, plain accuracy is a non-answer
- Temporal train/test split (earlier days train, later days test), with a defensible explanation of why a random split leaks information here
- Missing readings explicitly handled, not silently dropped
- At least one engineered feature beyond raw daily values
- A stated and defended approach to class imbalance

## The core idea

Don't build a notebook that prints an AUC-PR score. Build something that looks and works like a tool a utility company's fraud investigation team would actually use: a live dashboard where a ranked list of suspicious accounts can be drilled into, each one showing its consumption history, why it was flagged, and how it compares to accounts like it.

The model is intentionally kept simple and defensible (gradient boosting, not deep learning) — the differentiation budget goes into three things most basic entries skip:

1. **Peer-group comparison features** — most public solutions to this exact problem only engineer features off a single meter's own history (rolling mean, std, week-over-week change). Comparing a household against similar households is rarer and more clinically/operationally meaningful: theft often shows up as "unusually low relative to peers with a similar profile," not just "unusually low relative to its own past."
2. **An unsupervised anomaly score blended in** — labeled theft cases are scarce and biased toward what's already been caught. Adding an Isolation Forest (or simple autoencoder reconstruction error) as an extra input feature gives the model a signal that isn't purely "what past confirmed theft looked like."
3. **An investigative dashboard, not a metric** — the doc explicitly wants a ranked, explorable list of suspicious accounts. A real interface with drill-down and visual explanation is rare in this space; most existing work (published papers, Kaggle notebooks) stops at a table of numbers.

## Dataset

SGCC (State Grid Corporation of China) Electricity Theft Detection dataset, via [henryRDlab/ElectricityTheftDetection](https://github.com/henryRDlab/ElectricityTheftDetection).

- ~42,372 consumers, daily consumption over ~1,035 days (Jan 2014 – Oct 2016)
- Columns: `CONS_NO` (consumer ID), one column per date (daily kWh), `FLAG` (0 = no theft, 1 = theft)
- No geographic/location data — any spatial or map-style visualization must be built on a derived grouping (e.g. peer cluster), never fabricated GPS/coordinates
- Known issues: missing values, ~25% missing readings per the problem doc, some date-format cleanup needed

## Pipeline, end to end

### 1. Ingest & clean
- Load and reshape from wide (one column per date) to long/tidy format for easier feature engineering
- Explicitly flag missing readings as a feature (missingness itself can be informative — a meter with lots of gaps is a signal, not noise to erase)
- Handle missing values with a defensible method (e.g. forward-fill within a household's own recent history, or interpolation) — the imputation choice must be stated and justified, since the doc calls this out directly

### 2. Temporal split
- Sort by date, train on the earlier portion of the timeline, test on the later portion
- Be ready to explain live: a random split lets the model see future consumption patterns during training that it wouldn't have access to in a real deployed system, and theft patterns can drift over time, so a random split overstates real-world performance

### 3. Feature engineering
- **Own-history features**: rolling mean/std (7-day, 30-day), week-over-week change, day-of-week structure, weekly aggregates
- **Peer-comparison features (differentiator)**: cluster accounts by consumption profile similarity (e.g. k-means or simple similarity on normalized usage patterns) to form proxy "peer groups," then compute each account's deviation from its peer group's average/median usage
- **Anomaly score feature (differentiator)**: train an unsupervised Isolation Forest (or lightweight autoencoder) on the consumption time series, use its anomaly score as an additional input feature to the main classifier

### 4. Class imbalance
- State the real imbalance ratio up front
- Approach: combination of class-weighted loss (native to XGBoost/LightGBM) plus a resampling method (SMOTE or similar) evaluated against the imbalance-aware metric, not accuracy
- Be ready to defend why resampling alone isn't enough and why AUC-PR (not ROC-AUC or accuracy) is the metric that actually reflects performance here

### 5. Model
- Primary model: LightGBM or XGBoost (gradient boosting) — fast to train, handles tabular data well, has native class-weighting support, keeps risk low compared to a from-scratch deep model
- Inputs: own-history features + peer-comparison features + anomaly score feature
- Output: per-account probability/confidence score (not a hard label)

### 6. Explainability
- SHAP values per prediction — for any flagged account, show which features drove the flag
- This feeds directly into the dashboard's drill-down view, and answers the "why was this flagged" question judges will ask

### 7. Evaluation
- AUC-PR as the headline metric (plus AUC-ROC as a secondary reference)
- Precision/recall at a chosen operating threshold, with the threshold choice justified (e.g. top-N accounts an investigation team could realistically follow up on)

## Product concept — the dashboard

Reference look: a tactical top-down grid/map interface (dark background, glowing markers, grid overlay) — not a literal geographic map, since the dataset has no location data. Instead, grid position encodes peer-group clustering.

- **Main view**: 2D grid of house icons, one per consumer, tilted with a CSS perspective transform for a tactical-map feel. Position = peer-cluster group (accounts in the same cluster sit near each other). Color/size = risk score.
- **Click a house → "3D POV" drill-in**: a zoom/perspective transition into that cell, landing on a detail panel for that account.
- **Detail panel**: consumption time-series chart with anomaly points highlighted, SHAP explanation of the flag, confidence score, and how it compares to its peer group's average.
- **Ranked list view**: sortable/filterable table of most suspicious accounts as an alternate, faster way to scan results (for judges who want the numbers, not just the visual).

## Why this is built with Antigravity, not a notebook

- Antigravity handles the frontend scaffolding fast: the grid layout, the click-to-drill-in transition, the chart and SHAP panel, the ranked table — all UI work that would otherwise eat the day
- The model pipeline (cleaning, feature engineering, training, SHAP) stays in Python, kept simple and boring on purpose so it's fast to build and easy to defend
- The differentiation is concentrated in the product experience and the two extra engineered signals (peer comparison, anomaly blend), not in a fragile, novel model architecture that risks not working by demo time

## What this avoids

- No deep learning (LSTM/GRU/CNN) — common in published papers on this exact problem, but higher risk and harder to get right in a single day for uncertain payoff
- No fake geographic data — Cesium/Leaflet-style real maps were considered and dropped, since the dataset has no location field and fabricating coordinates would be an honesty risk in front of judges
- No "trained a classifier, printed a number" submission — the doc explicitly asks for a ranked, explorable output, and that's where most existing solutions to this exact dataset stop short
