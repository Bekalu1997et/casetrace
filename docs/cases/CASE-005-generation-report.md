# CASE-005 Generation Report

Status: structurally valid and imported into the isolated validation database.

- Generator: `scripts/generate_cases003_006.py`
- Records: 7 encounters, 7 clinical events, 28 observations, 6 medications,
  19 PDFs, 5 diagnostic reports, 1 referral, and no imaging.
- Validation: passed; all 19 PDF checksums and asset registrations passed.
- Import: passed; repeat import returned `unchanged`.
- Investigation replay: completed with the deterministic-rules engine; 6
  verified findings and 48 verified anchors. The evaluator reported discovery
  failure with 1/3 required-source coverage. The case remains structurally
  valid and the result is preserved as an engine baseline.

The data distinguishes hold instructions, order status, reconciliation,
patient report, and actual exposure uncertainty.
