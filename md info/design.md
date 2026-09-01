# Dashboard — Design Spec

Companion to `idea.md`. This covers the visual and interaction design only — what it looks like and how it behaves. Model/feature build plan is a separate doc.

## Visual direction

Reference: dark tactical control-room map (the Jurassic Park "Control Room / Plan View" screen) — glowing cyan/amber markers on a dark grid, monospace labels, HUD-style panels stacked around the edges. The goal is a "utility fraud investigation console" feel, not a consumer dashboard, not playful.

- **Background**: near-black (`#0a0e14` or similar), subtle grid lines etched into it (low-opacity, ~5-8%)
- **Primary accent**: cyan/teal for neutral/normal state, matches the reference's glow
- **Risk accent**: amber → red gradient for suspicion level (low = amber, high = red), keep it a clear gradient scale, not just two colors, since confidence is continuous
- **Typography**: monospace or condensed technical sans (something like a HUD readout font) for labels, numbers, IDs — reinforces the "control panel" feel
- **Panels**: thin-bordered, slightly glowing edges, dark fill, similar to the reference's side panels (vehicle status, clutches list) — use this pattern for the side info panels (ranked list, filters, legend)

## Layout — three views

### 1. Grid view (default/home)
- Full-bleed 2D grid of house icons, tilted via CSS `perspective` + `rotateX` for the tactical top-down-but-angled look from the reference
- Grid position = peer-cluster group, not geography — accounts in the same cluster sit near each other, loosely bounded by a faint cluster outline (like the reference's "UNLOCKED" zone outlines)
- Icon color = risk gradient (amber → red), icon size or glow intensity scales with confidence score too, so high-risk accounts visually pop even at a glance
- Small top bar: dataset summary stats (total accounts, flagged count, current threshold) — mirrors the reference's top status readouts
- Side panel (persistent, right side): ranked list of top-N suspicious accounts, same style as the reference's numbered "EXP" list — clicking a row highlights that house in the grid

### 2. Drill-in / detail view (on click)
- Triggered by clicking a house: a zoom+perspective transition (scale up, flatten the tilt, feels like diving into that cell) — CSS transform transition, 300-500ms, no need for a real 3D engine
- Detail panel layout, HUD-style like the reference's right-side vehicle panel:
  - Header: consumer ID, current confidence score, risk band label (e.g. "elevated," "critical")
  - Time-series chart: daily consumption over the full period, anomalous points highlighted, missing-data gaps visually marked (not hidden)
  - Peer comparison strip: this account's usage vs. its cluster's average, small inline chart or delta indicator
  - SHAP explanation: horizontal bar chart of top features driving this account's score, plain-language label per feature (not raw column names)
  - Back/close control returns to grid view with reverse transition

### 3. List view (toggle from grid view)
- Straight sortable/filterable table: rank, consumer ID, confidence score, risk band, top contributing feature
- For judges or reviewers who want to scan fast rather than explore visually
- Row click opens the same detail view as the grid

## Interaction notes

- Grid → detail transition should feel intentional and smooth, not jarring — this is the "wow" moment of the demo, worth spending polish time on
- Hover states on grid icons: subtle scale-up + tooltip with ID and score, before committing to a click
- Legend/color key always visible (small, corner-anchored) so risk color coding is self-explanatory without narration
- Loading/empty states matter for a live demo — if judges pick a scenario or filter live, the transition/loading state should look intentional, not broken

## What NOT to build

- No real map library (Leaflet, Mapbox, Cesium) — there's no geographic data, and using one implies location data that doesn't exist
- No literal 3D engine requirement — the "3D POV" feel comes from CSS perspective/transform tricks, not Three.js, unless there's spare time and someone wants to push the drill-in transition further
- No cluttered dashboard-of-everything — three views only, each with one clear job, resist the urge to cram every metric onto the home grid
