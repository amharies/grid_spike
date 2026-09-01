# Feature Build Plan

Companion to `idea.md` (why) and `design.md` (look). This is what actually gets built, in priority order. Each feature is tagged **Must** (doc-required or demo-critical), **Should** (differentiator, build if on schedule), or **Stretch** (only if time remains).

## Phase 1 — Data pipeline

| Feature | Priority | Notes |
|---|---|---|
| Load & reshape SGCC data (wide → tidy) | Must | Extract the 3-part zip, parse dates, one row per (consumer, day) |
| Missing-value handling, explicitly stated | Must | Forward-fill or interpolate within account history; also emit a `was_missing` flag per reading, don't just erase gaps — the doc calls this out directly |
| Temporal train/test split | Must | Sort by date, earlier days train, later days test. Write down the exact cutoff date and the leakage argument before you need to say it out loud |
| Class imbalance handling, stated & defended | Must | Class-weighted loss in the model config + resampling comparison (with/without SMOTE), pick based on AUC-PR, not accuracy |
| Rolling stats features (7-day, 30-day mean/std) | Must | Minimum bar for "engineered feature beyond raw values" |
| Weekly aggregates / day-of-week structure | Must | Second required-tier feature, cheap to add alongside rolling stats |
| Peer-cluster assignment | Should | k-means or similarity clustering on normalized consumption profiles — this powers both the ML feature and the dashboard grid layout, build it early since two things depend on it |
| Peer-comparison feature (deviation from cluster avg) | Should | Depends on peer-cluster assignment above |
| Anomaly score feature (Isolation Forest or autoencoder) | Should | Train unsupervised on consumption series, feed score in as an extra model input |

## Phase 2 — Model

| Feature | Priority | Notes |
|---|---|---|
| Baseline classifier (LightGBM/XGBoost) trained on raw + rolling + weekly features | Must | Get this working before adding the differentiator features, so you always have a fallback that runs |
| Per-account confidence score output (not hard label) | Must | Explicit doc requirement |
| Ranked list generation (sorted by confidence) | Must | Feeds directly into both the list view and the grid's side panel |
| Full model retrain with peer-comparison + anomaly features added | Should | This is the "real" model, compare its AUC-PR against the baseline so you have a before/after story |
| AUC-PR + AUC-ROC evaluation on temporal test split | Must | AUC-PR is the headline number, ROC-AUC is secondary context |
| Threshold selection for "flagged" cutoff, justified | Must | e.g. top-N accounts an investigation team could realistically act on |
| SHAP values per prediction | Should | Powers the detail view's explanation panel |

## Phase 3 — Dashboard

| Feature | Priority | Notes |
|---|---|---|
| List view (sortable/filterable table) | Must | Fastest to build, also your safety net if the grid view runs out of time — this alone satisfies the "ranked list" requirement |
| Grid view — static layout, no tilt/animation yet | Should | House icons positioned by peer cluster, colored by risk, get this rendering with real data before adding visual polish |
| Grid view — perspective tilt + styling pass | Should | Apply the tactical-map look from `design.md` once the layout works functionally |
| Detail view — consumption time-series chart | Must | Core of "why was this flagged," build this before the SHAP panel |
| Detail view — SHAP explanation panel | Should | Depends on SHAP values existing from Phase 2 |
| Detail view — peer comparison strip | Should | Depends on peer-cluster assignment |
| Grid → detail click transition (zoom/perspective animation) | Stretch | Purely visual polish, do this last, list-view click-through works as a fallback path to the same detail view |
| Missing-data visual markers on the time-series chart | Should | Reinforces that missingness was handled deliberately, not hidden |
| Legend / color key | Should | Small but matters for judges parsing the grid without narration |

## Phase 4 — Demo readiness

| Feature | Priority | Notes |
|---|---|---|
| Rehearsed explanation: why temporal split, why AUC-PR, why this imbalance approach | Must | These are the questions most likely to get asked live |
| Rehearsed explanation: why peer-comparison and anomaly-blend features, what they add over the baseline | Should | Your actual differentiation story — know the before/after AUC-PR numbers cold |
| At least one clean run-through of the full flow: grid → click → detail → back | Must | Test this end to end before the demo, not during it |
| Fallback plan if the grid view isn't finished in time | Must | List view alone still satisfies every doc requirement — decide in advance that this is an acceptable fallback so nobody panics late in the clock |

## Suggested build order (rough time-of-day)

1. **Data pipeline (Must items)** — get raw features, split, and imbalance handling working first. Nothing else can start without this.
2. **Baseline model + evaluation** — get a number on the board early, even a mediocre one, so you're never starting from zero.
3. **Peer clustering** — do this next since both the model differentiator and the grid layout depend on it.
4. **List view + detail view (Must items)** — this is your safety-net demo path, get it functional before touching the grid.
5. **Full model retrain with differentiator features** — swap into the pipeline once clustering and anomaly score exist.
6. **Grid view + visual polish + transitions** — only after everything above is working end to end.
7. **Demo rehearsal** — leave real time for this, not five minutes before judging.
