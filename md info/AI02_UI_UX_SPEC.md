# AI 02 — ELECTRICITY THEFT DETECTION
# UI/UX + INVESTIGATION DASHBOARD SPECIFICATION
## Version: Build 1.0
## Purpose: Turn model output into a practical investigation interface

---

# 0. PURPOSE

This file defines the UI/UX layer for the Electricity Theft Detection system.

The UI is not a decorative dashboard.

Its job is to help an investigator answer:

```text
Who should I inspect first?
Why is this account suspicious?
When did the suspicious behaviour begin?
How strong is the evidence?
Could something legitimate explain it?
What should I inspect next?
```

The UI must consume outputs from the feature and modeling pipelines.

It must not independently invent:

```text
risk scores
theft labels
change points
feature values
```

---

# 1. PRODUCT CONCEPT

The product is:

> A ranked investigation dashboard that detects behavioural changes in electricity consumption and explains why an account received a high theft-risk score.

The primary workflow is:

```text
MODEL
  ↓
RANK ACCOUNTS
  ↓
INVESTIGATOR OPENS ACCOUNT
  ↓
SEE WHY IT WAS FLAGGED
  ↓
INSPECT CONSUMPTION TIMELINE
  ↓
INSPECT CHANGE POINT
  ↓
INSPECT SUPPORTING EVIDENCE
  ↓
CHECK ALTERNATIVE EXPLANATIONS
  ↓
DECIDE WHETHER TO INVESTIGATE
```

---

# 2. WHAT MAKES THE UI DIFFERENT

Most ML dashboards stop at:

```text
Customer ID
Risk score
Prediction
```

That is not enough.

Our UI should make the central idea visible:

```text
WHEN DID THE BEHAVIOUR CHANGE?
```

and:

```text
HOW DID IT CHANGE?
```

The main investigation page should therefore revolve around:

```text
expected consumption
vs
actual consumption
```

over time.

---

# 3. CORE UI PRINCIPLE

The dashboard should never communicate:

```text
"This customer is stealing electricity."
```

Instead:

```text
"High-risk behavioural anomaly detected."
```

and:

```text
"Evidence: sustained consumption below expected baseline beginning around [date]."
```

The model predicts risk.

It does not establish guilt.

---

# 4. USER TYPES

Primary:

```text
utility investigator
```

Secondary:

```text
utility analyst
```

Optional:

```text
technical reviewer
```

The UI should remain understandable to someone who knows electricity operations but is not an ML researcher.

---

# 5. PRIMARY SCREENS

Build these screens:

```text
1. Overview Dashboard
2. Ranked Investigation Queue
3. Account Investigation View
4. Behaviour Timeline
5. Evidence / Explanation Panel
6. Model Performance View
7. Data Quality View
```

For a hackathon demo, the first three are mandatory.

The others can be secondary pages.

---

# 6. SCREEN 1 — OVERVIEW DASHBOARD

Purpose:

```text
Understand the current state of the detection system.
```

Top-level cards:

```text
Accounts screened
High-risk accounts
Top-risk score
Detected behaviour changes
Accounts with high missingness
```

Do not overload the page with 20 KPI cards.

---

# 7. OVERVIEW HERO

The main visual should communicate:

```text
"AI-powered behavioural theft screening"
```

Subheading:

```text
Detecting sustained, unexplained changes in household electricity consumption.
```

Then immediately show:

```text
Top suspicious accounts
```

---

# 8. RISK DISTRIBUTION

Show:

```text
risk score distribution
```

Useful visual:

```text
histogram
```

or:

```text
risk score bands
```

Example:

```text
Low
Medium
High
Critical
```

The bands are UI categories, not ground-truth theft categories.

---

# 9. RANKED INVESTIGATION QUEUE

This is the most important dashboard component.

Columns:

```text
Rank
Account
Risk score
Behaviour change
Persistence
Relative gap
Drop magnitude
Deficit
Missingness shift
Status
```

Example:

```text
#1
Account A001
0.97
Strong change
21 days
61%
54%
1,240 kWh
+18%
```

---

# 10. RANKING

Sort descending by:

```text
model risk score
```

Do not sort by:

```text
raw consumption
```

or:

```text
single feature
```

---

# 11. RISK SCORE

Display:

```text
0–1 probability-like model score
```

unless the model has actually been calibrated as a probability.

If it is not calibrated:

```text
Risk score
```

is safer wording than:

```text
Probability of theft
```

---

# 12. RISK BANDS

Suggested display:

```text
0.00–0.24
Low

0.25–0.49
Moderate

0.50–0.74
High

0.75–1.00
Very High
```

These are presentation bands.

Do not claim:

```text
0.90 = 90% chance of theft
```

unless calibration supports that interpretation.

---

# 13. QUEUE FILTERS

Allow filtering by:

```text
risk level
minimum persistence
minimum relative gap
change detected
high missingness
date range
investigation status
```

---

# 14. SEARCH

Search by:

```text
CONS_NO
```

The account ID must support direct lookup.

---

# 15. ACCOUNT DETAIL PAGE

When an investigator clicks an account, show:

```text
Account ID
Risk score
Rank
Detection status
Change-point date
Current persistence
Relative gap
Drop magnitude
Cumulative deficit
Missingness change
Weather explanation
```

---

# 16. ACCOUNT HEADER

Example:

```text
ACCOUNT A001

VERY HIGH RISK
Rank #3

Behavioural change detected
Approximate onset: 14 Aug 2025
```

Do not say:

```text
Theft confirmed
```

---

# 17. MAIN ACCOUNT VISUAL

The largest element should be the:

```text
actual vs expected consumption timeline
```

This is the core product differentiator.

---

# 18. ACTUAL VS EXPECTED CHART

X-axis:

```text
date
```

Y-axis:

```text
electricity consumption
```

Plot:

```text
actual consumption
expected consumption
```

Optionally:

```text
expected range
```

if uncertainty exists.

---

# 19. CHANGE-POINT MARKER

If a change point exists, mark:

```text
CHANGE DETECTED
```

at:

```text
change_point_date
```

This should visually connect the ML result to the time-series behaviour.

---

# 20. TIMELINE STORY

The investigator should be able to see:

```text
Before change:
normal behaviour

Change point:
behaviour shifts

After change:
persistent lower consumption
```

This is the most important story in the UI.

---

# 21. ACTUAL VS EXPECTED EXPLANATION

Under the chart:

```text
Observed consumption has remained below the model's expected baseline for X consecutive days.
```

Use the actual feature values.

Do not hard-code the sentence.

---

# 22. RELATIVE ENERGY GAP CARD

Show:

```text
Relative energy gap

61%
```

Explanation:

```text
Recent consumption is approximately 61% below expected consumption.
```

This should be dynamically generated.

---

# 23. PERSISTENCE CARD

Show:

```text
Persistent deviation

21 days
```

Explanation:

```text
The current below-expected pattern has persisted for 21 consecutive days.
```

---

# 24. DROP MAGNITUDE CARD

Show:

```text
Behavioural drop

54%
```

Explanation:

```text
Average consumption after the detected change is approximately 54% below the pre-change baseline.
```

---

# 25. CUMULATIVE DEFICIT CARD

Show:

```text
Estimated cumulative deficit

1,240 kWh
```

Use the word:

```text
estimated
```

because this is model-derived.

Do not display:

```text
1,240 kWh stolen
```

---

# 26. CHANGE-POINT CARD

Show:

```text
Change detected

14 Aug 2025
```

Then:

```text
Days since change: 67
```

if available.

---

# 27. MISSINGNESS CARD

Show:

```text
Missingness shift

+18 percentage points
```

Then explain:

```text
The proportion of missing readings increased around the detected behavioural change.
```

Avoid implying causation.

---

# 28. WEATHER CARD

If weather data is available:

```text
Weather explanation

Low
```

or:

```text
Weather-adjusted deviation: High
```

Use one terminology consistently.

---

# 29. WEATHER EXPLANATION

Example:

```text
Recent weather conditions do not strongly explain the observed consumption drop.
```

If weather explains it:

```text
Recent weather conditions provide a plausible explanation for part of the observed change.
```

---

# 30. EVIDENCE PANEL

Create a dedicated:

```text
Why was this account flagged?
```

panel.

It should summarize the strongest evidence.

Example:

```text
Why flagged?

1. Consumption fell substantially below expected usage.
2. The deviation persisted for 21 days.
3. A significant behavioural shift was detected around 14 Aug.
4. The estimated deficit accumulated over the following weeks.
5. Weather does not strongly explain the deviation.
```

---

# 31. EVIDENCE LANGUAGE

Use:

```text
suggests
indicates
is consistent with
provides evidence of
```

Avoid:

```text
proves
confirms
definitely stole
```

unless the utility itself supplies confirmed ground truth.

---

# 32. EVIDENCE STRENGTH

Each evidence item can have:

```text
Strong
Moderate
Weak
```

based on model-derived evidence.

But do not create arbitrary evidence weights that conflict with the classifier.

---

# 33. FEATURE CONTRIBUTION

If SHAP is implemented, show:

```text
Top factors influencing risk
```

Example:

```text
Relative energy gap       ↑
Persistence               ↑
Drop magnitude            ↑
Cumulative deficit        ↑
Weather explanation       ↓
```

Use SHAP values if available.

---

# 34. SHAP LANGUAGE

Correct:

```text
This feature contributed to the model's higher risk score.
```

Incorrect:

```text
This feature caused the theft.
```

SHAP explains model behaviour, not real-world causality.

---

# 35. MODEL SCORE VS EVIDENCE

Keep these separate.

```text
Risk score
```

answers:

```text
How strongly does the model rank this account?
```

Evidence answers:

```text
What behavioural signals are associated with the ranking?
```

---

# 36. INVESTIGATION STATUS

Allow an investigator to mark:

```text
Unreviewed
Reviewing
Needs inspection
Cleared
Confirmed
```

If the hackathon backend does not support persistence, keep this as a UI prototype state.

---

# 37. IMPORTANT STATUS DISTINCTION

Do not mix:

```text
model prediction
```

with:

```text
investigation outcome
```

Example:

```text
Model:
Very High Risk

Investigation:
Unreviewed
```

---

# 38. INVESTIGATION NOTES

Allow optional:

```text
notes
```

Example:

```text
Meter inspection required.
```

Do not send private notes to the LLM automatically unless explicitly intended.

---

# 39. TIMELINE CONTROLS

Allow:

```text
7 days
30 days
90 days
1 year
All history
```

The default should be:

```text
90 days around the detected change
```

if a change point exists.

---

# 40. BEFORE/AFTER COMPARISON

Add a toggle:

```text
Before vs After
```

Display:

```text
Pre-change average
Post-change average
Relative drop
```

This makes the behavioural shift easy to understand.

---

# 41. CUMULATIVE DEFICIT CHART

Optional secondary chart:

```text
cumulative estimated deficit
```

X-axis:

```text
date
```

Y-axis:

```text
estimated cumulative deficit
```

A suspicious persistent deviation should produce a steadily increasing deficit.

---

# 42. RESIDUAL CHART

Optional:

```text
actual - expected
```

over time.

This makes unexplained deviations visible.

---

# 43. CUSUM CHART

Advanced view:

```text
CUSUM score
```

with:

```text
detection threshold
```

This is useful for technical reviewers but should not dominate the main investigator screen.

---

# 44. MISSINGNESS TIMELINE

Optional chart:

```text
missing readings
```

over time.

Mark:

```text
change point
```

on the same timeline.

This allows investigators to see whether the measurement pattern changed around the behavioural shift.

---

# 45. WEATHER TIMELINE

If weather exists, optionally overlay:

```text
temperature
```

or show it in a synchronized chart.

The objective is:

```text
context
```

not visual clutter.

---

# 46. MULTI-SIGNAL TIMELINE

A powerful advanced UI:

```text
Consumption
Expected consumption
Residual
Missingness
Weather
Change point
```

linked on the same time axis.

Do not put everything on one chart by default.

Use tabs:

```text
Consumption
Behaviour
Data quality
Context
```

---

# 47. SCREEN 4 — MODEL PERFORMANCE

This page is for judges/technical reviewers.

Show:

```text
AUC-PR
Precision@K
Recall@K
number of positives
```

Do not lead with:

```text
accuracy
```

---

# 48. PRECISION@K

Show:

```text
Precision@50
Precision@100
```

or another justified K.

This directly answers:

```text
How useful is the ranked investigation queue?
```

---

# 49. PRECISION-RECALL CURVE

Show:

```text
Precision-Recall curve
```

with:

```text
AUC-PR
```

Clearly label the validation/test period.

---

# 50. TEMPORAL EVALUATION

Display:

```text
Train period
Validation period
Test period
```

Example:

```text
Train: earlier period
Validation: later period
Test: final unseen period
```

Use the actual dates from the run metadata.

---

# 51. WHY TEMPORAL SPLIT

Add a small explanation:

```text
Electricity behaviour is time-dependent.
A random split can place future observations from the same household into training while earlier observations appear in testing, making the evaluation unrealistically easy.
```

Keep this explanation simple.

---

# 52. BASELINE COMPARISON

Show:

```text
Baseline model
vs
Full behavioural model
```

Possible baselines:

```text
raw consumption statistics
```

or:

```text
simple rolling features
```

Then show:

```text
AUC-PR improvement
```

---

# 53. FEATURE ABLATION

Show:

```text
Baseline
+ residual
+ persistence
+ change point
+ deficit
+ missingness
+ weather
```

with:

```text
AUC-PR
```

This visually demonstrates that the extra engineering matters.

---

# 54. DATA QUALITY PAGE

Show:

```text
total readings
missing readings
missing percentage
accounts with high missingness
date range
accounts
```

---

# 55. MISSINGNESS VISUAL

Use:

```text
missingness by date
```

or:

```text
missingness distribution by account
```

This directly demonstrates that missing values were explicitly handled.

---

# 56. MODEL HEALTH

Optional:

```text
feature drift
risk score drift
missingness drift
```

between:

```text
training
validation
test
```

This is useful if judges ask about robustness.

---

# 57. RESPONSIVE DESIGN

The UI should work on:

```text
laptop
large monitor
tablet
```

The hackathon demo will probably happen on a laptop, so prioritize:

```text
1280px+
```

layouts.

---

# 58. DESKTOP LAYOUT

Recommended:

```text
Sidebar
+
Main content
```

Sidebar:

```text
Overview
Investigation Queue
Accounts
Model Performance
Data Quality
```

---

# 59. TOP NAVIGATION

Top bar:

```text
AI 02
Electricity Theft Detection

Model version
Last run
```

Optional:

```text
Data period
```

---

# 60. VISUAL HIERARCHY

The most important things should visually dominate:

```text
Risk ranking
Actual vs expected chart
Change point
Core evidence
```

Not:

```text
decorative statistics
```

---

# 61. UI COLOR SEMANTICS

Use restrained semantic colours.

Suggested:

```text
neutral → normal information
warning → suspicious
danger → high risk
positive → cleared/normal
```

Do not make the entire interface red.

If everything screams danger:

```text
nothing communicates danger
```

---

# 62. ACCESSIBILITY

Do not rely only on colour.

For risk state, include:

```text
High Risk
```

as text.

Charts should have:

```text
legends
labels
tooltips
```

---

# 63. TOOLTIP REQUIREMENTS

Every technical metric should have a tooltip.

Example:

```text
Relative Energy Gap
```

Tooltip:

```text
Difference between expected and observed consumption, normalized by expected consumption.
```

---

# 64. MODEL TERMINOLOGY

UI should translate technical terms.

Example:

```text
CUSUM
```

Display:

```text
Change detection strength
```

with tooltip:

```text
CUSUM is a statistical method used to detect sustained shifts in a signal.
```

---

# 65. TECHNICAL MODE

Optional toggle:

```text
Investigator View
Technical View
```

Investigator View:

```text
simple
```

Technical View:

```text
CUSUM
residuals
SHAP
thresholds
```

---

# 66. DEFAULT VIEW

The default should be:

```text
Investigator View
```

because the product is for prioritization and investigation, not model debugging.

---

# 67. ACCOUNT EXPLANATION GENERATION

The UI should receive structured data like:

```json
{
  "account_id": "A001",
  "risk_score": 0.97,
  "rank": 3,
  "change_point_date": "2025-08-14",
  "persistence_days": 21,
  "relative_energy_gap": 0.61,
  "drop_magnitude": 0.54,
  "cumulative_deficit_90d": 1240,
  "missingness_change": 0.18,
  "weather_unexplained_score": 0.81
}
```

Then display it.

---

# 68. UI SHOULD NOT CALCULATE MODEL LOGIC

The frontend should not independently implement:

```text
CUSUM
expected consumption
risk score
```

These belong to backend/model pipelines.

Frontend:

```text
display
filter
sort
visualize
```

---

# 69. API CONTRACT

Recommended endpoint:

```text
GET /api/accounts
```

Returns ranked accounts.

---

# 70. ACCOUNT API

Recommended:

```text
GET /api/accounts/{account_id}
```

Returns:

```text
account metadata
risk score
core features
timeline
```

---

# 71. MODEL API

Recommended:

```text
GET /api/model/metrics
```

Returns:

```text
AUC-PR
Precision@K
Recall@K
feature importance
```

---

# 72. TIMELINE API

Recommended:

```text
GET /api/accounts/{account_id}/timeline
```

Returns:

```text
date
actual
expected
residual
missing
weather
```

where available.

---

# 73. FILTER API

For large data:

```text
GET /api/accounts?risk_min=0.75&limit=100
```

Use backend filtering rather than loading everything into the browser.

---

# 74. DEMO MODE

Create a deterministic demo mode.

Example:

```text
DEMO_ACCOUNT_ID
```

or:

```text
demo=true
```

This guarantees that the presentation always opens a strong example.

---

# 75. DEMO ACCOUNT SELECTION

Choose an account that has:

```text
high risk
+
clear change point
+
large gap
+
persistent deviation
+
good chart quality
```

Do not choose an account solely because it has the highest score.

---

# 76. SECOND DEMO ACCOUNT

Prepare a contrasting account:

```text
high consumption
but low theft risk
```

This demonstrates that:

```text
high electricity usage ≠ theft
```

---

# 77. THIRD DEMO ACCOUNT

Optional:

```text
large consumption drop
but weather explains much of it
```

This demonstrates the value of contextual modelling.

---

# 78. DEMO STORY

Recommended sequence:

```text
1. Open overview.
2. Show ranked accounts.
3. Select suspicious account.
4. Show risk score.
5. Show actual vs expected chart.
6. Point to change point.
7. Show persistence.
8. Show relative gap.
9. Show cumulative deficit.
10. Show missingness shift.
11. Show weather explanation.
12. Explain that the model prioritizes investigation rather than declaring guilt.
```

---

# 79. THE "WOW" MOMENT

The key visual moment should be:

```text
normal historical consumption
        ↓
CHANGE POINT
        ↓
persistent divergence
```

The judge should understand the concept without needing an ML lecture.

---

# 80. ACCOUNT TIMELINE ANNOTATIONS

Annotate:

```text
Normal baseline
```

then:

```text
Behavioural change detected
```

then:

```text
Persistent deviation
```

This creates a visual narrative.

---

# 81. INVESTIGATION SUMMARY

At the top of the account page:

```text
Investigation Summary

The account shows a sustained decline relative to its expected consumption baseline.
A behavioural change was detected around [date].
The deviation has persisted for [X] days.
Weather explains [low/moderate/high] portion of the deviation.
```

The actual wording must be generated from structured data.

---

# 82. DO NOT OVERCLAIM

Never say:

```text
Meter tampering detected with certainty.
```

Instead:

```text
Behavioural pattern is highly suspicious and should be prioritized for inspection.
```

---

# 83. INVESTIGATION RECOMMENDATION

The model can produce:

```text
Recommended action:
Prioritize for field inspection.
```

This is a ranking recommendation, not an enforcement decision.

---

# 84. FIELD INSPECTION INFORMATION

Optional future feature:

```text
Inspection checklist
```

Possible items:

```text
Check meter enclosure
Check meter communication
Check wiring
Check seal integrity
Verify recent meter replacement
```

Only include operational checks approved by the utility context.

---

# 85. NO AUTOMATIC ENFORCEMENT

The dashboard must not automatically:

```text
disconnect service
issue accusation
generate legal allegation
```

The model is a decision-support system.

---

# 86. REPORT BUTTON

Add:

```text
Generate Investigation Report
```

This will connect to the later LLM/reporting layer.

The UI should send:

```text
account ID
risk score
core features
timeline summary
model metadata
```

---

# 87. REPORT INPUT

Do not send the entire raw dataset to the LLM.

Send only:

```text
structured evidence
```

plus:

```text
relevant timeline excerpt
```

This is faster and safer.

---

# 88. EXPORT

Allow:

```text
Export CSV
```

for ranked accounts.

Optional:

```text
Export investigation report
```

later.

---

# 89. RANKED CSV

Columns:

```text
rank
CONS_NO
risk_score
change_point_date
persistence_days
relative_energy_gap
drop_magnitude
cumulative_deficit
missingness_change
weather_unexplained_score
```

---

# 90. LOADING STATES

Every data-dependent page needs:

```text
Loading...
```

Do not leave blank white space.

---

# 91. ERROR STATES

If backend fails:

```text
Unable to load account data.
Retry
```

Do not display fake placeholder metrics.

---

# 92. EMPTY STATES

If no accounts meet a filter:

```text
No accounts match the selected criteria.
```

Do not show:

```text
0 suspicious accounts
```

unless that is genuinely the result.

---

# 93. LARGE DATA

Do not render:

```text
43,000+ rows
```

directly in the browser.

Use:

```text
pagination
server-side filtering
virtualized table
```

---

# 94. CHART PERFORMANCE

Only load the timeline for:

```text
selected account
```

Do not render thousands of account charts at once.

---

# 95. FRONTEND TECHNOLOGY

Recommended:

```text
React
+
Vite
```

or:

```text
Next.js
```

Use the team's strongest familiar option.

Do not introduce a new framework solely for novelty.

---

# 96. CHARTING

Suitable:

```text
Plotly
ECharts
Recharts
Chart.js
```

Choose one.

Do not use five charting libraries.

---

# 97. TABLE

Suitable:

```text
TanStack Table
```

or a simple performant table.

---

# 98. BACKEND

Possible:

```text
FastAPI
```

because it integrates naturally with Python ML artifacts.

---

# 99. MODEL ARTIFACT ACCESS

The API should load:

```text
model
feature metadata
predictions
timeline features
```

from saved artifacts.

It should not retrain models on startup.

---

# 100. STARTUP FLOW

Backend:

```text
load model
load account predictions
load feature dictionary
start API
```

Frontend:

```text
load overview
load ranked queue
```

---

# 101. API RESPONSE FORMAT

Keep responses predictable.

Example:

```json
{
  "account_id": "A001",
  "risk_score": 0.97,
  "rank": 3,
  "change_detected": true,
  "change_point_date": "2025-08-14",
  "persistence_days": 21,
  "relative_energy_gap": 0.61
}
```

---

# 102. TIMELINE RESPONSE

Example:

```json
{
  "account_id": "A001",
  "timeline": [
    {
      "date": "2025-08-01",
      "actual": 19.2,
      "expected": 20.1,
      "residual": -0.9,
      "missing": false
    }
  ]
}
```

---

# 103. FRONTEND STATE

Track:

```text
selectedAccount
filters
sort
page
dateRange
loading
error
```

---

# 104. URL ROUTING

Recommended:

```text
/
```

Overview.

```text
/investigations
```

Ranked queue.

```text
/accounts/:id
```

Account investigation.

```text
/model
```

Model metrics.

```text
/data-quality
```

Data quality.

---

# 105. DESIGN SYSTEM

Use consistent:

```text
spacing
typography
cards
buttons
tables
badges
tooltips
```

Do not style every component independently.

---

# 106. TYPOGRAPHY

Prioritize:

```text
clear readable numbers
```

especially for:

```text
risk score
percentage gap
days
deficit
```

---

# 107. NUMERIC FORMATTING

Examples:

```text
0.9732
→ 0.97

0.61342
→ 61.3%

1240.532
→ 1,241 kWh
```

Do not display unnecessary decimal noise.

---

# 108. DATE FORMATTING

Backend:

```text
ISO date
```

Frontend:

```text
14 Aug 2025
```

---

# 109. TOOLTIP PRECISION

Tooltips can provide exact values.

Main UI should remain readable.

---

# 110. RESPONSIVE ACCOUNT PAGE

Desktop:

```text
chart left/full width
evidence cards below
```

Smaller screen:

```text
chart
↓
evidence
↓
details
```

---

# 111. UI SECURITY

Do not expose:

```text
raw filesystem paths
model internals
training credentials
API keys
```

---

# 112. LOGGING

Frontend logs:

```text
API errors
```

Backend logs:

```text
request
account lookup
model load
```

Avoid logging sensitive data unnecessarily.

---

# 113. DATA PRIVACY

Account identifiers should be treated as sensitive operational data.

Do not expose:

```text
more account information than necessary
```

---

# 114. DEMO DATA SAFETY

If presenting publicly:

```text
use anonymized account IDs
```

if the original identifiers could identify real customers.

---

# 115. UI TESTING

Test:

```text
overview loads
queue loads
search works
filter works
account page loads
chart renders
missing values render correctly
change point renders
risk score renders
API failure renders correctly
```

---

# 116. VISUAL TESTING

Check:

```text
long account IDs
large deficit values
missing change points
missing weather
high missingness
zero consumption
```

---

# 117. ACCOUNT WITH NO CHANGE POINT

UI:

```text
No statistically strong change point detected.
```

Do not:

```text
Change point: 0
```

---

# 118. ACCOUNT WITH NO WEATHER

UI:

```text
Weather context unavailable for this account/time period.
```

Do not invent:

```text
weather explanation = 0
```

---

# 119. ACCOUNT WITH HIGH MISSINGNESS

Show:

```text
Data quality warning
```

Example:

```text
Recent readings contain substantial missingness. Interpret consumption-based evidence with caution.
```

---

# 120. ACCOUNT WITH SHORT HISTORY

Show:

```text
Limited history
```

Example:

```text
This account has limited historical data, reducing confidence in its personal baseline.
```

---

# 121. MODEL CONFIDENCE VS DATA QUALITY

Do not automatically equate:

```text
high risk score
```

with:

```text
high evidence quality
```

A high score from poor-quality data should be visually flagged.

---

# 122. EVIDENCE QUALITY PANEL

Optional:

```text
Evidence quality: Strong / Moderate / Limited
```

based on:

```text
history length
valid readings
weather availability
change-point reliability
```

If implemented, clearly document the formula.

---

# 123. INVESTIGATION PRIORITY

Optional second metric:

```text
Investigation Priority
```

This can combine:

```text
model risk
+
evidence quality
```

but should not replace the model risk score.

If implemented, label it clearly as an operational ranking.

---

# 124. DON'T HIDE THE RAW MODEL SCORE

Even if an operational priority exists, always show:

```text
Model risk score
```

separately.

---

# 125. FEATURE EXPLANATION ORDER

For a high-risk account, default evidence order:

```text
1. Relative energy gap
2. Persistence
3. Change point
4. Drop magnitude
5. Cumulative deficit
6. Missingness change
7. Weather explanation
```

The actual strongest features can override this if SHAP is available.

---

# 126. WHY THIS ORDER

It follows the human reasoning sequence:

```text
How abnormal?
↓
How long?
↓
When did it start?
↓
How large was the shift?
↓
How much accumulated?
↓
Did data quality change?
↓
Could context explain it?
```

---

# 127. ACCOUNT COMPARISON

Optional advanced feature:

Allow investigator to compare:

```text
Account A
vs
Account B
```

Use:

```text
risk
gap
persistence
change
```

Not raw customer details.

---

# 128. PEER COMPARISON

If peer features exist, show:

```text
Account consumption
vs
peer median
```

This is secondary to the personal baseline.

---

# 129. PERSONAL BASELINE SHOULD DOMINATE

The main comparison remains:

```text
account actual
vs
account expected
```

because this is the core behavioural approach.

---

# 130. MODEL VERSION

Display:

```text
Model version: vX
Feature version: vX
```

This makes results reproducible.

---

# 131. LAST UPDATED

Display:

```text
Last scoring run
```

with timestamp.

---

# 132. DEMO RESET

Provide:

```text
Reset demo
```

if investigation status is mutable.

---

# 133. HACKATHON DEMO PRIORITY

If time is limited, implement:

```text
P0:
Overview
Ranked queue
Account page
Actual vs expected chart
Core evidence cards
Change point
Risk score

P1:
SHAP
Model metrics
Data quality
Investigation status

P2:
Peer comparison
Advanced CUSUM chart
Report generation
Account comparison
```

---

# 134. P0 MUST LOOK POLISHED

Do not build:

```text
7 mediocre screens
```

Build:

```text
3 excellent screens
```

The judge needs to understand the product immediately.

---

# 135. FINAL UI STORY

The UI should communicate:

```text
We don't simply say "this account looks suspicious."

We show:
what normal looked like,
when behaviour changed,
how far it moved,
how long it stayed abnormal,
how much deficit accumulated,
whether missingness changed,
and whether weather provides an alternative explanation.
```

---

# 136. FINAL INVESTIGATOR EXPERIENCE

The investigator should be able to answer in under 30 seconds:

```text
Which account?
Why?
Since when?
How strong?
What else could explain it?
Should I inspect it?
```

---

# 137. FINAL JUDGE EXPERIENCE

A judge should understand in under 60 seconds:

```text
Raw time series
→ personal baseline
→ behavioural deviation
→ change point
→ persistent anomaly
→ ranked risk
→ explainable investigation
```

---

# 138. REQUIRED UI FILE STRUCTURE

Recommended:

```text
frontend/
├── src/
│   ├── components/
│   │   ├── RiskBadge.*
│   │   ├── MetricCard.*
│   │   ├── InvestigationTable.*
│   │   ├── EvidencePanel.*
│   │   ├── ConsumptionChart.*
│   │   ├── ChangePointMarker.*
│   │   └── DataQualityBadge.*
│   │
│   ├── pages/
│   │   ├── Overview.*
│   │   ├── Investigations.*
│   │   ├── Account.*
│   │   ├── Model.*
│   │   └── DataQuality.*
│   │
│   ├── api/
│   ├── hooks/
│   ├── utils/
│   └── App.*
```

---

# 139. REQUIRED BACKEND STRUCTURE

Recommended:

```text
backend/
├── app/
│   ├── main.py
│   ├── routes/
│   │   ├── accounts.py
│   │   ├── model.py
│   │   └── data_quality.py
│   ├── services/
│   │   ├── account_service.py
│   │   ├── model_service.py
│   │   └── timeline_service.py
│   └── schemas/
```

---

# 140. REQUIRED UI DATA PRODUCTS

The modeling pipeline should provide:

```text
predictions/ranked_accounts.csv
predictions/investigation_features.csv
predictions/account_timelines.parquet
artifacts/feature_importance.csv
artifacts/model_metrics.json
```

The UI consumes these.

---

# 141. NO MODEL TRAINING IN FRONTEND

The frontend never trains:

```text
LightGBM
XGBoost
LSTM
```

It only displays outputs.

---

# 142. NO FEATURE ENGINEERING IN FRONTEND

The frontend should not calculate:

```text
rolling means
CUSUM
relative gap
deficit
```

unless the calculation is purely visual and does not alter the official model result.

---

# 143. VISUAL-ONLY CALCULATIONS

Allowed:

```text
format percentage
format dates
calculate chart display ranges
```

Not allowed:

```text
recompute risk score
```

---

# 144. INVESTIGATION REPORT HANDOFF

The later LLM layer should receive:

```text
account evidence object
```

from the backend.

Recommended endpoint:

```text
POST /api/accounts/{id}/report
```

or:

```text
POST /api/reports/investigation
```

---

# 145. REPORT GENERATION UI

Button:

```text
Generate Investigation Summary
```

Then show:

```text
Generating...
```

and:

```text
Summary
Evidence
Timeline
Recommended inspection priority
```

---

# 146. LLM DISCLAIMER

The UI should distinguish:

```text
Model-derived evidence
```

from:

```text
LLM-generated narrative
```

Example:

```text
AI-generated summary based on model outputs. Verify against source data before operational use.
```

---

# 147. REPORT SHOULD NOT CREATE NEW FACTS

The LLM may:

```text
summarize
organize
explain
```

It must not:

```text
invent measurements
invent dates
invent meter faults
claim confirmed theft
```

---

# 148. FINAL UI CHECKLIST

```text
[ ] Overview page
[ ] Ranked investigation queue
[ ] Risk score
[ ] Account search
[ ] Filters
[ ] Account detail page
[ ] Actual vs expected chart
[ ] Change-point marker
[ ] Persistence metric
[ ] Relative energy gap
[ ] Drop magnitude
[ ] Cumulative deficit
[ ] Missingness shift
[ ] Weather context
[ ] Evidence panel
[ ] Model performance
[ ] AUC-PR
[ ] Precision@K
[ ] Temporal split display
[ ] Data quality page
[ ] Model version
[ ] Feature version
[ ] Loading states
[ ] Error states
[ ] Empty states
[ ] Demo account
[ ] Contrasting account
[ ] LLM report handoff
```

---

# 149. FINAL UI PRINCIPLE

The dashboard should make the model's central insight visually obvious:

```text
THEFT DETECTION IS NOT JUST
"LOW CONSUMPTION."

IT IS:
"CONSUMPTION THAT CHANGED,
STAYED CHANGED,
AND IS HARD TO EXPLAIN."
```

The interface exists to make that evidence understandable.

---

# 150. END STATE

The final product should feel like:

```text
a utility investigation tool
```

rather than:

```text
a generic ML dashboard.
```

The ranked list gets attention.

The timeline earns trust.

The evidence panel explains the ranking.

The contextual signals prevent simplistic conclusions.

The final investigator decision remains human.

End of UI/UX specification.
