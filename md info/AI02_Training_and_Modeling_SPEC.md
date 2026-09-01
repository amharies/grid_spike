# AI 02 — ELECTRICITY THEFT DETECTION
# TRAINING + MODELING SPECIFICATION
## Version: Build 1.0
## Purpose: Give Antigravity a precise implementation plan for the ML training pipeline

---

# 0. IMPORTANT: WHAT THIS FILE COVERS

This file is ONLY for:

- data loading for training
- dataset inspection
- temporal train/test construction
- missing-data-safe preprocessing
- feature input contract
- expected-consumption model
- residual generation
- change/persistence signals needed by modeling
- final theft classifier
- class imbalance
- validation
- AUC-PR
- Precision@K
- model saving
- inference pipeline
- GPU/CPU configuration
- reproducibility
- leakage prevention

Do NOT build the UI in this task.

Do NOT build the LLM/reporting layer in this task.

Do NOT spend time on presentation.

Do NOT start with an LSTM.

The goal is a reliable end-to-end ML pipeline first.

---

# 1. PROJECT OBJECTIVE

We are building an electricity-theft screening model from several years of daily household electricity consumption.

The system must ultimately produce:

```text
account_id
risk_score
rank
```

where:

```text
risk_score = model confidence/risk score for possible theft
rank       = descending order of risk_score
```

The score is an investigation-priority score.

It is NOT proof that an account committed theft.

---

# 2. COMPETITION REQUIREMENTS THAT THIS TRAINING PIPELINE MUST SATISFY

The competition requires all of the following.

## 2.1 Confidence score

The model must output a continuous score for every account.

Do not output only:

```text
0
1
```

Instead output something such as:

```text
0.013
0.081
0.744
0.932
```

The exact numerical interpretation depends on model calibration, but for ranking purposes:

```text
higher = more suspicious
```

---

## 2.2 Ranked suspicious-account list

Sort predictions:

```text
risk_score DESC
```

and assign:

```text
rank = 1, 2, 3, ...
```

---

## 2.3 Primary metric: AUC-PR

The main metric is:

```text
AUC-PR
```

Also known as:

```text
Area Under the Precision-Recall Curve
```

Do NOT use plain accuracy as the main metric.

---

## 2.4 Temporal train/test split

The main evaluation must be temporal.

Earlier dates:

```text
TRAIN
```

Later dates:

```text
TEST
```

Do NOT randomly shuffle dates into train and test for the main result.

---

## 2.5 Missing readings

Missing readings must be explicitly handled.

Never simply:

```python
dropna()
```

and pretend the missing data never existed.

Preserve:

```text
is_missing
```

and create missingness-related features.

---

## 2.6 Engineered features

The final system must use features beyond raw daily consumption.

Examples:

```text
lags
rolling statistics
trends
weekday/weekend structure
forecast residuals
energy gap
persistence
change point
cumulative deficit
missingness pattern
weather context
```

---

## 2.7 Class imbalance

The theft class is rare.

Use:

```text
class weighting
```

as the primary imbalance strategy.

---

# 3. DATA PROVIDED

The current provided material includes a large electricity-consumption CSV/header and multipart archive files.

The visible CSV header has the structure:

```text
CONS_NO
FLAG
date columns...
```

The supplied header visibly contains:

```text
CONS_NO
FLAG
05-09-2014
06-09-2014
...
```

The exact complete set of date columns must be discovered programmatically from the actual data.

DO NOT hard-code the number of date columns.

DO NOT assume the date range without inspecting the actual file.

---

# 4. IMPORTANT DATA REPRESENTATION

The raw dataset appears to be in a wide format.

Conceptually:

```text
CONS_NO | FLAG | date1 | date2 | date3 | ...
```

Example:

```text
CONS_NO | FLAG | 05-09-2014 | 06-09-2014 | 07-09-2014 | ...
```

This means:

```text
CONS_NO = customer/account identifier

FLAG = theft label

date columns = daily consumption values
```

The implementation must first inspect the actual CSV and confirm this structure.

---

# 5. FIRST TASK FOR ANTIGRAVITY: DATA DISCOVERY

Before training anything, create:

```text
scripts/01_inspect_data.py
```

The script must report:

```text
file path
file size
number of rows
number of columns
column names
first 5 rows
last 5 rows
data types
number of accounts
number of date columns
first date
last date
FLAG unique values
FLAG counts
missing value count
missing percentage
```

Also detect:

```text
duplicate CONS_NO
duplicate rows
negative consumption values
non-numeric consumption values
unexpected date columns
```

Do not modify the raw data during this stage.

Save the report:

```text
artifacts/data_inspection.json
```

and optionally:

```text
artifacts/data_inspection.txt
```

---

# 6. RAW DATA MUST NEVER BE OVERWRITTEN

Create a structure like:

```text
project/
│
├── data/
│   ├── raw/
│   ├── processed/
│   └── external/
│
├── scripts/
│
├── src/
│
├── models/
│
├── artifacts/
│
├── predictions/
│
└── configs/
```

Keep original data in:

```text
data/raw/
```

Never modify the original dataset in-place.

---

# 7. MULTIPART ARCHIVE HANDLING

The uploaded files include:

```text
data(1).z01
data(1).z02
```

These are identified as parts of a multipart ZIP archive.

Antigravity should first determine whether there is a corresponding final `.zip`/archive part already present in the project directory.

Do not assume the archive is complete until the directory is inspected.

If the multipart archive is complete, extract it using an archive tool that understands multipart ZIP files.

Do not manually concatenate files unless the archive format specifically requires it.

After extraction:

```text
data/raw/
```

should contain the actual dataset files.

The training pipeline must operate on the extracted dataset, not on the `.z01`/`.z02` parts directly.

---

# 8. DATA LOADING

For a CSV of this size, use:

```python
pandas.read_csv(...)
```

unless the actual file proves too large for available RAM.

The reported dataset is approximately 43k rows, so the main concern is the wide daily columns rather than row count.

Use:

```python
low_memory=False
```

where appropriate.

Avoid loading unnecessary duplicate copies of the entire dataframe into memory.

---

# 9. WIDE-TO-LONG CONVERSION

The raw structure is expected to be:

```text
CONS_NO
FLAG
date1
date2
...
```

For time-series modeling, convert to:

```text
CONS_NO
FLAG
date
consumption
```

Example:

```text
CONS_NO | FLAG | date       | consumption
--------|------|------------|------------
A001    | 0    | 2014-09-05 | 12.4
A001    | 0    | 2014-09-06 | 13.1
A001    | 0    | 2014-09-07 | NaN
```

Use a memory-conscious conversion.

Do not create multiple unnecessary full-size copies.

---

# 10. DATE PARSING

The supplied header shows dates in:

```text
DD-MM-YYYY
```

style.

Example:

```text
05-09-2014
```

This must be parsed explicitly rather than relying on ambiguous automatic parsing.

Use the actual header to determine date columns.

Recommended conceptual operation:

```python
pd.to_datetime(date_columns, dayfirst=True, errors="coerce")
```

Validate:

```text
no unexpected NaT values
dates sorted correctly
date columns are genuinely chronological
```

---

# 11. ACCOUNT IDENTIFIER

Use:

```text
CONS_NO
```

as the account/customer identifier unless inspection proves another identifier is more appropriate.

Never use:

```text
CONS_NO
```

as a numeric predictive feature simply because it looks numeric.

It is an identifier.

---

# 12. LABEL

Use:

```text
FLAG
```

as the supervised target if the inspection confirms:

```text
0 = non-theft
1 = theft
```

Do not assume label semantics blindly.

Print the unique values and class counts.

If the actual dataset uses another encoding, normalize it explicitly and document the mapping.

---

# 13. LABEL GRANULARITY

This is critical.

The current header indicates:

```text
FLAG
```

is alongside:

```text
CONS_NO
```

which strongly suggests an account-level label.

However, the implementation must confirm:

```text
one FLAG per CONS_NO
```

Run:

```python
df.groupby("CONS_NO")["FLAG"].nunique()
```

Expected:

```text
1
```

for every account.

If an account has multiple labels, STOP and inspect the dataset before building the final account-level classifier.

Do not silently choose one label.

---

# 14. MAIN MODELING CONCEPT

We will use a two-stage ML system.

## Stage A

Learn:

```text
expected electricity consumption
```

from historical behaviour and legitimate contextual variables.

## Stage B

Use:

```text
expected vs actual behaviour
+
change/persistence signals
+
missingness
+
history
+
weather/context if available
```

to classify:

```text
FLAG
```

---

# 15. WHY TWO STAGES?

A generic classifier asks:

```text
Does this account look like theft?
```

Our system asks:

```text
What should this account normally consume?
```

then:

```text
How far is actual behaviour from that expectation?
```

then:

```text
Did that difference persist?
```

then:

```text
When did the change begin?
```

and finally:

```text
Does the overall evidence match confirmed theft cases?
```

This is the core differentiation.

---

# 16. STAGE A: EXPECTED-CONSUMPTION MODEL

The expected-consumption model predicts a customer's normal consumption.

Start with a tabular model.

Recommended order:

```text
1. LightGBM regression
2. XGBoost regression
3. Ridge regression baseline
```

Do NOT start with LSTM.

---

# 17. WHY NOT LSTM FIRST?

The project is time-constrained.

An LSTM introduces:

```text
sequence preparation
padding/windowing
GPU training complexity
more hyperparameters
more failure modes
```

A gradient-boosted model with:

```text
lags
rolling features
calendar
weather
```

can already capture a large amount of useful structure.

If the core model is working and there is extra time, an LSTM can be tested as a stretch experiment.

It must not be a dependency of the final pipeline.

---

# 18. STAGE A TARGET

Start with:

```text
next-day consumption
```

For date:

```text
D
```

predict:

```text
D + 1
```

using information available at or before:

```text
D
```

---

# 19. STAGE A INPUTS

Use historical information such as:

```text
lag_1d
lag_7d
lag_14d
lag_30d

rolling_mean_7d
rolling_mean_30d
rolling_std_7d
rolling_std_30d

trend
weekday
weekend
month
season

weather variables
```

only when those variables are actually available.

---

# 20. STRICT FORECASTING RULE

For a target date:

```text
T
```

every feature must be based only on information available before or at the appropriate forecasting cutoff.

Never use:

```text
T+1
T+2
...
```

to construct features for predicting:

```text
T+1
```

---

# 21. LAG FEATURES

For each account:

```text
lag_1d
lag_7d
lag_14d
lag_30d
```

Example:

```text
date       consumption
Jan 10     12
Jan 11     13
Jan 12     11
```

For Jan 12:

```text
lag_1d = Jan 11 consumption = 13
```

---

# 22. ROLLING FEATURES

Examples:

```text
rolling_mean_7d
rolling_mean_30d
rolling_std_7d
rolling_std_30d
```

These must be backward-looking.

Correct:

```text
rolling_mean_7d(T)
=
mean(T-6 ... T)
```

when constructing a feature available at T.

For a next-day prediction:

```text
rolling feature at T
→ predict T+1
```

Do not include T+1 in the rolling window.

---

# 23. SHIFT BEFORE ROLLING

For maximum leakage safety, when generating features for target day T:

```python
history = consumption.shift(1)
```

then calculate rolling values.

Conceptually:

```text
shift
  ↓
rolling
  ↓
feature
```

This prevents the target day's actual consumption from entering its own predictive features if that would violate the intended decision time.

---

# 24. CALENDAR FEATURES

Generate:

```text
day_of_week
is_weekend
month
season
```

where appropriate.

These features allow the model to learn legitimate patterns such as:

```text
weekday vs weekend
summer vs winter
monthly usage cycles
```

---

# 25. SEASONALITY

Seasonality is NOT a reason to abandon temporal splitting.

The model should learn seasonality.

Use:

```text
calendar
+
weather
+
historical consumption
```

to model normal seasonal changes.

The temporal split only prevents future observations from entering training.

---

# 26. WEATHER

If weather data is available and can be legitimately aligned with the meter data:

use it.

Possible variables:

```text
temperature
rainfall
humidity
extreme-temperature indicators
```

Only use variables actually present/available.

Do not invent weather fields.

---

# 27. WEATHER'S ROLE

Weather should help answer:

```text
Was the consumption change expected given the environment?
```

Example:

```text
Very hot weather
+
higher consumption
=
possibly normal
```

versus:

```text
similar weather
+
large unexpected consumption drop
=
more unexplained
```

The expected-consumption model should incorporate weather so that its baseline is context-aware.

---

# 28. MISSING DATA

For every consumption observation create:

```text
is_missing
```

Definition:

```text
1 = original reading was missing
0 = original reading existed
```

Do this BEFORE imputation.

---

# 29. NEVER DESTROY MISSINGNESS INFORMATION

Bad:

```python
df["consumption"] = df["consumption"].interpolate()
```

and then forgetting that interpolation happened.

Good:

```text
original consumption
+
is_missing
+
imputed/model-ready consumption
```

The model can then distinguish:

```text
real reading
```

from:

```text
filled-in reading
```

---

# 30. IMPUTATION STRATEGY

Use a simple, defensible approach.

For short internal gaps:

```text
interpolation
```

may be used if appropriate.

For model training, another option is:

```text
rolling median
```

or another training-safe estimator.

The exact method should be selected after inspecting the actual missingness distribution.

Do NOT blindly forward-fill all missing electricity values.

---

# 31. MISSINGNESS FEATURES

Create:

```text
missing_rate_7d
missing_rate_30d
overall_missing_rate
missing_streak
longest_missing_streak
number_of_missing_streaks
missingness_change
```

These become final classifier inputs.

---

# 32. TEMPORAL TRAIN/TEST SPLIT

This must happen before any operation that could learn from the future.

Sort by date.

Choose an exact cutoff.

Example only:

```text
2014-09-05 → 2016-01-01
TRAIN

2016-01-02 → end
TEST
```

The actual cutoff MUST be calculated from the real dataset.

Do not copy this example date.

---

# 33. BETTER SPLIT RULE

If the dataset has several years of daily data, a reasonable first experiment is:

```text
70–80% earliest time → training
20–30% latest time → test
```

But the final percentage should be determined after inspecting:

```text
date range
label distribution over time
number of usable dates
```

Document the exact cutoff in:

```text
artifacts/split_config.json
```

---

# 34. DO NOT RANDOMLY SPLIT THE MAIN EVALUATION

Do NOT use:

```python
train_test_split(..., shuffle=True)
```

for the main competition result.

Why?

Because time-series observations are correlated.

Random splitting can place:

```text
future behaviour
```

inside training while:

```text
similar past behaviour
```

appears in test.

This can make the score look better than real deployment performance.

---

# 35. SEASONAL QUESTION

If a judge asks:

> "What if the test period contains a different season?"

Answer:

> "That is intentional. We want to know whether the model can generalize to future periods. Seasonality is handled through calendar, historical, and weather-aware features rather than by mixing future and past observations randomly."

---

# 36. VALIDATION DURING TRAINING

Do not tune hyperparameters on the final test period.

Use a temporal validation split inside the training period.

Conceptually:

```text
EARLY TRAIN
    ↓
TRAIN

LATER PART OF TRAIN
    ↓
VALIDATION

FINAL FUTURE PERIOD
    ↓
TEST
```

Example:

```text
70% earliest → train
15% next      → validation
15% latest    → test
```

Again, percentages are examples.

---

# 37. TIME-SERIES CROSS-VALIDATION

If time allows, use:

```text
expanding-window validation
```

Example:

```text
Fold 1:
TRAIN: early period
VAL:   next period

Fold 2:
TRAIN: early + validation period
VAL:   next period

Fold 3:
TRAIN: more history
VAL:   next period
```

Do not use random K-fold as the primary validation strategy.

---

# 38. STAGE A MODEL TRAINING

Create:

```text
src/models/expected_consumption.py
```

with functions conceptually:

```python
fit_expected_model(...)
predict_expected(...)
```

The model should accept:

```text
historical features
```

and target:

```text
next-day consumption
```

---

# 39. STAGE A BASELINE MODEL

Before using LightGBM/XGBoost, implement a trivial baseline:

```text
expected tomorrow =
same customer's recent rolling mean
```

For example:

```text
7-day rolling mean
```

Then compare:

```text
baseline forecasting error
```

against:

```text
gradient boosting forecasting error
```

This prevents building a complicated model without knowing whether it improves anything.

---

# 40. EXPECTED MODEL OUTPUT

For every valid prediction date:

```text
account_id
date
actual_consumption
expected_consumption
```

Example:

```text
A1842
2015-08-14
5.4
13.8
```

---

# 41. RESIDUAL

Calculate:

```text
residual =
actual - expected
```

Example:

```text
actual   = 5.4
expected = 13.8

residual = -8.4
```

Negative means:

```text
actual consumption is below expected
```

---

# 42. ENERGY GAP

For investigation-facing features:

```text
energy_gap =
expected - actual
```

Example:

```text
13.8 - 5.4 = 8.4 kWh
```

Only positive deficits should contribute to:

```text
cumulative deficit
```

using:

```text
max(expected - actual, 0)
```

---

# 43. GAP PERCENTAGE

Calculate:

```text
gap_percentage =
(expected - actual) / max(expected, epsilon)
```

Use a small epsilon to avoid division by zero.

Example:

```text
expected = 13.8
actual = 5.4

gap ≈ 0.609
≈ 61%
```

---

# 44. RESIDUAL FEATURES

Generate account-level statistics such as:

```text
residual_mean
residual_std
negative_residual_ratio
max_energy_gap
mean_energy_gap
mean_gap_percentage
```

These summarize how consistently the account deviates from its expected baseline.

---

# 45. PERSISTENCE

A suspicious deviation becomes more meaningful if it continues.

Generate:

```text
persistence_days
anomalous_days_30d
anomalous_days_60d
negative_residual_ratio
```

The threshold for an anomalous day must be based on residual behaviour.

Do not choose an arbitrary number and pretend it is scientifically established.

---

# 46. RESIDUAL THRESHOLD

A practical first method:

calculate residual distribution for each account or relevant training population.

Use a robust threshold such as:

```text
residual below a lower quantile
```

or:

```text
negative residual larger than k × historical residual scale
```

The exact threshold should be tuned only on the training/validation period.

Do not tune using the final test labels.

---

# 47. CUSUM

CUSUM can be used to detect sustained shifts.

Concept:

```text
small random errors
→ mostly cancel

repeated errors in the same direction
→ accumulate

large accumulated shift
→ candidate change point
```

For theft-oriented detection, we care particularly about:

```text
sustained negative residuals
```

because these represent actual consumption persistently below expectation.

---

# 48. CUSUM OUTPUT

At minimum generate:

```text
cusum_score
change_point_date
```

Potentially also:

```text
change_point_strength
```

Do not make CUSUM itself the final theft classifier.

It is a feature-generation/change-detection component.

---

# 49. CHANGE-POINT FEATURES

For the strongest candidate change:

```text
change_point_date
days_since_change
pre_change_mean
post_change_mean
pre_change_std
post_change_std
pre_post_difference
```

---

# 50. DROP MAGNITUDE

Calculate:

```text
drop_magnitude =
(pre_change_mean - post_change_mean)
/
max(pre_change_mean, epsilon)
```

Example:

```text
before = 14
after = 6

drop ≈ 57%
```

This measures:

```text
BEFORE vs AFTER
```

It is NOT the same as:

```text
expected vs actual gap
```

---

# 51. IMPORTANT: DROP VS GAP

Keep both.

## Drop magnitude

Answers:

> How much did the account change relative to its own previous behaviour?

Formula:

```text
(pre - post) / pre
```

## Gap percentage

Answers:

> How far below expected behaviour is the account now?

Formula:

```text
(expected - actual) / expected
```

These are different signals.

---

# 52. CUMULATIVE DEFICIT

For suspicious periods:

```text
deficit_day =
max(expected - actual, 0)
```

Then:

```text
cumulative_deficit =
sum(deficit_day)
```

This approximates the amount of consumption reduction relative to the model's expected baseline.

It is NOT a measurement of legally established stolen electricity.

---

# 53. WEATHER EXPLANATION

Create:

```text
weather_explanation_score
```

only if weather data exists.

The feature should represent:

```text
how plausibly weather explains the observed consumption change
```

Possible interpretation:

```text
low = weather does not strongly explain the change
high = weather provides a stronger explanation
```

Be consistent about direction.

For the classifier, it may be more convenient to use:

```text
weather_unexplained_score
```

where:

```text
higher = less weather explanation
```

If using that naming, document it clearly.

---

# 54. RECOMMENDED WEATHER FEATURE DESIGN

Keep it simple.

The expected model already contains weather.

Therefore:

```text
weather-aware expected consumption
```

already removes a lot of legitimate weather-driven variation.

The separate feature can capture whether:

```text
observed weather change
```

is consistent with:

```text
observed consumption change
```

Do not build an unnecessary second giant weather model.

---

# 55. MISSINGNESS AROUND CHANGE POINT

This is a particularly useful behavioural feature.

Calculate:

```text
missingness_before_change
missingness_after_change
missingness_change
```

Example:

```text
Before = 5%
After  = 32%

Change = +27 percentage points
```

This can support the investigation signal.

It must NOT be interpreted as direct proof of tampering.

---

# 56. OPTIONAL FEATURE: PEER DEVIATION

Peer deviation is a stretch feature.

Do NOT make the pipeline depend on it.

If implemented:

```text
group similar accounts
```

using non-label information such as:

```text
historical consumption scale
seasonal profile
other available legitimate characteristics
```

Then calculate:

```text
peer_mean
peer_median
peer_deviation
peer_percentile
```

The key idea:

```text
self baseline
+
peer baseline
```

can provide stronger evidence than either alone.

---

# 57. WHY PEER DEVIATION IS OPTIONAL

Peer clustering introduces questions:

```text
Who counts as a peer?
```

and:

```text
Which features define similarity?
```

If there is not enough time:

```text
SKIP IT.
```

The core system remains strong without it.

---

# 58. FINAL FEATURE GROUPS

The final classifier should be able to use four broad groups.

## Group A — Historical behaviour

```text
lag_1d
lag_7d
lag_14d
lag_30d
rolling_mean_7d
rolling_mean_30d
rolling_std_7d
rolling_std_30d
trend
volatility
weekday pattern
weekend pattern
```

## Group B — Missingness

```text
missing_rate
missing_rate_7d
missing_rate_30d
missing_streak
longest_missing_streak
missingness_change
missingness_around_change
```

## Group C — Forecast/change behaviour

```text
expected_consumption
residual
energy_gap
gap_percentage
residual_mean
residual_std
negative_residual_ratio
max_energy_gap
change_point_date or derived age
days_since_change
pre_change_mean
post_change_mean
drop_magnitude
persistence_days
cumulative_deficit
cusum_score
```

## Group D — Context

```text
temperature
rainfall
humidity
season
month
day_of_week
weather_explanation_score
```

Use only variables that exist and are legitimately available.

---

# 59. DATE FEATURES IN THE FINAL CLASSIFIER

Do not feed a raw date string into the classifier.

Instead derive useful quantities.

For example:

```text
month
day_of_week
season
days_since_change
```

For:

```text
change_point_date
```

prefer:

```text
days_since_change
```

because it is numeric and directly meaningful.

---

# 60. ACCOUNT SNAPSHOT DESIGN

Because the final label is expected to be account-level, the final classifier needs an account-level or valid time-snapshot representation.

Do not create a training row using future history.

Recommended conceptual design:

```text
ACCOUNT
+
information available up to cutoff
+
behavioural summary
→ FLAG
```

For the final test:

```text
ACCOUNT
+
information available up to test cutoff
→ risk score
```

The exact snapshot date must be aligned with the competition's evaluation setup.

If the competition explicitly evaluates labels at account level without a decision date, document the chosen cutoff and ensure it is identical for train/test logic.

---

# 61. CRITICAL: DO NOT LEAK THE FLAG

Never use:

```text
FLAG
```

to construct input features.

FLAG is the target.

It must only appear in:

```text
y_train
y_valid
y_test
```

and evaluation outputs.

---

# 62. FINAL CLASSIFIER

Recommended first choice:

```text
LightGBM Classifier
```

Second:

```text
XGBoost Classifier
```

Both are well suited to:

```text
tabular data
mixed feature scales
nonlinear interactions
missing values
feature importance
```

---

# 63. CLASS WEIGHTING

Because theft is rare:

```text
class_weight
```

must be used.

For binary labels:

```text
normal = 0
theft = 1
```

calculate training prevalence:

```text
n_negative
n_positive
```

A first weighting strategy:

```text
positive_weight ≈ n_negative / n_positive
```

or use the library's balanced-weight option.

Tune the weighting factor on temporal validation if necessary.

Do not tune it against the final test set.

---

# 64. WHY CLASS WEIGHTING?

Without weighting:

```text
theft = rare
normal = common
```

the optimizer may find it easier to focus on the majority class.

Class weighting says:

> Errors on the rare theft class matter more during training.

---

# 65. WHY NOT SMOTE FIRST?

SMOTE creates synthetic samples.

With temporal data this can become awkward because:

```text
time relationships
+
behaviour sequences
```

can be distorted.

Class weighting is:

```text
simpler
+
temporal-safe
+
easy to defend
```

for the first implementation.

---

# 66. FINAL CLASSIFIER TARGET

Use:

```text
FLAG
```

as:

```text
y
```

The model output should be:

```text
predict_proba(X)[:, 1]
```

or equivalent positive-class probability/risk score.

---

# 67. AUC-PR

Calculate:

```python
average_precision_score(y_true, y_score)
```

and also generate:

```text
precision-recall curve
```

The competition's primary metric is:

```text
AUC-PR
```

---

# 68. WHY AUC-PR?

Because theft is rare.

Suppose:

```text
99% normal
1% theft
```

A model predicting:

```text
normal
```

for everyone gets:

```text
99% accuracy
```

but detects no theft.

AUC-PR gives much more useful information about:

```text
precision
+
recall
```

on the rare positive class.

---

# 69. PRECISION@K

Also calculate:

```text
Precision@50
Precision@100
```

if the test set is large enough.

This answers:

> If investigators inspect only the top K accounts, how many are actually confirmed theft cases?

This is an excellent operational metric.

---

# 70. RANKING

After generating scores:

```python
predictions["rank"] =
predictions["risk_score"].rank(
    ascending=False,
    method="first"
)
```

or equivalent.

Final order:

```text
highest risk
↓
lowest risk
```

---

# 71. FINAL PREDICTION FILE

Save:

```text
predictions/final_predictions.csv
```

with at least:

```text
CONS_NO
risk_score
rank
```

Example:

```text
CONS_NO,risk_score,rank
A1842,0.9412,1
A7291,0.8931,2
A3812,0.8517,3
```

Do not include sensitive information unnecessarily.

---

# 72. MODEL ARTIFACTS

Save:

```text
models/expected_consumption_model.txt
models/theft_classifier.txt
```

or the native serialization format of the chosen library.

Also save:

```text
models/feature_columns.json
models/model_config.json
models/train_metadata.json
```

---

# 73. REPRODUCIBILITY

Set random seeds.

Use a central configuration:

```text
configs/train.yaml
```

or:

```text
configs/train.json
```

Store:

```text
random_seed
train cutoff
validation cutoff
test cutoff
model parameters
class weight
feature list
```

---

# 74. RECOMMENDED PROJECT FILE STRUCTURE

```text
project/
│
├── data/
│   ├── raw/
│   ├── processed/
│   └── external/
│
├── configs/
│   └── train.yaml
│
├── scripts/
│   ├── 01_inspect_data.py
│   ├── 02_prepare_data.py
│   ├── 03_build_forecast_features.py
│   ├── 04_train_expected_model.py
│   ├── 05_build_residual_features.py
│   ├── 06_build_change_features.py
│   ├── 07_train_classifier.py
│   ├── 08_evaluate.py
│   └── 09_generate_predictions.py
│
├── src/
│   ├── data/
│   ├── features/
│   ├── models/
│   ├── evaluation/
│   └── utils/
│
├── models/
│
├── artifacts/
│
└── predictions/
```

---

# 75. SCRIPT 01 — INSPECTION

Create:

```text
scripts/01_inspect_data.py
```

Responsibilities:

```text
find raw dataset
read header
identify date columns
inspect labels
inspect missingness
validate CONS_NO
write report
```

No model training.

---

# 76. SCRIPT 02 — PREPARE DATA

Create:

```text
scripts/02_prepare_data.py
```

Responsibilities:

```text
load raw CSV
identify date columns
convert wide → long
parse dates
create is_missing
validate values
save processed data
```

Do not perform label-aware transformations here.

---

# 77. SCRIPT 03 — FORECAST FEATURES

Create:

```text
scripts/03_build_forecast_features.py
```

Responsibilities:

```text
lags
rolling features
calendar features
weather merge if available
temporal-safe transformations
```

Important:

```text
shift before rolling where required
```

---

# 78. SCRIPT 04 — TRAIN EXPECTED MODEL

Create:

```text
scripts/04_train_expected_model.py
```

Responsibilities:

```text
load training period
fit expected-consumption model
evaluate against validation
save model
generate expected consumption
```

---

# 79. SCRIPT 05 — RESIDUAL FEATURES

Create:

```text
scripts/05_build_residual_features.py
```

Responsibilities:

```text
actual
expected
residual
energy gap
gap percentage
residual statistics
```

---

# 80. SCRIPT 06 — CHANGE FEATURES

Create:

```text
scripts/06_build_change_features.py
```

Responsibilities:

```text
persistence
CUSUM
change point
pre-change statistics
post-change statistics
drop magnitude
cumulative deficit
missingness around change
weather explanation if available
```

---

# 81. SCRIPT 07 — FINAL CLASSIFIER

Create:

```text
scripts/07_train_classifier.py
```

Responsibilities:

```text
load account-level features
split temporal snapshots
apply class weighting
train LightGBM/XGBoost
validate
save model
```

---

# 82. SCRIPT 08 — EVALUATION

Create:

```text
scripts/08_evaluate.py
```

Output:

```text
AUC-PR
Precision@50
Precision@100
classification report
precision-recall curve
score distribution
```

The main report must clearly identify:

```text
TEST AUC-PR
```

---

# 83. SCRIPT 09 — PREDICTIONS

Create:

```text
scripts/09_generate_predictions.py
```

Responsibilities:

```text
load trained models
load test features
generate risk score
rank accounts
save final_predictions.csv
```

---

# 84. END-TO-END COMMAND

After all scripts are stable, create:

```text
scripts/run_training_pipeline.py
```

It should run:

```text
01
 ↓
02
 ↓
03
 ↓
04
 ↓
05
 ↓
06
 ↓
07
 ↓
08
 ↓
09
```

The final command should be approximately:

```bash
python scripts/run_training_pipeline.py
```

---

# 85. TRAINING LOGGING

Every training run should print:

```text
===============================
ELECTRICITY THEFT MODEL
===============================

Dataset:
Rows:
Accounts:
Date range:

Train:
Validation:
Test:

Positive labels:
Negative labels:
Positive ratio:

Expected model:
Classifier:

Features:
Class weight:

AUC-PR:
Precision@50:
Precision@100:
```

---

# 86. TRAINING ARTIFACT LOG

Save:

```text
artifacts/training_run.json
```

containing:

```text
timestamp
dataset identifier
row count
account count
date range
split cutoffs
feature count
feature names
model type
hyperparameters
class weight
AUC-PR
Precision@50
Precision@100
random seed
```

---

# 87. BASELINE CLASSIFIER

Before the full behavioural model, build a baseline.

Baseline features:

```text
mean consumption
std consumption
missing rate
weekday/weekend difference
recent mean
recent trend
```

Train:

```text
LightGBM classifier
```

Evaluate:

```text
AUC-PR
```

Save:

```text
artifacts/baseline_metrics.json
```

This gives us a scientific comparison.

---

# 88. FULL MODEL

Then add:

```text
expected consumption
residual
energy gap
change point
drop magnitude
persistence
cumulative deficit
weather explanation
missingness-change features
CUSUM
```

Compare:

```text
baseline AUC-PR
vs
full model AUC-PR
```

---

# 89. ABLATION TESTS

If time allows, perform feature-group ablations.

Example:

```text
Model A:
baseline only

Model B:
baseline + residual

Model C:
baseline + residual + change features

Model D:
baseline + residual + change + weather

Model E:
full model
```

This tells us which part actually improves performance.

Do not claim novelty based only on feature count.

---

# 90. FEATURE IMPORTANCE

For the final classifier, calculate:

```text
gain importance
```

or:

```text
split importance
```

and preferably SHAP if there is enough time.

The purpose is:

```text
Which features drive the risk score?
```

---

# 91. SHAP

SHAP is optional but valuable for the final system.

If implemented:

```text
SHAP values
```

can explain why a specific account was ranked highly.

Example:

```text
Large energy gap        +0.21
High persistence        +0.17
Large drop magnitude    +0.14
Missingness change      +0.08
Weather explanation     -0.03
```

Do not overstate SHAP as causal explanation.

It is a model explanation technique.

---

# 92. MODEL EXPLANATION OUTPUT

For every top-ranked account, store:

```text
risk_score
top_features
change_point
gap_percentage
drop_magnitude
persistence_days
cumulative_deficit
weather_explanation_score
missingness_change
```

This will later be consumed by the UI/reporting layer.

---

# 93. RTX 4050 / RTX 5060 STRATEGY

The core model is tabular.

Therefore:

```text
GPU is useful
but not mandatory
```

Do not make GPU support a single point of failure.

The project must run correctly on CPU.

---

# 94. RECOMMENDED HARDWARE BEHAVIOUR

For RTX 4050:

```text
Prefer moderate model parameters
avoid unnecessarily large GPU memory requirements
use CPU fallback
```

For RTX 5060:

```text
GPU acceleration can be used
but do not increase complexity merely because more GPU exists
```

The dataset is not large enough to justify giant deep-learning models solely to "use the GPU."

---

# 95. LIGHTGBM GPU

If the installed LightGBM build supports GPU training, use it.

Otherwise:

```text
CPU LightGBM
```

is completely acceptable.

Do not waste hackathon time compiling a custom GPU build if CPU training already completes quickly.

---

# 96. XGBOOST GPU

If using XGBoost and CUDA is available, use:

```text
tree_method = hist
device = cuda
```

where supported by the installed XGBoost version.

If CUDA configuration fails:

```text
fallback to CPU
```

and continue.

---

# 97. GPU DETECTION

Create:

```text
src/utils/device.py
```

that detects:

```text
CUDA available?
GPU name?
GPU memory?
```

Log it.

Example:

```text
Device:
CUDA available: YES
GPU: NVIDIA ...
```

Do not hard-code:

```text
RTX 4050
```

or:

```text
RTX 5060
```

because the code should work on both systems.

---

# 98. PYTORCH

Do not introduce PyTorch unless an LSTM/stretch model is explicitly attempted.

The main system does not require PyTorch.

Recommended core stack:

```text
Python
pandas
numpy
scikit-learn
LightGBM or XGBoost
matplotlib
joblib
PyYAML
```

Optional:

```text
shap
ruptures
```

if needed.

---

# 99. CUSUM IMPLEMENTATION

CUSUM does not require GPU.

Implement it in NumPy/Pandas.

Do not build a neural network for change-point detection.

---

# 100. MEMORY MANAGEMENT

The raw data is wide.

Use:

```text
float32
```

where precision allows.

Avoid:

```text
float64
```

for every feature if unnecessary.

After generating features:

```python
del temporary_dataframe
```

and:

```python
gc.collect()
```

when appropriate.

---

# 101. LONG-FORM DATA SIZE

Converting:

```text
43k accounts × hundreds of dates
```

into long form can create millions of rows.

That is still manageable on a decent machine if handled carefully.

Do not repeatedly duplicate the long dataframe.

Prefer:

```text
read
→ transform
→ feature
→ save
→ release
```

rather than keeping every intermediate object in RAM.

---

# 102. PARQUET

For processed long-form data, prefer:

```text
Parquet
```

over repeatedly writing giant CSV files.

Example:

```text
data/processed/meter_long.parquet
```

This is faster and more storage-efficient.

CSV should remain available for interoperability if needed.

---

# 103. DATA TYPES

Recommended:

```text
CONS_NO → string/category where appropriate
FLAG → int8
date → datetime64
consumption → float32
is_missing → int8
```

Do not convert account IDs into arbitrary numeric magnitudes.

---

# 104. ZERO CONSUMPTION

Do not automatically classify:

```text
0 consumption
```

as theft.

Zero can mean:

```text
vacant household
measurement issue
missing/invalid reading
legitimate shutdown
```

Treat it as data to be analyzed.

---

# 105. NEGATIVE CONSUMPTION

Negative daily electricity consumption should be inspected.

Possible causes:

```text
data error
meter correction
special measurement semantics
```

Do not silently delete all negative values.

Report them first.

---

# 106. DUPLICATES

Check:

```text
duplicate account/date
```

If duplicates exist:

```text
STOP
```

and determine whether they are:

```text
true duplicates
```

or:

```text
multiple records with different meaning
```

Do not blindly aggregate.

---

# 107. MISSINGNESS VISUALIZATION

For model development, create:

```text
missingness heatmap
```

for a sample of accounts.

This helps determine whether missing readings are:

```text
random
clustered
seasonal
account-specific
```

Do not include this in the final model unless useful.

---

# 108. LABEL DISTRIBUTION

Report:

```text
number of FLAG=0
number of FLAG=1
positive percentage
```

Also inspect:

```text
FLAG distribution over time
```

if account labels can be meaningfully associated with time.

This matters for temporal evaluation.

---

# 109. IMPORTANT POSSIBLE PROBLEM

If:

```text
FLAG
```

is a static account-level label and every account has the same label across all dates, then daily rows do not independently represent separate classification targets.

Therefore:

```text
do not treat every daily row as an independent theft/non-theft sample
```

unless the task definition explicitly says the label is daily.

The final classifier should respect the label granularity.

---

# 110. ACCOUNT-LEVEL AGGREGATION

If the final target is account-level:

Generate an account-level feature vector such as:

```text
mean consumption
std consumption
recent mean
trend
missingness
forecast residual statistics
change point
drop
persistence
cumulative deficit
weather explanation
```

Then:

```text
one account
→ one feature row
→ one FLAG
```

for the chosen valid snapshot.

---

# 111. TEMPORAL SNAPSHOT WARNING

Do not accidentally compute:

```text
mean consumption across the entire 2014–2016 history
```

for an account that is supposed to be evaluated at an earlier cutoff.

That uses future information.

Instead:

```text
historical window ending at cutoff
```

must be used.

---

# 112. IF THE COMPETITION PROVIDES A SEPARATE TEST DATASET

If the two datasets turn out to be:

```text
training dataset
+
test dataset
```

then use the competition's explicit separation if documented.

Still:

```text
fit all learned preprocessing on training only
```

and:

```text
do not inspect test labels
```

for model tuning.

---

# 113. IF BOTH DATASETS ARE RAW DATA PARTS

If the two datasets are simply:

```text
parts of the same raw dataset
```

combine them only after inspecting:

```text
columns
account IDs
dates
duplicates
```

Do not assume they are independent train/test sets.

---

# 114. NO TEST LABEL PEEKING

The final test set is sacred.

Do not use it for:

```text
threshold tuning
class-weight tuning
feature selection
hyperparameter selection
```

Use:

```text
training
+
temporal validation
```

for these decisions.

---

# 115. CLASSIFIER THRESHOLD

For the competition's ranking output, a hard threshold is not required.

We want:

```text
risk score
```

rather than:

```text
FLAG predicted yes/no
```

Therefore:

```text
do not optimize a 0.5 threshold as the main objective.
```

Optimize ranking performance:

```text
AUC-PR
Precision@K
```

---

# 116. CALIBRATION

Probability calibration is optional.

If we use:

```text
predict_proba
```

the output can be treated primarily as:

```text
ranking score
```

unless explicitly calibrated.

Do not claim:

```text
0.90 = exactly 90% probability of theft
```

without calibration evidence.

---

# 117. RISK SCORE LANGUAGE

Use:

```text
risk score
```

or:

```text
investigation priority score
```

Avoid:

```text
theft certainty
```

---

# 118. FINAL MODEL OUTPUT CONTRACT

The training pipeline must produce:

```text
risk_score
```

for every account in the final evaluation set.

Then:

```text
rank
```

by descending risk.

---

# 119. EVALUATION OUTPUT

Save:

```text
artifacts/metrics.json
```

Example structure:

```json
{
  "auc_pr": 0.000,
  "precision_at_50": 0.000,
  "precision_at_100": 0.000
}
```

Use actual values only after training.

Never fabricate metrics.

---

# 120. BASELINE COMPARISON

Save:

```text
artifacts/model_comparison.json
```

containing:

```text
baseline
full_model
```

and:

```text
AUC-PR
Precision@50
Precision@100
```

This is important for proving that the advanced feature pipeline actually helps.

---

# 121. EXPECTED MODEL METRICS

The expected-consumption model should use regression metrics such as:

```text
MAE
RMSE
```

These are secondary.

The competition's primary theft-detection metric remains:

```text
AUC-PR
```

Do not confuse:

```text
forecast accuracy
```

with:

```text
theft classification performance
```

---

# 122. FORECAST BASELINE METRIC

Example:

```text
Rolling mean MAE = X
LightGBM MAE      = Y
```

We want:

```text
Y < X
```

ideally.

But even if the improvement is modest, the forecast model can still be useful if the residual/change features improve AUC-PR.

---

# 123. CHANGE DETECTION VALIDATION

Inspect several known examples.

For confirmed theft accounts:

```text
plot actual
plot expected
mark change point
```

For normal accounts:

```text
plot actual
plot expected
```

The goal is to make sure CUSUM is not flagging every seasonal fluctuation.

---

# 124. FALSE POSITIVE CHECK

Inspect top-ranked non-theft accounts.

Ask:

```text
Why did the model rank this account highly?
```

Potential legitimate causes:

```text
vacancy
weather
holiday
lifestyle change
meter replacement
data quality
```

This is valuable for improving the model.

---

# 125. FALSE NEGATIVE CHECK

Inspect known theft accounts ranked low.

Ask:

```text
Why did the model miss them?
```

Possible reasons:

```text
small behavioural change
short theft period
high missingness
weak history
forecast error
label noise
```

Use this analysis to improve features.

---

# 126. FEATURE SANITY CHECK

Before training the classifier, inspect feature distributions.

Check:

```text
NaN count
inf count
min
max
mean
median
std
```

Especially:

```text
gap_percentage
drop_magnitude
cumulative_deficit
persistence_days
cusum_score
```

---

# 127. INFINITE VALUES

Any ratio feature must protect against zero.

For example:

```text
(expected - actual) / expected
```

must use:

```text
max(expected, epsilon)
```

Then:

```text
replace inf
replace -inf
```

and inspect remaining missing values.

---

# 128. FEATURE LEAKAGE AUDIT

Create:

```text
artifacts/leakage_audit.md
```

Document:

```text
feature
information date
allowed at prediction time?
```

Example:

```text
lag_7d
→ yes

rolling_mean_30d
→ yes, if backward-looking

FLAG
→ NO

future consumption
→ NO

test label
→ NO
```

---

# 129. LEAKAGE AUDIT SCRIPT

Create:

```text
scripts/10_leakage_audit.py
```

It should inspect feature-generation logic and report known risky operations.

At minimum, manually review:

```text
shift
rolling
merge
groupby
imputation
scaling
encoding
```

---

# 130. SCALING

Tree models such as:

```text
LightGBM
XGBoost
```

do not require feature scaling.

Therefore do NOT add StandardScaler everywhere.

This simplifies the pipeline and avoids unnecessary preprocessing.

---

# 131. LINEAR BASELINE

If using Ridge for the expected-consumption baseline:

```text
scale numeric features
```

using training-only parameters.

For the final tree classifier:

```text
scaling is unnecessary
```

---

# 132. CATEGORICAL FEATURES

For:

```text
day_of_week
month
season
```

LightGBM can handle categorical representations depending on implementation.

A simple robust approach is:

```text
numeric integer encodings
```

or:

```text
one-hot encoding
```

if using a model that requires it.

Do not use account ID as a category in the classifier unless there is a very specific reason.

It can cause memorization.

---

# 133. ACCOUNT ID MUST NOT BE A PREDICTIVE FEATURE

Do not feed:

```text
CONS_NO
```

into the final classifier.

It is an identifier.

Keep it for:

```text
joins
ranking
output
```

only.

---

# 134. HYPERPARAMETERS

Start conservatively.

Example LightGBM classifier:

```text
n_estimators: 500
learning_rate: 0.03
num_leaves: 31
max_depth: -1
subsample: 0.8
colsample_bytree: 0.8
reg_alpha: 0.1
reg_lambda: 1.0
```

These are starting values, NOT guaranteed optimal values.

Tune using temporal validation.

---

# 135. EARLY STOPPING

Use validation-based early stopping if supported.

Concept:

```text
train
→ monitor temporal validation
→ stop when validation stops improving
```

Do not monitor the final test set.

---

# 136. EXPECTED MODEL HYPERPARAMETERS

Start with moderate complexity.

Example:

```text
n_estimators: 500
learning_rate: 0.03
num_leaves: 31
subsample: 0.8
colsample_bytree: 0.8
```

Tune only if necessary.

---

# 137. HYPERPARAMETER SEARCH

Do NOT launch a giant search.

Use a small manually chosen grid or randomized search.

Example:

```text
learning_rate:
0.02
0.03
0.05

num_leaves:
15
31
63

max_depth:
-1
8
12
```

Evaluate only on temporal validation.

---

# 138. WHY NOT HUGE HYPERPARAMETER SEARCH?

Because:

```text
feature quality
+
leakage safety
+
correct temporal evaluation
```

matter more than trying 300 parameter combinations.

The GPU should not become an excuse to overfit the validation set.

---

# 139. MODEL VERSIONING

Every model should have a version.

Example:

```text
models/
    expected_v001.txt
    classifier_v001.txt
```

When features change:

```text
v002
```

Do not overwrite the only working model.

---

# 140. TRAINING CONFIG

Example:

```yaml
seed: 42

split:
  train_ratio: 0.70
  validation_ratio: 0.15
  test_ratio: 0.15

expected_model:
  type: lightgbm
  objective: regression

classifier:
  type: lightgbm
  objective: binary
  class_weight: balanced

evaluation:
  primary_metric: auc_pr
  precision_k:
    - 50
    - 100
```

The exact split values must be replaced after inspecting the dataset.

---

# 141. GPU CONFIG

Example:

```yaml
compute:
  device: auto
```

The code decides:

```text
CUDA available
→ GPU

otherwise
→ CPU
```

Do not require the user to manually edit the code for RTX 4050 vs RTX 5060.

---

# 142. CPU FALLBACK

The entire pipeline must work with:

```text
device=cpu
```

This is mandatory.

If GPU initialization fails:

```text
log warning
fallback to CPU
continue
```

Do not crash the whole pipeline because CUDA is unavailable.

---

# 143. EXPECTED TRAINING TIME

Do not promise a specific training time.

It depends on:

```text
number of date columns
number of generated long rows
feature count
model parameters
CPU
GPU
RAM
disk speed
```

The 43k-row account scale suggests that a tree-based solution should be much more manageable than a deep sequence model, but the actual wide-to-long size must be measured.

---

# 144. PIPELINE CHECKPOINTS

Every major stage should save a checkpoint.

```text
data checkpoint
↓
forecast features
↓
expected model
↓
residual features
↓
change features
↓
final classifier
↓
predictions
```

If a later stage fails, we should not need to recompute everything.

---

# 145. CHECKPOINT FORMAT

Prefer:

```text
Parquet
```

for feature tables.

Use:

```text
joblib
```

or native model serialization for models.

Use:

```text
JSON
```

for metadata.

---

# 146. FAIL-FAST VALIDATION

At each stage check:

```text
expected columns exist
no duplicate account/date
dates sorted
no future leakage
target exists
no infinite values
feature row count reasonable
```

If a critical check fails:

```text
raise an explicit error
```

Do not silently continue.

---

# 147. LOGGING EXAMPLE

Use Python logging.

Example:

```text
INFO Loading dataset
INFO Detected 2,000 date columns
INFO Accounts: 43,000
INFO Date range: ...
INFO Missing readings: ...%
INFO FLAG=1: ...
INFO Temporal cutoff: ...
INFO Building lag features
INFO Training expected model
INFO Building residual features
INFO Running CUSUM
INFO Training classifier
INFO AUC-PR: ...
```

Use actual values at runtime.

---

# 148. DATA VALIDATION TESTS

Create unit tests for:

```text
date parser
wide-to-long conversion
missingness flag
lag generation
rolling feature leakage
gap calculation
drop magnitude
CUSUM
cumulative deficit
temporal split
ranking
AUC-PR
```

---

# 149. EXAMPLE TEST: LAG

Given:

```text
Day 1 = 10
Day 2 = 12
Day 3 = 14
```

for Day 3:

```text
lag_1d = 12
```

not:

```text
14
```

---

# 150. EXAMPLE TEST: ROLLING

If predicting:

```text
Day 4
```

and using a 3-day historical mean:

```text
Days 1–3
```

must be used.

Do NOT include:

```text
Day 4
```

---

# 151. EXAMPLE TEST: GAP

Given:

```text
expected = 10
actual = 6
```

expect:

```text
energy_gap = 4
gap_percentage = 0.4
```

---

# 152. EXAMPLE TEST: DROP

Given:

```text
pre = 10
post = 5
```

expect:

```text
drop_magnitude = 0.5
```

---

# 153. EXAMPLE TEST: CUMULATIVE DEFICIT

Given:

```text
expected = [10, 10, 10]
actual   = [7, 12, 6]
```

daily deficits:

```text
3
0
4
```

cumulative:

```text
7
```

---

# 154. EXAMPLE TEST: RANKING

Given:

```text
A = 0.2
B = 0.9
C = 0.5
```

ranking must be:

```text
1 B
2 C
3 A
```

---

# 155. PRIMARY SUCCESS CRITERION

The project is NOT considered successful merely because:

```text
the model trains
```

It must satisfy:

```text
temporal evaluation
+
missing-data handling
+
AUC-PR
+
ranked scores
+
defensible imbalance strategy
```

and ideally:

```text
full behavioural features improve over baseline
```

---

# 156. MODEL COMPARISON TABLE

At the end of training, generate:

| Model | Main Features | AUC-PR | Precision@50 | Precision@100 |
|---|---|---:|---:|---:|
| Baseline | basic historical features | runtime value | runtime value | runtime value |
| Residual model | + expected vs actual | runtime value | runtime value | runtime value |
| Behaviour model | + change/persistence | runtime value | runtime value | runtime value |
| Full model | + weather/missingness/context | runtime value | runtime value | runtime value |

Never fill this table with invented values.

---

# 157. WHAT COUNTS AS A GOOD RESULT?

Do not set a fake target such as:

```text
AUC-PR must be 0.90
```

before seeing the dataset.

Instead:

```text
full model should outperform the baseline
```

under the same temporal evaluation.

The real score depends on:

```text
label quality
dataset structure
feature quality
time cutoff
```

---

# 158. IMPORTANT: AUC-PR DEPENDS ON PREVALENCE

AUC-PR is strongly influenced by the rarity of the positive class.

Therefore always report:

```text
positive prevalence
+
AUC-PR
```

together.

This gives context to the score.

---

# 159. PRECISION@K DEPENDS ON K

Always report:

```text
K
```

alongside:

```text
Precision@K
```

Example:

```text
Precision@50 = ...
Precision@100 = ...
```

---

# 160. FINAL TOP-K EXPORT

Create:

```text
predictions/top_100.csv
```

with:

```text
rank
CONS_NO
risk_score
change_point
gap_percentage
drop_magnitude
persistence_days
cumulative_deficit
weather_explanation_score
missingness_change
```

This will later make UI integration easy.

---

# 161. TRAINING OUTPUTS FOR THE UI TEAM

The training team must eventually provide:

```text
predictions/final_predictions.csv
```

and:

```text
predictions/investigation_features.csv
```

The second file should contain enough information to explain why a customer was ranked highly.

---

# 162. RECOMMENDED INVESTIGATION OUTPUT SCHEMA

```text
CONS_NO
risk_score
rank

change_point_date
days_since_change

expected_consumption
actual_consumption
energy_gap
gap_percentage

pre_change_mean
post_change_mean
drop_magnitude

persistence_days
cumulative_deficit
cusum_score

weather_explanation_score

missing_rate
missingness_change
missingness_around_change

peer_deviation
```

If a feature was not implemented:

```text
leave it out
```

Do not create fake values.

---

# 163. WHAT NOT TO DO

Do NOT:

```text
randomly split time series
```

Do NOT:

```text
drop all missing rows
```

Do NOT:

```text
use FLAG as a feature
```

Do NOT:

```text
use CONS_NO as a feature
```

Do NOT:

```text
use future readings
```

Do NOT:

```text
tune against the final test
```

Do NOT:

```text
optimize plain accuracy
```

Do NOT:

```text
start with LSTM
```

Do NOT:

```text
build a huge hyperparameter search
```

Do NOT:

```text
claim risk score = proof of theft
```

---

# 164. WHAT TO DO FIRST

Antigravity should execute the following sequence.

```text
STEP 1
Inspect all files.

STEP 2
Confirm which files are raw data, archive parts, training data, and test data.

STEP 3
Read the actual CSV header.

STEP 4
Confirm CONS_NO and FLAG.

STEP 5
Confirm date columns.

STEP 6
Confirm FLAG granularity.

STEP 7
Measure missingness.

STEP 8
Build safe temporal split.

STEP 9
Build baseline features.

STEP 10
Build expected-consumption baseline.

STEP 11
Build gradient-boosted expected model.

STEP 12
Generate residuals.

STEP 13
Generate persistence/change features.

STEP 14
Train baseline theft classifier.

STEP 15
Train full theft classifier.

STEP 16
Evaluate AUC-PR.

STEP 17
Evaluate Precision@50 and Precision@100.

STEP 18
Compare baseline vs full.

STEP 19
Save models.

STEP 20
Save ranked predictions.
```

---

# 165. IMPLEMENTATION PRINCIPLE

Build:

```text
simple
→ correct
→ measured
→ improved
```

not:

```text
complicated
→ broken
→ impossible to debug
```

---

# 166. RECOMMENDED MODEL STACK

Core:

```text
Python
pandas
numpy
scikit-learn
LightGBM
```

Optional:

```text
XGBoost
SHAP
ruptures
PyTorch
```

Only add optional dependencies when they solve an actual problem.

---

# 167. RECOMMENDED FIRST MODEL

The first complete model should be:

```text
LightGBM regression
+
LightGBM classifier
```

with:

```text
temporal split
+
class weighting
+
engineered features
```

This is the fastest route to a working system.

---

# 168. SECOND MODEL

If time allows:

```text
XGBoost regression
+
XGBoost classifier
```

Compare validation performance.

Do not keep both in production merely for the sake of having two algorithms.

Choose the stronger, more stable pipeline.

---

# 169. ENSEMBLE

An ensemble is optional.

If:

```text
LightGBM
```

and:

```text
XGBoost
```

have genuinely complementary validation errors, average their risk scores:

```text
final_score =
0.5 * lightgbm_score
+
0.5 * xgboost_score
```

But only use an ensemble if temporal validation shows improvement.

Do not ensemble automatically.

---

# 170. THRESHOLD-FREE RANKING

Because the competition wants ranked accounts:

```text
risk_score
```

is more important than:

```text
binary threshold
```

The system should preserve the full score distribution.

---

# 171. TOP ACCOUNT INSPECTION

After training, automatically print:

```text
Top 20 suspicious accounts
```

with:

```text
risk
change point
gap
drop
persistence
```

This is a debugging tool as much as a demo tool.

---

# 172. MODEL FAILURE CONDITION

If the full model performs worse than the baseline:

```text
DO NOT hide it.
```

Investigate:

```text
feature leakage
forecast quality
change-point quality
class weighting
missingness handling
overfitting
```

The advanced features are useful only if they actually help or improve interpretability.

---

# 173. FEATURE REMOVAL RULE

If a feature:

```text
is noisy
+
has no validation benefit
+
has unclear interpretation
```

remove it.

More features are not automatically better.

---

# 174. FEATURE GROUP ABLATION

The strongest story is:

```text
Baseline
     ↓
+ Expected behaviour
     ↓
+ Change detection
     ↓
+ Weather
     ↓
+ Missingness
```

and show whether each stage improves AUC-PR.

This is more convincing than saying:

```text
"We have 50 features."
```

---

# 175. EXPECTED-CONSUMPTION MODEL IS NOT THE FINAL MODEL

Important distinction:

```text
Expected model
```

predicts:

```text
consumption
```

while:

```text
Final classifier
```

predicts:

```text
theft risk
```

Do not confuse the two.

---

# 176. RESIDUAL IS THE BRIDGE

The pipeline is:

```text
Historical behaviour
        ↓
Expected consumption
        ↓
Residual
        ↓
Behavioural features
        ↓
Theft classifier
```

Residuals are the bridge between forecasting and classification.

---

# 177. CHANGE POINT IS NOT THE LABEL

A change point means:

```text
behaviour changed
```

It does NOT mean:

```text
theft occurred
```

The final classifier combines the change-point signal with other evidence and confirmed labels.

---

# 178. MISSINGNESS IS NOT THE LABEL

A missing reading means:

```text
no measurement
```

It does NOT mean:

```text
theft
```

The model should treat missingness as a supporting signal.

---

# 179. WEATHER IS NOT THE LABEL

Weather explains legitimate variation.

It does NOT directly identify theft.

Use it to improve:

```text
expected consumption
```

and:

```text
unexplained deviation
```

---

# 180. CUMULATIVE DEFICIT IS NOT STOLEN ENERGY

The feature means:

```text
model-estimated expected consumption
minus
observed consumption
```

accumulated over a period.

Call it:

```text
estimated cumulative deficit
```

not:

```text
amount stolen
```

---

# 181. CUSUM IS NOT A BLACK BOX

If asked:

> "What is CUSUM?"

Answer:

> "It accumulates small errors in one direction. If the errors keep pointing in the same direction for long enough, the cumulative score crosses a threshold and indicates a possible behavioural shift."

---

# 182. MODEL EXPLANATION FOR JUDGES

If asked:

> "Why is account A ranked first?"

Answer:

> "The model sees a large persistent deviation below its expected consumption, a significant pre/post behavioural drop, and a sustained cumulative deficit. We also check whether weather or missingness provides an alternative explanation. These signals combine into the final investigation-priority score."

---

# 183. WHY NOT JUST USE THE BIGGEST DROP?

Because:

```text
big drop
```

can be legitimate.

For example:

```text
household vacancy
holiday
weather
lifestyle change
```

Our system asks:

```text
Was the drop expected?

Did it persist?

When did it begin?

Can weather explain it?

Did missingness change?

Is it unusual relative to history?
```

---

# 184. WHY SELF-BASELINE?

Electricity usage varies greatly between households.

A household using:

```text
5 kWh/day
```

may be normal.

Another using:

```text
20 kWh/day
```

may also be normal.

The more useful question is:

```text
Did this account suddenly move away from its own normal behaviour?
```

---

# 185. WHY PEER-BASELINE?

Self-history can miss a change if the account has limited history.

Peer comparison can provide:

```text
population context
```

but remains optional.

---

# 186. DATA QUALITY BEFORE MODEL QUALITY

If the model performs poorly, first verify:

```text
dates
missingness
labels
duplicates
split
feature leakage
```

before changing:

```text
num_leaves
learning_rate
```

A fancy model cannot rescue broken data.

---

# 187. FINAL TRAINING CHECKLIST

Before calling the training pipeline complete:

```text
[ ] Raw data preserved
[ ] Archive extracted correctly
[ ] CSV structure inspected
[ ] CONS_NO validated
[ ] FLAG validated
[ ] Date columns identified
[ ] Dates parsed correctly
[ ] Wide-to-long conversion validated
[ ] Missingness measured
[ ] is_missing created
[ ] Missing values handled
[ ] Temporal split created
[ ] No random main split
[ ] Lags generated safely
[ ] Rolling features generated safely
[ ] Calendar features generated
[ ] Weather merged if available
[ ] Expected baseline created
[ ] Expected model trained
[ ] Expected predictions generated
[ ] Residuals generated
[ ] Energy gap generated
[ ] Persistence generated
[ ] CUSUM/change point generated
[ ] Drop magnitude generated
[ ] Cumulative deficit generated
[ ] Missingness-change features generated
[ ] Weather explanation generated if applicable
[ ] Baseline classifier trained
[ ] Full classifier trained
[ ] Class weighting used
[ ] AUC-PR calculated
[ ] Precision@50 calculated
[ ] Precision@100 calculated
[ ] Baseline vs full comparison saved
[ ] Feature importance inspected
[ ] Top accounts inspected
[ ] Models saved
[ ] Predictions saved
[ ] Leakage audit completed
[ ] Reproducibility metadata saved
```

---

# 188. FINAL OUTPUTS REQUIRED FROM THIS WORKSTREAM

At the end, this training workstream must produce:

```text
models/
    expected_consumption_model
    theft_classifier

predictions/
    final_predictions.csv
    top_100.csv

artifacts/
    data_inspection.json
    split_config.json
    training_run.json
    metrics.json
    model_comparison.json
    leakage_audit.md
    feature_importance.csv
```

---

# 189. MINIMUM SUCCESSFUL BUILD

If time becomes limited, the minimum acceptable pipeline is:

```text
1. Correct data loading
2. Correct temporal split
3. Missingness handling
4. Basic engineered features
5. Expected-consumption baseline
6. Residual / energy gap
7. Persistence
8. Simple change detection
9. LightGBM classifier
10. Class weighting
11. AUC-PR
12. Ranked risk score
```

Everything else is secondary.

---

# 190. STRETCH BUILD

Only after the minimum pipeline works:

```text
CUSUM tuning
+
weather explanation
+
peer deviation
+
SHAP
+
ensemble
+
LSTM comparison
```

---

# 191. FINAL RULE FOR ANTIGRAVITY

Do not implement all advanced features at once.

Use this sequence:

```text
RUN
↓
CHECK
↓
MEASURE
↓
FIX
↓
ADD NEXT COMPONENT
```

After each major component, run tests.

Do not create a 2,000-line training script and then discover that the dates were parsed backwards.

---

# 192. FINAL IMPLEMENTATION DIRECTIVE

Antigravity should build the project as a modular Python ML pipeline.

The implementation must:

```text
inspect the real dataset first
```

then:

```text
construct a leakage-safe temporal dataset
```

then:

```text
learn expected consumption
```

then:

```text
derive behavioural deviations
```

then:

```text
train the final theft classifier
```

then:

```text
evaluate using AUC-PR
```

then:

```text
produce continuous risk scores
```

then:

```text
rank accounts
```

The pipeline must run on:

```text
RTX 4050
```

and:

```text
RTX 5060
```

with:

```text
automatic GPU detection
+
CPU fallback
```

The system must remain correct if GPU acceleration is unavailable.

---

# 193. FINAL MODEL CONCEPT

The final ML system is:

```text
             HISTORICAL CONSUMPTION
                       |
                       v
             TEMPORAL-SAFE FEATURES
                       |
             +---------+---------+
             |         |         |
             v         v         v
          HISTORY   CALENDAR   WEATHER
             |         |         |
             +---------+---------+
                       |
                       v
             EXPECTED CONSUMPTION
                       |
                       v
             ACTUAL - EXPECTED
                       |
                       v
                  RESIDUALS
                       |
              +--------+--------+
              |        |        |
              v        v        v
          GAP      PERSISTENCE  CUSUM
              |        |        |
              +--------+--------+
                       |
                       v
                CHANGE POINT
                       |
              +--------+--------+
              |        |        |
              v        v        v
            DROP   CUMULATIVE  MISSINGNESS
                   DEFICIT
              |        |        |
              +--------+--------+
                       |
                       v
             FINAL FEATURE VECTOR
                       |
                       v
              CLASS-WEIGHTED
             LIGHTGBM/XGBOOST
                       |
                       v
                  RISK SCORE
                       |
                       v
                 RANK ACCOUNTS
```

---

# 194. FINAL ONE-SENTENCE TECHNICAL DESCRIPTION

> The system uses a temporal-safe, weather-aware expected-consumption model to generate account-specific residual and behavioural-change signals, then feeds those signals together with historical, calendar, and missingness features into a class-weighted gradient-boosted theft classifier evaluated primarily with AUC-PR and used to produce a ranked investigation watchlist.

---

# 195. FINAL LOCKED SCOPE

## REQUIRED

```text
Temporal split
Missing-data handling
Engineered features
Expected consumption
Residual
Energy gap
Persistence
Change point
Drop magnitude
Cumulative deficit
Missingness features
Class weighting
AUC-PR
Risk score
Ranked watchlist
```

## STRONGLY RECOMMENDED

```text
Weather-aware expected baseline
Weather explanation
CUSUM
Precision@50
Precision@100
Feature importance
```

## OPTIONAL

```text
Peer deviation
SHAP
Ensemble
LSTM
```

---

# 196. END STATE

When this document's workstream is complete, another team member should be able to take:

```text
predictions/final_predictions.csv
```

and:

```text
predictions/top_100.csv
```

and build the UI/reporting system without needing to retrain the model.

The UI team should not need access to:

```text
training code
```

to display:

```text
risk
rank
change point
gap
drop
persistence
weather explanation
missingness
```

That separation is intentional.

---

# 197. FINAL INSTRUCTION

Build the **smallest reliable version first**.

The winning system is not the one with the most algorithms.

It is the one that can demonstrate:

```text
correct temporal evaluation
+
rare-event handling
+
missing-data awareness
+
strong behavioural features
+
good AUC-PR
+
useful ranking
+
clear investigation evidence
```

Everything else comes after that.
