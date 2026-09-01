# AI 02 — ELECTRICITY THEFT DETECTION
# FEATURE ENGINEERING + FEATURE PIPELINE SPECIFICATION
## Version: Build 1.0
## Purpose: Define exactly how the model features are constructed, validated, and exported

---

# 0. PURPOSE OF THIS FILE

This document is the dedicated feature-engineering specification for the Electricity Theft Detection project.

The training/modeling specification defines:

- how models are trained
- how temporal evaluation works
- how class imbalance is handled
- how AUC-PR is evaluated
- how predictions are produced

This file defines the feature layer in detail.

The feature layer must answer one question:

> Given the electricity history available up to a valid prediction cutoff, what measurable behavioural evidence can we construct that distinguishes ordinary consumption variation from suspicious, persistent, unexplained changes?

The feature pipeline must be:

```text
reproducible
+
temporal-safe
+
missing-data-aware
+
interpretable
+
efficient
+
compatible with the training pipeline
```

---

# 1. NON-NEGOTIABLE FEATURE RULES

Every feature must satisfy all of these conditions.

```text
1. It must be computable from data available at prediction time.
2. It must not use FLAG.
3. It must not use future consumption.
4. It must preserve information about missing readings.
5. It must have a clear definition.
6. It must be reproducible.
7. It must be validated for NaN and infinite values.
8. Its direction must be documented.
9. If it depends on a threshold, that threshold must be determined from training/validation only.
10. If it is account-level, the aggregation window must be explicitly defined.
```

---

# 2. THE EIGHT CORE DEFENSIBLE FEATURES

The project should explicitly highlight eight major engineered signals.

These are the core behavioural features:

```text
1. Expected Consumption Deviation
2. Relative Energy Gap
3. Persistent Deviation
4. Behavioural Drop Magnitude
5. Change-Point Evidence
6. Cumulative Consumption Deficit
7. Missingness Behaviour Shift
8. Weather-Adjusted Unexplained Deviation
```

These eight should form the centre of the feature story.

Additional supporting features such as:

```text
lags
rolling statistics
weekday structure
CUSUM
volatility
seasonality
```

are still useful and should be implemented where appropriate.

The eight above are the main defensible features for the final presentation.

---

# 3. FEATURE PIPELINE OVERVIEW

The complete feature pipeline is:

```text
RAW DAILY METER READINGS
          |
          v
DATA QUALITY + MISSINGNESS
          |
          v
HISTORICAL FEATURES
          |
          v
EXPECTED CONSUMPTION
          |
          v
ACTUAL vs EXPECTED
          |
          +----------------+
          |                |
          v                v
      ENERGY GAP       RESIDUAL
          |                |
          +--------+-------+
                   |
                   v
          PERSISTENCE ANALYSIS
                   |
                   v
            CHANGE DETECTION
                   |
                   v
             CHANGE POINT
                   |
          +--------+--------+
          |        |        |
          v        v        v
        DROP    DEFICIT   MISSINGNESS
          |        |        |
          +--------+--------+
                   |
                   v
          WEATHER EXPLANATION
                   |
                   v
          ACCOUNT-LEVEL VECTOR
                   |
                   v
          FINAL CLASSIFIER
```

---

# 4. RAW DATA CONTRACT

The expected raw structure is wide:

```text
CONS_NO
FLAG
05-09-2014
06-09-2014
07-09-2014
...
```

Conceptually:

```text
CONS_NO = account identifier

FLAG = account-level target

date columns = daily consumption
```

The exact dates must always be detected from the real file.

Never hard-code:

```text
number of days
first date
last date
```

---

# 5. LONG-FORM REPRESENTATION

Feature engineering should operate on a long-form table:

```text
CONS_NO
FLAG
date
consumption
is_missing
```

Example:

```text
CONS_NO | FLAG | date       | consumption | is_missing
A001    | 0    | 2014-09-05 | 10.2        | 0
A001    | 0    | 2014-09-06 | NaN         | 1
A001    | 0    | 2014-09-07 | 11.4        | 0
```

---

# 6. ORIGINAL READING VS MODEL VALUE

Always preserve two concepts.

```text
original_consumption
```

and:

```text
model_consumption
```

where:

```text
original_consumption
=
actual raw reading

model_consumption
=
value used by a downstream model after safe preprocessing
```

Never overwrite the original value with an imputed value.

---

# 7. MISSINGNESS MUST BE CREATED FIRST

Before any imputation:

```python
is_missing = consumption.isna().astype("int8")
```

This is mandatory.

The sequence is:

```text
raw consumption
      |
      v
is_missing
      |
      v
imputation/model representation
```

Never:

```text
impute first
then
try to infer missingness
```

because that destroys the original information.

---

# 8. FEATURE CATEGORIES

Features are divided into:

```text
A. Historical behaviour
B. Calendar/seasonal structure
C. Missingness
D. Expected-consumption model outputs
E. Residual behaviour
F. Persistence
G. Change-point behaviour
H. Energy deficit
I. Weather/context
J. Optional peer behaviour
```

---

# 9. CATEGORY A — HISTORICAL BEHAVIOUR

Historical features describe what the household normally does.

Required examples:

```text
lag_1d
lag_7d
lag_14d
lag_30d

rolling_mean_7d
rolling_mean_14d
rolling_mean_30d

rolling_std_7d
rolling_std_30d

rolling_min_30d
rolling_max_30d

rolling_median_30d
```

---

# 10. LAG FEATURES

For each account, create:

```text
lag_1d
lag_7d
lag_14d
lag_30d
```

Definition:

```text
lag_1d(T) = consumption(T-1)

lag_7d(T) = consumption(T-7)

lag_14d(T) = consumption(T-14)

lag_30d(T) = consumption(T-30)
```

These describe recent and seasonal history.

---

# 11. WHY LAG 7 IS IMPORTANT

Electricity usage often contains weekly structure.

For example:

```text
weekday behaviour
vs
weekend behaviour
```

Comparing:

```text
today
```

to:

```text
same weekday one week earlier
```

can be more informative than comparing only to yesterday.

---

# 12. WHY MULTIPLE LAGS ARE REQUIRED

A single lag can be noisy.

Use multiple horizons:

```text
1 day
7 days
14 days
30 days
```

This lets the model distinguish:

```text
short-term variation
```

from:

```text
persistent behavioural movement
```

---

# 13. ROLLING MEAN

For each account:

```text
rolling_mean_7d
rolling_mean_30d
```

These summarize recent baseline behaviour.

Example:

```text
rolling_mean_7d(T)
=
mean of historical observations in the valid 7-day window
```

The exact forecasting alignment must be implemented using shifted history.

---

# 14. ROLLING STANDARD DEVIATION

Create:

```text
rolling_std_7d
rolling_std_30d
```

This measures volatility.

Interpretation:

```text
high volatility
=
account naturally fluctuates a lot

low volatility
=
account usually behaves consistently
```

A sudden change is potentially more informative for a historically stable household.

---

# 15. ROBUST ROLLING STATISTICS

Where useful, use:

```text
rolling_median
rolling_quantiles
```

because electricity readings may contain outliers.

A robust median can prevent one abnormal day from dominating a baseline.

---

# 16. ROLLING FEATURES MUST BE BACKWARD-LOOKING

This is one of the most important rules.

For target date:

```text
T
```

the feature must not contain:

```text
T+1
T+2
...
```

For next-day prediction:

```text
history through T
→ predict T+1
```

---

# 17. SHIFT-BEFORE-ROLLING RULE

For a feature that represents history before a target date:

```python
history = group["consumption"].shift(1)
rolling = history.rolling(window=7).mean()
```

This is safer than directly calculating a rolling statistic on the target-inclusive series.

---

# 18. CATEGORY B — CALENDAR FEATURES

Create:

```text
day_of_week
is_weekend
month
quarter
season
day_of_year
```

where appropriate.

These are contextual variables.

They help distinguish:

```text
normal seasonal behaviour
```

from:

```text
unexpected behavioural change
```

---

# 19. CYCLIC CALENDAR ENCODING

For models that benefit from continuous periodic representation, optionally create:

```text
dow_sin
dow_cos
month_sin
month_cos
```

Example:

```text
dow_sin = sin(2π * day_of_week / 7)
dow_cos = cos(2π * day_of_week / 7)
```

This prevents:

```text
Sunday = 6
Monday = 0
```

from appearing artificially far apart.

For tree models this is optional.

---

# 20. WEEKDAY STRUCTURE

Create account-level statistics such as:

```text
weekday_mean
weekend_mean
weekday_weekend_ratio
```

These describe the account's normal weekly profile.

---

# 21. WEEKLY PROFILE

A stronger feature is the deviation from the customer's normal weekday pattern.

For example:

```text
Monday consumption
relative to
historical Monday consumption
```

This avoids confusing a naturally low Sunday with suspicious behaviour.

---

# 22. DAY-OF-WEEK DEVIATION

For each day:

```text
dow_baseline
```

can be calculated from historical observations of the same weekday.

Then:

```text
dow_deviation =
actual / max(dow_baseline, epsilon)
```

or:

```text
actual - dow_baseline
```

Use only historical observations available before the prediction cutoff.

---

# 23. CATEGORY C — MISSINGNESS FEATURES

Missingness is not noise to delete.

It is part of the data-generating process.

Create:

```text
missing_rate_7d
missing_rate_30d
overall_missing_rate
missing_streak
longest_missing_streak
missing_count_7d
missing_count_30d
```

---

# 24. MISSING RATE

Definition:

```text
missing_rate_window
=
missing readings / readings expected
```

For a 30-day window:

```text
missing_rate_30d
=
missing_count_30d / 30
```

If dates are missing from the entire dataset rather than explicitly represented as rows, first create a complete account/date calendar so that absent observations can be identified.

---

# 25. MISSING STREAK

A missing streak measures consecutive missing observations.

Example:

```text
reading
reading
missing
missing
missing
reading
```

has:

```text
missing_streak = 3
```

---

# 26. LONGEST MISSING STREAK

Create:

```text
longest_missing_streak
```

over the relevant historical window.

This is useful because:

```text
5 isolated missing days
```

are different from:

```text
5 consecutive missing days
```

---

# 27. MISSINGNESS CHANGE

This is one of the strongest missing-data features.

Define:

```text
missingness_before_change
missingness_after_change
missingness_change
```

For example:

```text
before = 0.05
after = 0.30

missingness_change = 0.25
```

---

# 28. WHY MISSINGNESS CHANGE MATTERS

A sudden change in missingness can be relevant because the data collection process itself changed.

But:

```text
missingness change ≠ theft
```

It is supporting evidence only.

It could indicate:

```text
meter issue
communication failure
maintenance
data pipeline problem
```

---

# 29. MISSINGNESS AROUND CHANGE POINT

Once a candidate change point is found:

```text
missing_rate_before
missing_rate_after
```

calculate:

```text
missingness_change
```

This feature should be retained even if the change is not theft.

---

# 30. IMPUTATION

Feature engineering may require a model-ready consumption series.

Possible approach:

```text
short gaps:
interpolate or use local robust estimate

long gaps:
retain missingness
use model-compatible missing representation
```

Do not use one blanket forward fill.

---

# 31. IMPUTATION MUST NOT LEAK

If an imputation method learns:

```text
mean
median
distribution
```

from data:

```text
outside the training period
```

it can leak information.

Any learned imputation parameter must be fit on the training period and applied forward.

---

# 32. CATEGORY D — EXPECTED CONSUMPTION

Expected consumption is the central feature-engineering concept.

We need:

```text
expected_consumption
```

representing what the account would reasonably be expected to consume given:

```text
its history
+
calendar
+
weather
+
other available context
```

---

# 33. EXPECTED CONSUMPTION FEATURE

For each valid date:

```text
expected_consumption
```

is produced by the expected-consumption model.

This is not the theft classifier.

It is a behavioural baseline.

---

# 34. WHY EXPECTED CONSUMPTION IS POWERFUL

Raw consumption is difficult to interpret.

Example:

```text
Actual consumption = 8
```

means little by itself.

But:

```text
Expected = 16
Actual = 8
```

means:

```text
consumption is approximately 50% below expected
```

That is much more informative.

---

# 35. CATEGORY E — RESIDUAL FEATURES

Calculate:

```text
residual =
actual - expected
```

A negative residual means:

```text
actual < expected
```

---

# 36. ENERGY GAP

Define:

```text
energy_gap =
expected - actual
```

Positive:

```text
actual is below expected
```

Negative:

```text
actual is above expected
```

For theft-oriented evidence, positive deficits are especially relevant.

---

# 37. RELATIVE ENERGY GAP

This is Core Feature #2.

Definition:

```text
relative_energy_gap =
(expected - actual) / max(expected, epsilon)
```

Example:

```text
expected = 20
actual = 10

gap = 0.50
```

Interpretation:

```text
observed consumption is 50% below expected
```

---

# 38. WHY RELATIVE GAP IS BETTER THAN RAW GAP

Suppose:

```text
Account A:
expected = 20
actual = 10
gap = 10

Account B:
expected = 100
actual = 90
gap = 10
```

Both have:

```text
10 kWh gap
```

but their behavioural changes are very different.

Relative gap:

```text
A = 50%
B = 10%
```

The relative measure provides scale normalization.

---

# 39. CLIPPED RELATIVE GAP

For some model configurations, extremely small expected values can create unstable ratios.

Use:

```text
epsilon
```

and optionally clip extreme values to a defensible range.

Example:

```text
relative_gap_clipped
```

Do not clip without recording the chosen range.

---

# 40. RESIDUAL STATISTICS

Aggregate:

```text
residual_mean
residual_median
residual_std
negative_residual_ratio
```

over:

```text
30d
60d
90d
```

where enough history exists.

---

# 41. NEGATIVE RESIDUAL RATIO

Definition:

```text
negative_residual_ratio
=
number of days where actual < expected
/
number of valid days
```

This captures directional persistence.

---

# 42. LARGE-DEFICIT RATIO

Optional but recommended:

```text
large_deficit_ratio
```

where:

```text
relative_gap > threshold
```

for a threshold determined from training/validation.

This measures how often an account has unusually large deficits.

---

# 43. CORE FEATURE #1 — EXPECTED CONSUMPTION DEVIATION

Name:

```text
expected_deviation
```

Definition:

```text
actual - expected
```

or use the signed residual:

```text
residual
```

Recommended additional derived form:

```text
absolute_deviation
=
abs(actual - expected)
```

For theft screening, preserve the signed form because direction matters.

---

# 44. CATEGORY F — PERSISTENCE

A one-day anomaly is weak evidence.

A persistent deviation is more informative.

Create:

```text
persistence_days
```

---

# 45. PERSISTENCE DEFINITION

Define an anomalous day using a training-derived threshold.

Example:

```text
relative_gap > anomaly_threshold
```

Then:

```text
persistence_days
```

is the length of the current consecutive anomalous run.

Do not hard-code:

```text
7 days = theft
```

as a universal rule.

---

# 46. WHY PERSISTENCE IS DEFENSIBLE

Legitimate electricity consumption is noisy.

A single unusual day can occur because of:

```text
travel
holiday
appliance failure
weather
```

A sustained change is stronger behavioural evidence.

Still:

```text
persistence ≠ proof of theft
```

---

# 47. PERSISTENCE FEATURES

Create:

```text
current_persistence_days
max_persistence_30d
max_persistence_60d
max_persistence_90d
anomalous_days_30d
anomalous_days_60d
anomalous_days_90d
```

---

# 48. CORE FEATURE #3 — PERSISTENT DEVIATION

The main feature can be:

```text
persistence_days
```

supported by:

```text
anomalous_days_30d
```

and:

```text
negative_residual_ratio
```

This gives both:

```text
current run
+
overall frequency
```

---

# 49. ANOMALY THRESHOLD

Possible approaches:

```text
account-specific residual quantile
```

or:

```text
robust scale threshold
```

For example:

```text
residual < account lower quantile
```

The exact threshold must be selected using:

```text
training
+
validation
```

only.

---

# 50. CATEGORY G — CHANGE POINT

The purpose of change-point features is to answer:

> When did the account's behaviour materially change?

This is different from asking:

> Is today's consumption low?

---

# 51. CHANGE-POINT METHODS

Possible methods:

```text
CUSUM
rolling mean shift
ruptures/Pelt
binary segmentation
```

Recommended first implementation:

```text
CUSUM
+
rolling pre/post comparison
```

because it is lightweight and interpretable.

---

# 52. CUSUM

CUSUM accumulates deviations.

Conceptually:

```text
small positive and negative deviations
→ cancel

persistent deviations in one direction
→ accumulate

large sustained shift
→ large CUSUM
```

For theft-oriented detection, monitor:

```text
negative residual accumulation
```

---

# 53. CUSUM SCORE

Create:

```text
cusum_negative
```

or:

```text
cusum_score
```

where higher values represent stronger sustained negative deviation.

Document the sign convention.

---

# 54. CUSUM RESET

A CUSUM implementation should reset or decay when behaviour returns toward baseline.

This prevents:

```text
one historical event
```

from permanently dominating the account's score.

---

# 55. CUSUM THRESHOLD

The threshold should not be arbitrarily selected after looking at test labels.

Tune on:

```text
training
+
temporal validation
```

If no tuning is possible, use a robust statistical threshold and document it.

---

# 56. CHANGE-POINT DATE

For each account, store:

```text
change_point_date
```

if a meaningful candidate exists.

If no change point is detected:

```text
NaT
```

or a defined missing representation.

Do not invent a change date.

---

# 57. DAYS SINCE CHANGE

Convert the date into:

```text
days_since_change
```

relative to the prediction cutoff.

Example:

```text
change point = 2025-01-01
cutoff = 2025-02-01

days_since_change = 31
```

---

# 58. CORE FEATURE #5 — CHANGE-POINT EVIDENCE

Use a combination:

```text
cusum_score
+
days_since_change
+
pre_change_mean
+
post_change_mean
+
drop_magnitude
```

The classifier can learn how these interact.

Do not collapse all of these into one arbitrary score before modeling.

---

# 59. PRE-CHANGE MEAN

Define:

```text
pre_change_mean
```

using a historical window before the detected change point.

Example:

```text
30 days before change
```

if sufficient history exists.

---

# 60. POST-CHANGE MEAN

Define:

```text
post_change_mean
```

using the period after the detected change point and up to the prediction cutoff.

Avoid including future data.

---

# 61. PRE/POST WINDOW RULE

The windows must be:

```text
historically valid
+
available at the prediction cutoff
```

If there are too few observations:

```text
mark feature unavailable
```

Do not silently use the whole account history.

---

# 62. CATEGORY H — BEHAVIOURAL DROP

A suspicious behavioural shift can be represented as:

```text
drop_magnitude
```

---

# 63. CORE FEATURE #4 — DROP MAGNITUDE

Definition:

```text
drop_magnitude =
(pre_change_mean - post_change_mean)
/
max(pre_change_mean, epsilon)
```

Example:

```text
pre = 20
post = 10

drop = 50%
```

---

# 64. WHY DROP MAGNITUDE IS DIFFERENT FROM GAP

Drop magnitude:

```text
before vs after
```

Relative energy gap:

```text
expected vs actual
```

A strong model should use both.

---

# 65. DROP MAGNITUDE INTERPRETATION

Higher:

```text
larger downward behavioural change
```

Lower/negative:

```text
little downward shift
```

It is a behavioural signal, not proof of tampering.

---

# 66. CHANGE-POINT STRENGTH

Optional feature:

```text
change_point_strength
```

Possible definition:

```text
absolute difference between pre/post means
normalized by historical variability
```

Example conceptual formula:

```text
change_strength =
abs(pre_mean - post_mean)
/
max(pre_std, epsilon)
```

This distinguishes:

```text
large shift in stable account
```

from:

```text
large shift in naturally chaotic account
```

---

# 67. CATEGORY I — CUMULATIVE DEFICIT

The cumulative deficit estimates the total expected-minus-observed reduction over a suspicious period.

---

# 68. CORE FEATURE #6 — CUMULATIVE CONSUMPTION DEFICIT

For each day:

```text
daily_deficit =
max(expected - actual, 0)
```

Then:

```text
cumulative_deficit =
sum(daily_deficit)
```

over a defined window.

---

# 69. CUMULATIVE DEFICIT WINDOWS

Create:

```text
cumulative_deficit_30d
cumulative_deficit_60d
cumulative_deficit_90d
```

if enough data exists.

---

# 70. WHY MULTIPLE WINDOWS

A 30-day deficit captures:

```text
recent behaviour
```

A 90-day deficit captures:

```text
longer-term persistent deviation
```

Together they help distinguish:

```text
short event
```

from:

```text
long sustained shift
```

---

# 71. IMPORTANT LANGUAGE

Call this:

```text
estimated cumulative deficit
```

or:

```text
model-estimated consumption deficit
```

Do NOT call it:

```text
electricity stolen
```

because expected consumption is a model estimate.

---

# 72. DEFICIT RATE

Optional:

```text
deficit_rate =
cumulative_deficit
/
sum(expected_consumption)
```

This normalizes the deficit by account scale.

---

# 73. DEFICIT DAYS

Create:

```text
deficit_days_30d
```

defined as:

```text
count(actual < expected)
```

or, preferably for stronger anomaly evidence:

```text
count(relative_gap > anomaly_threshold)
```

---

# 74. CATEGORY J — WEATHER

Weather is a contextual correction.

If weather data is available, merge it by:

```text
date
```

and location where the data supports location-specific matching.

---

# 75. WEATHER VARIABLES

Potential features:

```text
temperature
temperature_min
temperature_max
humidity
rainfall
extreme_heat
extreme_cold
```

Only use variables that actually exist.

---

# 76. WEATHER-AWARE EXPECTED MODEL

The preferred design is:

```text
weather
+
calendar
+
historical consumption
→ expected consumption
```

This means weather-driven consumption changes are already incorporated into the baseline.

---

# 77. CORE FEATURE #8 — WEATHER-ADJUSTED UNEXPLAINED DEVIATION

The model should represent:

```text
observed deviation
after accounting for weather
```

The primary implementation is simply:

```text
weather-aware expected consumption
```

followed by:

```text
relative energy gap
```

This is preferable to building a second unnecessarily complicated weather model.

---

# 78. WEATHER EXPLANATION SCORE

Optional explicit feature:

```text
weather_explanation_score
```

Interpretation:

```text
higher
=
weather provides stronger explanation for the observed change
```

or, preferably for classifier consistency:

```text
weather_unexplained_score
```

where:

```text
higher
=
less of the deviation is explained by weather
```

Choose one convention and document it.

---

# 79. WEATHER UNEXPLAINED SCORE

One possible implementation:

Compare:

```text
consumption change
```

against:

```text
expected weather-driven consumption change
```

and normalize the mismatch.

Do not claim causal inference.

This is simply a model-derived contextual signal.

---

# 80. WEATHER SHOULD REDUCE FALSE POSITIVES

Example:

```text
temperature suddenly drops
+
heating-related consumption increases
```

This may be normal.

A weather-aware expected model should increase expected consumption accordingly.

Then:

```text
actual ≈ expected
```

and:

```text
risk signal decreases
```

---

# 81. CATEGORY K — VOLATILITY

Volatility helps interpret changes.

Create:

```text
rolling_std_7d
rolling_std_30d
coefficient_of_variation
```

where appropriate.

---

# 82. COEFFICIENT OF VARIATION

Definition:

```text
CV =
standard deviation / mean
```

Use:

```text
max(mean, epsilon)
```

to avoid division by zero.

---

# 83. WHY VOLATILITY MATTERS

A:

```text
50% drop
```

in a household whose consumption normally varies by:

```text
±5%
```

is very different from a household whose consumption naturally varies by:

```text
±50%
```

The classifier can use volatility to contextualize the drop.

---

# 84. CATEGORY L — TREND

Create:

```text
trend_7d
trend_30d
trend_90d
```

using a leakage-safe regression slope or difference between historical means.

---

# 85. TREND CALCULATION

Simple option:

```text
recent_mean - older_mean
```

Example:

```text
recent_7d_mean
-
previous_7d_mean
```

More sophisticated:

```text
linear regression slope
```

over the historical window.

---

# 86. TREND NORMALIZATION

Optional:

```text
normalized_trend =
trend / max(historical_mean, epsilon)
```

This makes trends comparable across account scales.

---

# 87. CATEGORY M — SEASONAL DEVIATION

A strong feature is:

```text
current consumption
relative to same-season historical behaviour
```

Possible features:

```text
same_month_mean
same_month_deviation
same_weekday_mean
same_weekday_deviation
```

All historical calculations must stop at the prediction cutoff.

---

# 88. SEASONAL BASELINE

Example:

For:

```text
July 2025
```

the seasonal baseline may use prior Julys:

```text
July 2024
July 2023
```

if those observations are available.

Do not use:

```text
July 2026
```

when predicting July 2025.

---

# 89. CATEGORY N — PEER DEVIATION

Optional.

If account metadata exists, group similar accounts using legitimate non-target variables.

Potential peer features:

```text
peer_mean
peer_median
peer_std
peer_percentile
peer_deviation
```

---

# 90. PEER GROUP LEAKAGE RULE

Peer groups must be built without using:

```text
FLAG
```

or future target information.

Do not create clusters based on theft labels.

---

# 91. PEER DEVIATION

Definition:

```text
peer_deviation =
account_value - peer_median
```

or normalized:

```text
(account_value - peer_median)
/
max(peer_median, epsilon)
```

This adds population context.

---

# 92. WHY PEER FEATURES ARE OPTIONAL

They can improve detection, but they introduce:

```text
peer definition complexity
```

and:

```text
potential leakage
```

If the core pipeline is already strong:

```text
do not delay the submission for peer clustering
```

---

# 93. FEATURE GROUP SUMMARY

The feature matrix can contain:

```text
HISTORICAL
├── lags
├── rolling means
├── rolling std
├── rolling median
├── trend
└── volatility

CALENDAR
├── day_of_week
├── weekend
├── month
├── season
└── cyclic encodings

MISSINGNESS
├── missing rate
├── missing streak
├── longest streak
├── missingness change
└── missingness around change

EXPECTED
├── expected consumption
├── residual
├── absolute deviation
└── relative gap

PERSISTENCE
├── anomalous days
├── persistence days
└── negative residual ratio

CHANGE
├── CUSUM
├── change point
├── days since change
├── pre mean
├── post mean
├── change strength
└── drop magnitude

DEFICIT
├── energy gap
├── cumulative deficit
├── deficit rate
└── deficit days

WEATHER
├── temperature
├── rainfall
├── humidity
└── weather unexplained score

OPTIONAL PEER
├── peer deviation
└── peer percentile
```

---

# 94. FEATURE NAMING STANDARD

Use lowercase snake_case.

Good:

```text
rolling_mean_30d
gap_percentage
drop_magnitude
missingness_change
cusum_score
```

Bad:

```text
Gap%
DropFeature
Feature1
X7
```

Every feature name should communicate what it represents.

---

# 95. FEATURE METADATA

Create:

```text
artifacts/feature_dictionary.csv
```

Columns:

```text
feature_name
category
definition
window
direction
requires_weather
requires_expected_model
requires_change_point
missing_policy
leakage_notes
```

---

# 96. FEATURE DIRECTION

For every feature, document whether:

```text
higher generally means more suspicious
```

or:

```text
higher generally means less suspicious
```

or:

```text
direction is context-dependent
```

Examples:

```text
relative_energy_gap
higher → generally more suspicious

persistence_days
higher → generally more suspicious

weather_explanation_score
higher → generally less suspicious

volatility
context-dependent
```

---

# 97. FEATURE COUNT

Do not chase a huge feature count.

A sensible first final matrix may contain:

```text
30–80 engineered features
```

depending on the actual data.

The exact number should be determined empirically.

---

# 98. FEATURE REDUNDANCY

Some features will be strongly correlated.

For example:

```text
energy_gap
relative_energy_gap
cumulative_deficit
```

are related but not identical.

Tree models can handle correlated features reasonably well, but remove obviously useless duplicates if they add no value.

---

# 99. FEATURE ABLATION

The feature pipeline must support group removal.

Example:

```text
USE_HISTORICAL = True
USE_MISSINGNESS = True
USE_CHANGE = True
USE_WEATHER = True
USE_PEER = False
```

This makes experiments reproducible.

---

# 100. FEATURE ABLATION EXPERIMENT

Run:

```text
Baseline
```

then:

```text
Baseline + Expected/Residual
```

then:

```text
+ Persistence
```

then:

```text
+ Change point
```

then:

```text
+ Deficit
```

then:

```text
+ Missingness
```

then:

```text
+ Weather
```

This shows exactly where performance comes from.

---

# 101. FEATURE IMPORTANCE EXPECTATION

Do not assume the eight core features will all rank highest.

Let the model determine importance.

The important question is:

```text
Do they improve validation performance and provide defensible explanations?
```

---

# 102. FEATURE INTERACTIONS

Important interactions may include:

```text
large gap
+
high persistence

large drop
+
strong change point

large gap
+
low weather explanation

large deficit
+
stable historical baseline

drop
+
missingness increase
```

Tree-based models can learn these interactions automatically.

Do not manually multiply every pair of features.

---

# 103. DO NOT CREATE A GIANT INTERACTION MATRIX

Avoid:

```text
feature1 × feature2
feature1 × feature3
...
```

for every feature.

This creates:

```text
noise
redundancy
overfitting
```

Let the tree model handle nonlinear interactions.

---

# 104. FEATURE TRANSFORMATIONS

Useful transformations:

```text
log1p(cumulative_deficit)
log1p(energy_gap)
```

may be tested for heavily skewed variables.

Do not apply transformations blindly.

Tree models often do not require them.

---

# 105. WINSORIZATION

Optional for extreme values.

If a feature contains extreme outliers:

```text
winsorize using training-derived quantiles
```

Do not calculate clipping thresholds using the test period.

---

# 106. INF HANDLING

After feature construction:

```text
replace +inf
replace -inf
```

with:

```text
NaN
```

then handle NaN using the model's supported missing-value behaviour or a training-fitted imputation strategy.

---

# 107. NAN HANDLING

Do not replace every NaN with:

```text
0
```

unless zero has a legitimate semantic meaning.

For example:

```text
days_since_change
```

with no detected change is not naturally:

```text
0
```

It may require:

```text
missing indicator
+
defined fallback
```

---

# 108. MISSING FEATURE INDICATORS

For features where missingness itself matters, create:

```text
feature_name_is_missing
```

Example:

```text
change_point_date_missing
```

or:

```text
pre_change_mean_missing
```

This lets the classifier distinguish:

```text
true zero
```

from:

```text
unavailable
```

---

# 109. ACCOUNT HISTORY LENGTH

Create:

```text
history_days
valid_reading_days
```

These are important quality/context features.

An account with:

```text
900 valid days
```

provides more evidence than:

```text
40 valid days
```

---

# 110. VALID READING RATIO

Create:

```text
valid_reading_ratio
```

Definition:

```text
valid observations / expected observations
```

This summarizes data quality.

---

# 111. RECENT DATA QUALITY

Create:

```text
valid_ratio_30d
valid_ratio_60d
```

This is more useful than only an all-history missingness rate.

---

# 112. RECENT VS HISTORICAL MISSINGNESS

Create:

```text
recent_missing_rate
historical_missing_rate
missingness_change
```

The difference can reveal changes in the measurement process.

---

# 113. FEATURE #7 — MISSINGNESS BEHAVIOUR SHIFT

The primary feature:

```text
missingness_change
```

should compare:

```text
missing rate after candidate change
```

against:

```text
missing rate before candidate change
```

This is a behavioural data-quality signal.

---

# 114. MISSINGNESS FEATURE CAUTION

The classifier must not learn:

```text
missing = theft
```

because missingness can be caused by infrastructure problems.

Use multiple features and validation.

---

# 115. CHANGE POINT + DEFICIT

A useful combined representation is:

```text
days_since_change
+
drop_magnitude
+
cumulative_deficit
```

This describes:

```text
when
+
how much
+
for how long
```

the behaviour changed.

---

# 116. CHANGE POINT + PERSISTENCE

Another useful combination:

```text
change_point_strength
+
persistence_days
```

A strong change point followed by a persistent low-consumption period is more informative than either alone.

---

# 117. GAP + WEATHER

Another key interaction:

```text
relative_energy_gap
+
weather_unexplained_score
```

Interpretation:

```text
large gap
+
little weather explanation
=
stronger unexplained anomaly
```

---

# 118. GAP + VOLATILITY

If:

```text
relative_gap = large
```

but:

```text
historical volatility = huge
```

the anomaly may be less convincing.

The classifier can learn this interaction.

---

# 119. DROP + BASELINE STABILITY

Create:

```text
baseline_stability
```

such as:

```text
1 / max(rolling_std, epsilon)
```

or use the raw:

```text
rolling_std
```

and:

```text
drop_magnitude
```

together.

---

# 120. EXPECTED MODEL CONFIDENCE

If the expected-consumption model can provide an uncertainty estimate, optionally create:

```text
expected_uncertainty
```

Then:

```text
standardized_residual =
(actual - expected)
/
max(expected_uncertainty, epsilon)
```

This is a strong stretch feature.

---

# 121. UNCERTAINTY FEATURE CAUTION

Do not invent uncertainty.

If the expected model does not produce reliable uncertainty estimates:

```text
skip it
```

The standard residual/gap system is sufficient.

---

# 122. QUANTILE FORECASTING

Optional advanced approach:

Train quantile models for:

```text
lower expected
median expected
upper expected
```

Then define:

```text
outside_expected_range
```

This can distinguish:

```text
ordinary variation
```

from:

```text
statistically unusual deviation
```

---

# 123. QUANTILE MODEL PRIORITY

Quantile forecasting is a stretch feature.

Priority order:

```text
expected mean
>
residual
>
gap
>
persistence
>
change point
>
deficit
>
weather
>
quantile uncertainty
```

---

# 124. FEATURE GENERATION ORDER

Build features in this exact dependency order:

```text
1. Raw history
2. Missingness
3. Calendar
4. Lags
5. Rolling statistics
6. Expected-consumption prediction
7. Residual
8. Energy gap
9. Relative gap
10. Persistence
11. CUSUM
12. Change point
13. Pre/post statistics
14. Drop magnitude
15. Cumulative deficit
16. Missingness around change
17. Weather explanation
18. Optional peer features
19. Account aggregation
20. Feature validation
```

---

# 125. FEATURE GENERATION MUST BE MODULAR

Create:

```text
src/features/
```

with modules such as:

```text
historical.py
calendar.py
missingness.py
forecast.py
residual.py
persistence.py
change_point.py
deficit.py
weather.py
peer.py
aggregate.py
validation.py
```

---

# 126. HISTORICAL MODULE

Create:

```text
src/features/historical.py
```

Functions:

```python
add_lag_features(...)
add_rolling_features(...)
add_trend_features(...)
add_volatility_features(...)
```

---

# 127. CALENDAR MODULE

Create:

```text
src/features/calendar.py
```

Functions:

```python
add_calendar_features(...)
add_weekday_features(...)
add_seasonal_features(...)
```

---

# 128. MISSINGNESS MODULE

Create:

```text
src/features/missingness.py
```

Functions:

```python
add_missingness_features(...)
calculate_missing_streaks(...)
calculate_missingness_change(...)
```

---

# 129. FORECAST MODULE

Create:

```text
src/features/forecast.py
```

Responsibilities:

```text
load expected-consumption model
generate expected consumption
align predictions to dates
```

---

# 130. RESIDUAL MODULE

Create:

```text
src/features/residual.py
```

Functions:

```python
add_residual_features(...)
calculate_energy_gap(...)
calculate_relative_gap(...)
```

---

# 131. PERSISTENCE MODULE

Create:

```text
src/features/persistence.py
```

Functions:

```python
detect_anomalous_days(...)
calculate_persistence(...)
calculate_anomaly_counts(...)
```

---

# 132. CHANGE-POINT MODULE

Create:

```text
src/features/change_point.py
```

Functions:

```python
calculate_cusum(...)
detect_change_point(...)
calculate_pre_post_stats(...)
calculate_drop_magnitude(...)
```

---

# 133. DEFICIT MODULE

Create:

```text
src/features/deficit.py
```

Functions:

```python
calculate_daily_deficit(...)
calculate_cumulative_deficit(...)
calculate_deficit_rate(...)
```

---

# 134. WEATHER MODULE

Create:

```text
src/features/weather.py
```

Functions:

```python
merge_weather(...)
add_weather_features(...)
calculate_weather_explanation(...)
```

Only activate this module if weather data exists.

---

# 135. PEER MODULE

Create:

```text
src/features/peer.py
```

Optional.

Functions:

```python
build_peer_groups(...)
calculate_peer_deviation(...)
```

---

# 136. AGGREGATION MODULE

Create:

```text
src/features/aggregate.py
```

This module converts:

```text
daily feature rows
```

into:

```text
account-level snapshot features
```

---

# 137. FEATURE SNAPSHOT

The classifier should receive a feature vector representing:

```text
all evidence available up to cutoff
```

Example:

```text
CONS_NO
cutoff_date

recent_mean
recent_std

relative_gap
persistence_days

change_point
days_since_change
drop_magnitude

cumulative_deficit

missingness_change

weather_unexplained_score
```

---

# 138. ACCOUNT-LEVEL AGGREGATION

For each account, calculate statistics over defined windows:

```text
7d
30d
60d
90d
```

and potentially:

```text
all available history
```

only when the prediction design permits it.

---

# 139. WINDOW NAMING

Use explicit names.

Good:

```text
relative_gap_mean_30d
relative_gap_max_30d
cumulative_deficit_90d
missing_rate_30d
```

Bad:

```text
gap_mean
gap_max
missingness
```

The window should be obvious.

---

# 140. AGGREGATION TYPES

Useful aggregations:

```text
mean
median
std
min
max
quantile
count
sum
ratio
trend
```

Do not create every aggregation for every feature.

Only keep meaningful ones.

---

# 141. RECENT VS LONG-TERM

A strong account representation compares:

```text
recent behaviour
```

against:

```text
long-term behaviour
```

Examples:

```text
recent_mean / historical_mean
recent_std / historical_std
recent_missing_rate - historical_missing_rate
```

---

# 142. RECENT MEAN SHIFT

Create:

```text
recent_mean_shift
```

Example:

```text
recent_30d_mean
-
previous_90d_mean
```

and optionally:

```text
normalized_recent_mean_shift
```

---

# 143. NORMALIZED SHIFT

Definition:

```text
normalized_shift =
(recent_mean - historical_mean)
/
max(abs(historical_mean), epsilon)
```

This makes accounts with different consumption scales comparable.

---

# 144. ACCOUNT-SPECIFIC BASELINES

Where possible, prefer:

```text
account's own historical baseline
```

over:

```text
global population mean
```

because household consumption varies greatly.

---

# 145. GLOBAL FEATURES

Population-level features can still help:

```text
account percentile
peer deviation
```

but they should supplement the self-baseline.

---

# 146. ROBUST BASELINE

For accounts with strong outliers, use:

```text
median
```

or:

```text
trimmed mean
```

for some descriptive features.

---

# 147. OUTLIER HANDLING

Do not automatically remove every extreme consumption value.

An extreme value can be:

```text
legitimate
```

or:

```text
data corruption
```

The expected model and robust statistics should handle many such cases.

---

# 148. NEGATIVE VALUES

If negative values exist:

```text
inspect first
```

Then determine whether:

```text
they are valid domain values
```

or:

```text
data errors
```

The feature pipeline must not silently turn them into zero.

---

# 149. ZERO VALUES

Zero can be valid.

Do not define:

```text
zero = theft
```

Instead:

```text
zero consumption
```

becomes an input observation.

Context determines whether it is suspicious.

---

# 150. FEATURE QUALITY FLAGS

Create optional flags:

```text
low_history_flag
high_missingness_flag
insufficient_change_history_flag
```

These help the model understand evidence quality.

---

# 151. LOW HISTORY FLAG

Example:

```text
low_history_flag = 1
```

when:

```text
valid_reading_days < minimum_required_history
```

The threshold must be documented.

---

# 152. HIGH MISSINGNESS FLAG

Example:

```text
high_missingness_flag = 1
```

when recent missingness exceeds a training-derived threshold.

Do not treat this as theft evidence by itself.

---

# 153. INSUFFICIENT CHANGE HISTORY

If no reliable change point can be calculated:

```text
change_point_missing = 1
```

rather than:

```text
change_point = 0
```

---

# 154. FEATURE RELIABILITY

Every feature should have an implicit evidence-quality context.

For example:

```text
relative_gap = 0.70
```

is more trustworthy when:

```text
expected model confidence is high
```

and:

```text
30/30 days have valid readings
```

This motivates:

```text
valid_reading_ratio
+
history_days
```

features.

---

# 155. FINAL FEATURE TABLE

The feature table should resemble:

```text
CONS_NO
cutoff_date

history_days
valid_reading_days
valid_reading_ratio

recent_mean_7d
recent_mean_30d
rolling_std_30d
trend_30d

weekday_mean
weekend_mean
weekday_weekend_ratio

missing_rate_7d
missing_rate_30d
longest_missing_streak
missingness_change

expected_consumption
residual
relative_energy_gap

negative_residual_ratio
persistence_days
anomalous_days_30d

cusum_score
change_point_strength
days_since_change

pre_change_mean
post_change_mean
drop_magnitude

cumulative_deficit_30d
cumulative_deficit_60d
cumulative_deficit_90d
deficit_rate

temperature
humidity
rainfall
weather_unexplained_score
```

---

# 156. CORE EIGHT FEATURE TABLE

The eight headline features should be explicitly available:

| # | Feature | What it answers | Suspicion direction |
|---|---|---|---|
| 1 | Expected consumption deviation | How far is actual usage from the learned personal baseline? | Larger negative residual generally more suspicious |
| 2 | Relative energy gap | How large is the deficit relative to expected usage? | Higher generally more suspicious |
| 3 | Persistent deviation | Does the unusual deficit continue over multiple days? | Higher generally more suspicious |
| 4 | Drop magnitude | How large was the before/after behavioural drop? | Larger downward drop generally more suspicious |
| 5 | Change-point evidence | Is there a statistically meaningful behavioural shift? | Stronger unexplained shift generally more suspicious |
| 6 | Cumulative consumption deficit | How much model-estimated deficit accumulated? | Higher generally more suspicious |
| 7 | Missingness behaviour shift | Did the measurement/missingness pattern change around the behavioural shift? | Context-dependent, supporting signal |
| 8 | Weather-adjusted unexplained deviation | Does weather plausibly explain the observed deviation? | More unexplained deviation generally more suspicious |

---

# 157. FEATURE #1 IMPLEMENTATION

Name:

```text
expected_deviation
```

Primary form:

```text
actual - expected
```

Additional:

```text
absolute_deviation
```

Use:

```text
expected_deviation
```

for direction.

---

# 158. FEATURE #2 IMPLEMENTATION

Name:

```text
relative_energy_gap
```

Formula:

```text
(expected - actual) / max(expected, epsilon)
```

Higher positive values:

```text
larger relative deficit
```

---

# 159. FEATURE #3 IMPLEMENTATION

Name:

```text
persistence_days
```

Definition:

```text
current consecutive run of anomalous negative deviations
```

with anomaly threshold determined from training/validation.

---

# 160. FEATURE #4 IMPLEMENTATION

Name:

```text
drop_magnitude
```

Formula:

```text
(pre_change_mean - post_change_mean)
/
max(pre_change_mean, epsilon)
```

---

# 161. FEATURE #5 IMPLEMENTATION

Represent change-point evidence with:

```text
cusum_score
change_point_strength
days_since_change
```

The classifier can combine these.

Do not reduce everything to one arbitrary change score.

---

# 162. FEATURE #6 IMPLEMENTATION

Names:

```text
cumulative_deficit_30d
cumulative_deficit_60d
cumulative_deficit_90d
```

Formula:

```text
sum(max(expected - actual, 0))
```

---

# 163. FEATURE #7 IMPLEMENTATION

Name:

```text
missingness_change
```

Formula concept:

```text
missing_rate_after
-
missing_rate_before
```

Use the detected change point to define before/after windows.

---

# 164. FEATURE #8 IMPLEMENTATION

Primary representation:

```text
weather-aware expected_consumption
+
relative_energy_gap
```

Optional explicit:

```text
weather_unexplained_score
```

The model should use weather as context, not as a direct theft label.

---

# 165. FEATURE COMPUTATION PSEUDOCODE

Conceptual pipeline:

```python
df = load_long_data()

df["is_missing"] = df["consumption"].isna()

df = add_calendar_features(df)

df = add_lag_features(df)

df = add_rolling_features(df)

df = add_missingness_features(df)

expected = expected_model.predict(df[forecast_features])

df["expected_consumption"] = expected

df = add_residual_features(df)

df = add_persistence_features(df)

df = add_change_point_features(df)

df = add_deficit_features(df)

df = add_weather_features(df)

account_features = aggregate_to_snapshot(df)
```

---

# 166. IMPORTANT: FEATURE GENERATION DEPENDENCIES

Do not calculate:

```text
change point
```

before:

```text
residual
```

because the change detector should preferably operate on unexplained deviations.

Do not calculate:

```text
relative gap
```

before:

```text
expected consumption
```

Do not calculate:

```text
missingness change around change point
```

before:

```text
change point
```

---

# 167. TEMPORAL FEATURE GENERATION

For every cutoff:

```text
C
```

the feature generator must only see:

```text
date <= C
```

when constructing the account snapshot.

This is the most important leakage rule in the feature pipeline.

---

# 168. TRAIN/VALIDATION/TEST FEATURE GENERATION

Preferred:

```text
TRAIN FEATURES
built using training-period information

VALIDATION FEATURES
built using information available before each validation prediction

TEST FEATURES
built using information available before the test prediction
```

Do not build one giant feature table using the entire dataset and then split it if that operation can incorporate future information.

---

# 169. SAFE GLOBAL STATISTICS

Global statistics such as:

```text
population mean
population quantile
anomaly threshold
```

must be learned on:

```text
training data
```

and applied to:

```text
validation/test
```

---

# 170. ACCOUNT-SPECIFIC STATISTICS

Account-specific historical features are safe when calculated only from:

```text
past data relative to the cutoff
```

They become leakage when they include:

```text
future observations
```

---

# 171. FEATURE PIPELINE MODES

Implement:

```text
mode="train"
mode="validation"
mode="test"
mode="inference"
```

This makes data boundaries explicit.

---

# 172. TRAIN MODE

Train mode may:

```text
fit thresholds
fit baseline statistics
fit transformations
fit clustering if used
```

using only training data.

---

# 173. VALIDATION MODE

Validation mode:

```text
loads training-fitted parameters
```

and:

```text
does not refit them using validation labels
```

---

# 174. TEST MODE

Test mode:

```text
loads all previously fitted parameters
```

and:

```text
does not learn anything from test labels
```

---

# 175. INFERENCE MODE

Inference mode must behave like real deployment:

```text
new account history
+
known historical context
→ features
→ risk score
```

No access to future values.

---

# 176. FEATURE STORE

Save the final feature table:

```text
data/processed/account_features.parquet
```

if the data size allows.

For very large data:

```text
partition by time
```

or:

```text
partition by account batches
```

---

# 177. FEATURE VERSIONING

Store:

```text
feature_version
```

with the feature table.

Example:

```text
feature_version = "v001"
```

When formulas change:

```text
v002
```

---

# 178. FEATURE CONFIG

Create:

```text
configs/features.yaml
```

Example:

```yaml
windows:
  short: 7
  medium: 30
  long: 90

lags:
  - 1
  - 7
  - 14
  - 30

change_detection:
  method: cusum

use_weather: true
use_peer_features: false

epsilon: 0.000001
```

The exact values can be tuned.

---

# 179. FEATURE THRESHOLDS

Any threshold must be configurable.

Examples:

```text
anomaly threshold
CUSUM threshold
high missingness threshold
low history threshold
```

Do not bury thresholds inside code.

---

# 180. THRESHOLD FITTING

If a threshold is data-derived:

```text
fit on training
```

then:

```text
freeze
```

for validation/test.

Save it:

```text
artifacts/feature_thresholds.json
```

---

# 181. FEATURE VALIDATION REPORT

Create:

```text
artifacts/feature_validation.json
```

Report:

```text
feature count
NaN percentage
inf count
min
max
median
mean
std
```

---

# 182. FEATURE CORRELATION

Create a correlation report for numeric features.

Use it for:

```text
debugging
redundancy inspection
```

not as an automatic feature-removal rule.

---

# 183. FEATURE IMPORTANCE VS CORRELATION

Do not remove a feature merely because it is correlated with another.

Tree models can still use one feature more effectively in certain splits.

Use:

```text
validation ablation
+
feature importance
```

to decide.

---

# 184. FEATURE STABILITY

Compare feature distributions between:

```text
train
validation
test
```

Look for:

```text
major distribution shift
```

especially in:

```text
relative_energy_gap
drop_magnitude
missingness_change
cumulative_deficit
```

---

# 185. DISTRIBUTION SHIFT

A test distribution shift does not automatically mean the model is wrong.

But it should be reported.

Example:

```text
training missing_rate_30d median = X
test missing_rate_30d median = Y
```

---

# 186. FEATURE CLIPPING

If a feature has extreme tails:

```text
inspect first
```

Then decide whether:

```text
log transform
clipping
robust scaling
```

is justified.

Do not clip just to make plots look pretty.

---

# 187. FEATURE SCALING

For LightGBM/XGBoost:

```text
no scaling required
```

Keep raw feature meanings where possible.

---

# 188. FEATURE ENGINEERING UNIT TESTS

At minimum test:

```text
lag
rolling mean
missing rate
missing streak
relative gap
energy gap
drop magnitude
persistence
CUSUM
cumulative deficit
```

---

# 189. LAG TEST

Input:

```text
10
20
30
```

Expected:

```text
lag_1d on third observation = 20
```

---

# 190. GAP TEST

Input:

```text
expected = 10
actual = 6
```

Expected:

```text
energy_gap = 4
relative_energy_gap = 0.4
```

---

# 191. DROP TEST

Input:

```text
pre = 20
post = 10
```

Expected:

```text
drop_magnitude = 0.5
```

---

# 192. DEFICIT TEST

Input:

```text
expected = [10, 10, 10]
actual = [7, 12, 6]
```

Expected:

```text
daily deficits = [3, 0, 4]
cumulative = 7
```

---

# 193. MISSINGNESS TEST

Input:

```text
valid
missing
missing
valid
```

Expected:

```text
missing_count = 2
missing_streak = 2
```

---

# 194. PERSISTENCE TEST

Input anomaly sequence:

```text
0
1
1
1
0
```

Expected current run after final observation:

```text
0
```

At the third anomalous observation:

```text
persistence = 3
```

---

# 195. CHANGE-POINT TEST

Create a synthetic sequence:

```text
10, 11, 10, 9, 10
```

followed by:

```text
5, 4, 6, 5, 4
```

The change detector should identify a substantial downward shift.

This is a sanity test, not a guarantee of exact change-point location.

---

# 196. WEATHER TEST

If:

```text
temperature
```

is absent:

```text
weather features must not crash the pipeline
```

The pipeline should disable weather features gracefully.

---

# 197. PEER TEST

If:

```text
peer features
```

are disabled:

```text
classifier must still run
```

The core system cannot depend on optional peer features.

---

# 198. FEATURE FALLBACKS

Every optional feature group should have a fallback.

Example:

```text
weather unavailable
→ train without weather

peer data unavailable
→ train without peer features

change point unavailable
→ use missing indicators
```

Do not fabricate values.

---

# 199. FEATURE AVAILABILITY FLAGS

Optional feature groups should log:

```text
weather_enabled
peer_enabled
change_detection_enabled
```

in:

```text
training_run.json
```

---

# 200. FEATURE DATASET VERSION

The final account feature table should contain:

```text
feature_version
```

and:

```text
cutoff_date
```

where applicable.

---

# 201. FINAL ACCOUNT FEATURE SCHEMA

Minimum:

```text
CONS_NO
cutoff_date
FLAG

history_days
valid_reading_days
valid_reading_ratio

recent_mean_7d
recent_mean_30d
rolling_std_30d
trend_30d

missing_rate_7d
missing_rate_30d
longest_missing_streak
missingness_change

expected_consumption
expected_deviation
relative_energy_gap

negative_residual_ratio
persistence_days
anomalous_days_30d

cusum_score
change_point_strength
days_since_change

pre_change_mean
post_change_mean
drop_magnitude

cumulative_deficit_30d
cumulative_deficit_60d
cumulative_deficit_90d
deficit_rate

weather_unexplained_score
```

Additional:

```text
calendar
weekday
season
peer
volatility
```

can be added as supported.

---

# 202. FLAG MUST NOT ENTER FEATURES

The final feature dataframe can contain:

```text
FLAG
```

for evaluation/training target purposes.

But before:

```text
X = feature_df[feature_columns]
```

make sure:

```text
FLAG not in feature_columns
```

---

# 203. CONS_NO MUST NOT ENTER MODEL FEATURES

Keep:

```text
CONS_NO
```

for:

```text
identification
joining
output
ranking
```

but exclude it from:

```text
X
```

---

# 204. CUTOFF_DATE MUST BE HANDLED CAREFULLY

A raw:

```text
cutoff_date
```

should not automatically be used as a predictive feature.

Derived calendar features may be used.

The date itself is primarily metadata for enforcing temporal correctness.

---

# 205. FEATURE TABLE EXAMPLE

Conceptually:

```text
CONS_NO | cutoff_date | relative_energy_gap | persistence_days | drop_magnitude
A001    | 2025-01-01  | 0.04                | 0                | 0.02
A002    | 2025-01-01  | 0.61                | 18               | 0.54
A003    | 2025-01-01  | 0.08                | 1                | 0.03
```

The classifier can learn:

```text
A002
```

contains a much stronger combination of suspicious evidence.

---

# 206. FEATURE INTERPRETABILITY CONTRACT

For every suspicious account, the feature layer should be able to answer:

```text
What changed?
When did it change?
How large was the change?
How long did it persist?
How far below expected was usage?
How much deficit accumulated?
Did missingness change?
Can weather explain it?
```

This contract is important for the later UI and LLM layers.

---

# 207. FEATURE EXPLANATION PAYLOAD

Save a separate table:

```text
predictions/investigation_features.csv
```

with the most useful human-readable features.

Minimum:

```text
CONS_NO
risk_score
rank
change_point_date
days_since_change
expected_consumption
actual_consumption
energy_gap
relative_energy_gap
drop_magnitude
persistence_days
cumulative_deficit
cusum_score
missingness_change
weather_unexplained_score
```

---

# 208. TOP-K EXPLANATION FEATURES

For top-ranked accounts, preserve:

```text
rank
risk_score
```

and the core eight features.

This makes later reporting much easier.

---

# 209. DO NOT PRE-COMBINE THE EIGHT FEATURES INTO A HAND-WEIGHTED SCORE

Do not do:

```text
0.3 × gap
+
0.2 × persistence
+
...
```

unless explicitly tested.

Let the classifier learn the relationships.

The eight features are evidence dimensions, not an arbitrary human scoring formula.

---

# 210. OPTIONAL HUMAN SCORE

If the UI later needs a simple explanation score:

```text
model risk score
```

should remain separate from:

```text
human-readable evidence indicators
```

Do not replace the trained model with a hand-built score.

---

# 211. FEATURE IMPORTANCE OUTPUT

After training, export:

```text
artifacts/feature_importance.csv
```

Columns:

```text
feature
importance
importance_type
```

If using SHAP:

```text
mean_abs_shap
```

can be added.

---

# 212. SHAP FEATURE EXPLANATIONS

Optional.

For an account:

```text
relative_energy_gap = high
persistence_days = high
drop_magnitude = high
weather_unexplained_score = high
```

SHAP can show how those values moved the prediction.

Do not interpret SHAP as causality.

---

# 213. FEATURE ENGINEERING PERFORMANCE

The feature pipeline should avoid expensive Python loops over every account/day where vectorized Pandas/NumPy operations are possible.

Prefer:

```text
groupby
shift
rolling
transform
numpy
```

over:

```text
for each account:
    for each date:
        ...
```

when practical.

---

# 214. CUSUM PERFORMANCE

CUSUM may require sequential processing per account.

That is acceptable.

But keep the implementation:

```text
simple
vectorized where possible
```

and avoid unnecessary model inference inside the inner loop.

---

# 215. MEMORY MANAGEMENT

Avoid storing:

```text
raw wide dataframe
+
long dataframe
+
all feature versions
```

simultaneously if unnecessary.

Use:

```text
checkpoint
→ delete temporary object
→ continue
```

---

# 216. PARQUET

Use:

```text
Parquet
```

for intermediate feature tables.

Recommended:

```text
data/processed/meter_long.parquet
data/processed/daily_features.parquet
data/processed/account_features.parquet
```

---

# 217. FEATURE PIPELINE SCRIPT

Create:

```text
scripts/03_build_features.py
```

This script should orchestrate:

```text
load
→ missingness
→ historical
→ expected
→ residual
→ persistence
→ change
→ deficit
→ weather
→ aggregation
→ validation
→ save
```

---

# 218. OPTIONAL SEPARATE FEATURE SCRIPTS

For debugging, it is acceptable to split:

```text
03_build_historical_features.py
04_build_residual_features.py
05_build_change_features.py
```

but the final pipeline should expose one reproducible feature-building command.

---

# 219. FEATURE BUILD COMMAND

Target:

```bash
python scripts/03_build_features.py
```

with optional:

```bash
python scripts/03_build_features.py --config configs/features.yaml
```

---

# 220. FEATURE PIPELINE LOGGING

Print:

```text
Feature pipeline
================

Input rows:
Accounts:
Date range:

Missingness:
Overall missing:
Recent missing:

Historical features:
Count:

Expected model:
Loaded:

Residual features:
Created:

Change points:
Accounts with change point:

Weather:
Enabled/disabled:

Peer:
Enabled/disabled:

Final feature count:
Final account rows:
```

---

# 221. FEATURE PIPELINE CHECKPOINTS

Save after:

```text
historical
residual
change
final
```

if disk allows.

Recommended:

```text
artifacts/feature_stage_metadata/
```

---

# 222. FEATURE PIPELINE FAIL CONDITIONS

Stop if:

```text
CONS_NO missing unexpectedly
date parsing failed
duplicate account/date detected
future dates enter a feature
FLAG appears in feature columns
infinite feature values remain
expected model predictions missing unexpectedly
```

---

# 223. FEATURE PIPELINE WARNINGS

Warn if:

```text
very high missingness
short history
many accounts lack change points
weather unavailable
peer data unavailable
large train/test feature distribution shift
```

Warnings should not automatically mean failure.

---

# 224. FEATURE VALIDATION BEFORE CLASSIFIER

Before passing features to the classifier, verify:

```text
one row per account per cutoff
```

if the classifier is account-snapshot based.

Then:

```text
no duplicate CONS_NO + cutoff_date
```

---

# 225. FINAL FEATURE LEAKAGE CHECK

For a sample account, manually verify:

```text
cutoff date
```

and inspect every feature's source dates.

Example:

```text
cutoff = 2025-01-31

rolling_mean_30d
→ must end no later than 2025-01-31

lag_7d
→ must use 2025-01-24

change point
→ must be <= 2025-01-31

cumulative deficit
→ must use only dates <= cutoff
```

---

# 226. FEATURE LEAKAGE TEST WITH FUTURE SHUFFLING

A useful automated sanity test:

Take future observations:

```text
T+1 onward
```

and alter them.

Then recompute features at:

```text
T
```

The features should remain unchanged.

If they change:

```text
LEAKAGE EXISTS
```

This is an excellent test.

---

# 227. FEATURE LEAKAGE TEST PROCEDURE

For selected accounts:

```text
1. Generate features at cutoff C.
2. Save features.
3. Randomly alter consumption after C.
4. Generate features again at C.
5. Compare.
```

Expected:

```text
all cutoff-C features unchanged
```

---

# 228. FUTURE-DEPENDENCE TEST

The same principle applies to:

```text
weather
```

Do not accidentally use future weather values when generating a feature for an earlier cutoff.

---

# 229. FEATURE THRESHOLD LEAKAGE TEST

Verify that:

```text
anomaly threshold
CUSUM threshold
missingness threshold
```

are fit without:

```text
validation/test labels
```

---

# 230. FEATURE IMPORTANCE SANITY

If the top feature is:

```text
FLAG
```

the pipeline is broken.

If the top feature is:

```text
CONS_NO
```

the pipeline is broken.

If suspiciously perfect performance appears:

```text
inspect leakage immediately.
```

---

# 231. EXPECTED FEATURE IMPORTANCE STORY

A defensible story could be:

```text
relative energy gap
+
persistence
+
drop magnitude
+
change-point strength
```

are among the strongest signals.

But the actual ranking must come from the trained model.

---

# 232. FEATURE ENGINEERING PRIORITY

If time is limited, implement in this order:

```text
P0:
missingness
lags
rolling statistics
expected consumption
relative gap
persistence
drop magnitude
cumulative deficit

P1:
CUSUM/change point
missingness change
weather-aware expected model

P2:
seasonal peer deviation
uncertainty
quantile forecasts
```

---

# 233. P0 MUST WORK

The P0 feature set is enough to produce the first serious model.

Do not delay the first training run waiting for P2.

---

# 234. FIRST FEATURE EXPERIMENT

Train using:

```text
historical
+
missingness
+
expected deviation
+
relative gap
+
persistence
+
drop magnitude
+
cumulative deficit
```

Evaluate:

```text
AUC-PR
```

---

# 235. SECOND FEATURE EXPERIMENT

Add:

```text
CUSUM
+
change point
+
missingness change
```

Compare against:

```text
P0
```

---

# 236. THIRD FEATURE EXPERIMENT

Add:

```text
weather-aware expected consumption
```

Compare:

```text
P1
vs
P1 + weather
```

---

# 237. OPTIONAL FOURTH EXPERIMENT

Add:

```text
peer deviation
```

only if available.

Compare:

```text
without peer
vs
with peer
```

---

# 238. FEATURE ABLATION REPORT

Create:

```text
artifacts/feature_ablation.csv
```

Columns:

```text
experiment
feature_groups
feature_count
auc_pr
precision_at_50
precision_at_100
```

---

# 239. FEATURE ENGINEERING SUCCESS CRITERION

A feature is valuable if it provides at least one of:

```text
better validation AUC-PR
better Precision@K
better ranking stability
better explanation
better robustness
```

It does not need to be individually predictive.

---

# 240. DO NOT DELETE FEATURES PURELY ON LOW UNIVARIATE SIGNAL

A feature can be weak alone but useful in interaction.

For example:

```text
volatility
```

may not identify theft alone but can help interpret:

```text
drop magnitude
```

---

# 241. DO NOT ADD FEATURES PURELY FOR NOVELTY

Avoid:

```text
random mathematical transformations
```

with no behavioural interpretation.

Hackathon judges can smell feature soup.

---

# 242. FEATURE STORY FOR JUDGES

The feature system can be explained as:

```text
1. Learn what each household normally consumes.
2. Compare actual usage to that expectation.
3. Measure how large the deviation is.
4. Check whether it persists.
5. Detect when the behaviour changed.
6. Measure the accumulated deficit.
7. Check whether missingness changed.
8. Account for weather so legitimate environmental effects are not mistaken for theft.
```

---

# 243. WHY THIS IS BETTER THAN RAW VALUES

Raw daily values answer:

```text
How much electricity was used?
```

Our features answer:

```text
How unusual is this for this household?
How persistent is it?
When did it start?
How large is it?
How much deficit accumulated?
Could weather explain it?
Did the measurement pattern change?
```

That is the behavioural signal the classifier needs.

---

# 244. FINAL FEATURE VECTOR CONCEPT

The final vector should represent:

```text
BASELINE
+
DEVIATION
+
PERSISTENCE
+
CHANGE
+
MAGNITUDE
+
DURATION
+
DATA QUALITY
+
CONTEXT
```

---

# 245. FEATURE PIPELINE END STATE

The feature workstream is complete when:

```text
raw data
↓
daily feature table
↓
account-level snapshot
↓
feature dictionary
↓
feature validation report
↓
classifier-ready matrix
```

all exist and are reproducible.

---

# 246. REQUIRED FILES FROM THIS WORKSTREAM

Create:

```text
src/features/historical.py
src/features/calendar.py
src/features/missingness.py
src/features/forecast.py
src/features/residual.py
src/features/persistence.py
src/features/change_point.py
src/features/deficit.py
src/features/weather.py
src/features/aggregate.py
src/features/validation.py
```

Optional:

```text
src/features/peer.py
```

---

# 247. REQUIRED ARTIFACTS

Create:

```text
artifacts/feature_dictionary.csv
artifacts/feature_validation.json
artifacts/feature_thresholds.json
artifacts/feature_ablation.csv
```

---

# 248. REQUIRED DATA PRODUCTS

Create:

```text
data/processed/meter_long.parquet
data/processed/daily_features.parquet
data/processed/account_features.parquet
```

where storage permits.

---

# 249. REQUIRED INVESTIGATION PRODUCT

Create:

```text
predictions/investigation_features.csv
```

This is specifically designed for the later:

```text
UI
+
LLM
+
reporting
```

workstreams.

---

# 250. FINAL FEATURE CHECKLIST

```text
[ ] Raw consumption preserved
[ ] is_missing created before imputation
[ ] Date columns identified dynamically
[ ] Dates parsed correctly
[ ] Wide-to-long validated
[ ] lag_1d
[ ] lag_7d
[ ] lag_14d
[ ] lag_30d
[ ] rolling_mean_7d
[ ] rolling_mean_30d
[ ] rolling_std_7d
[ ] rolling_std_30d
[ ] trend
[ ] volatility
[ ] calendar features
[ ] weekday structure
[ ] missing_rate_7d
[ ] missing_rate_30d
[ ] missing_streak
[ ] longest_missing_streak
[ ] valid_reading_ratio
[ ] expected_consumption
[ ] expected_deviation
[ ] energy_gap
[ ] relative_energy_gap
[ ] negative_residual_ratio
[ ] persistence_days
[ ] anomalous_days
[ ] CUSUM
[ ] change point
[ ] change point strength
[ ] days since change
[ ] pre-change mean
[ ] post-change mean
[ ] drop magnitude
[ ] cumulative deficit
[ ] deficit rate
[ ] missingness change
[ ] weather-aware expected model if available
[ ] weather unexplained score if available
[ ] peer deviation if available
[ ] account-level aggregation
[ ] no FLAG in X
[ ] no CONS_NO in X
[ ] no future information
[ ] no infinite values
[ ] feature dictionary
[ ] feature validation
[ ] feature leakage test
[ ] feature ablation
[ ] investigation feature export
```

---

# 251. FINAL EIGHT FEATURES CHECKLIST

The eight headline features are locked as:

```text
1. Expected Consumption Deviation
2. Relative Energy Gap
3. Persistent Deviation
4. Behavioural Drop Magnitude
5. Change-Point Evidence
6. Cumulative Consumption Deficit
7. Missingness Behaviour Shift
8. Weather-Adjusted Unexplained Deviation
```

All eight must be either:

```text
implemented
```

or explicitly marked:

```text
not available because required data is absent
```

Do not fabricate them.

---

# 252. FINAL IMPLEMENTATION PHILOSOPHY

The feature pipeline should not try to prove theft mathematically.

It should construct increasingly strong evidence:

```text
normal baseline
        ↓
unexpected deviation
        ↓
large deviation
        ↓
persistent deviation
        ↓
behavioural shift
        ↓
accumulated deficit
        ↓
alternative explanations
        ↓
final model risk
```

The classifier then learns which combinations of these signals are most associated with confirmed theft labels.

---

# 253. FINAL ONE-LINE FEATURE DESCRIPTION

> We convert raw daily electricity readings into leakage-safe behavioural evidence by modelling each household's expected consumption, measuring relative deviations, persistence, change points, cumulative deficits, missingness shifts, and weather-adjusted anomalies.

---

# 254. FINAL DIRECTIVE TO ANTIGRAVITY

Implement the feature layer as reusable functions, not one giant notebook.

For every feature:

```text
define
→ compute
→ validate
→ log
→ save
```

For every threshold:

```text
fit on training
→ freeze
→ apply forward
```

For every temporal feature:

```text
verify information date
```

For every missing value:

```text
preserve missingness information
```

For every advanced feature:

```text
prove it improves validation or explanation
```

Do not add complexity simply because the feature sounds impressive.

The objective is a feature pipeline that survives:

```text
technical review
+
leakage audit
+
model evaluation
+
judge questioning
+
real investigation workflow
```

---

# 255. END STATE

The feature layer must make the final model capable of saying:

```text
"This account is suspicious because its observed consumption is substantially below its learned expectation, the deviation has persisted, a meaningful behavioural drop was detected, the estimated deficit accumulated over time, the missingness pattern changed, and the observed change is not strongly explained by available weather context."
```

That is the behavioural evidence pipeline.

The classifier converts this evidence into:

```text
risk_score
```

The later UI/LLM workstreams will convert the evidence into:

```text
human-readable investigation output
```

End of feature engineering specification.
