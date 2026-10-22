# CASE-006 Generation Report

Status: structurally valid and imported into the isolated validation database.

- Generator: `scripts/generate_cases003_006.py`
- Records: 7 encounters, 7 clinical events, 32 observations, 5 medications,
  18 PDFs, 5 laboratory reports, 1 referral, and no imaging.
- Validation: passed; all 18 PDF checksums and asset registrations passed.
- Import: passed; repeat import returned `unchanged`.
- Investigation replay: completed with the deterministic-rules engine; 7
  verified findings and 68 verified anchors. The evaluator reported discovery
  failure with 1/3 required-source coverage. The case remains structurally
  valid and the result is preserved as an engine baseline.

The longitudinal glucose and HbA1c pattern is presented as a screening and
follow-up concern, not as an automatic diabetes diagnosis.
