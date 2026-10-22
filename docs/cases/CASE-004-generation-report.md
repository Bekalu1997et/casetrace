# CASE-004 Generation Report

Status: structurally valid and imported into the isolated validation database.

- Generator: `scripts/generate_cases003_006.py`
- Records: 6 encounters, 6 clinical events, 24 observations, 5 medications,
  18 PDFs, 5 diagnostic reports, 1 referral, and no imaging.
- Validation: passed; all 18 PDF checksums and asset registrations passed.
- Import: passed; repeat import returned `unchanged`.
- Investigation replay: completed with the deterministic-rules engine; 5
  verified findings and 40 verified anchors. The evaluator reported discovery
  failure with 1/3 required-source coverage. The case remains structurally
  valid and the result is preserved as an engine baseline.

The monitor finding challenges an anxiety-only explanation without asserting a
definitive alternative diagnosis.
