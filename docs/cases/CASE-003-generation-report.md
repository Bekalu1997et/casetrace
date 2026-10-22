# CASE-003 Generation Report

Status: structurally valid and imported into the isolated validation database.

- Generator: `scripts/generate_cases003_006.py`
- Records: 7 encounters, 6 clinical events, 6 observations, 5 medications,
  18 PDFs, 1 pathology report, 1 referral, and no imaging.
- Validation: passed; all 18 PDF checksums and asset registrations passed.
- Import: passed; repeat import returned `unchanged`.
- Investigation replay: completed with the deterministic-rules engine; 8
  verified findings and 82 verified anchors. The evaluator reported discovery
  failure with 1/6 required-source coverage, which is recorded as an engine
  baseline limitation rather than hidden or corrected in the dataset.

The dataset preserves the uncertainty between routing, acknowledgment, patient
discussion, and completed follow-up.
