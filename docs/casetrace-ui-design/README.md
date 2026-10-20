# CASETRACE UI Design Package

This directory contains the first HTML-first UI design prototype for CASETRACE.

## Files

- `ui-design.md` — design principles, screen inventory, visual tokens, component map, and Next.js implementation guidance.
- `index.html` — interactive single-file overview/dashboard prototype. Use the left navigation to switch between overview, patient chart, hospital records, investigation workbench, report, case library, and system activity.
- `screens/patient-chart.html` — standalone hospital-style patient chart.
- `screens/investigation-workbench.html` — standalone investigation activity and evidence workbench.
- `screens/investigation-report.html` — standalone evidence-backed report layout.

## Preview

Open `index.html` directly in a modern browser. No build step is required.

## Important

This is a design prototype, not a connected application. Sample names, values, timestamps, tool calls, findings, and counts are illustrative placeholders. They must be reconciled with the validated CASE-001 fixture and ground truth before a live demo.

Do not implement the example findings as hardcoded production logic. In Next.js, render backend state through typed API clients; consume persisted investigation state over REST and activity events over SSE. The browser must not access agent tools or ground truth directly.

## Suggested next step

Review the layout and interaction hierarchy, then refine the visual direction and screen behavior before converting the approved design into reusable Next.js components.
