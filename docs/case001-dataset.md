# CASE-001 synthetic dataset

The case follows the PRD's Daniel M., age 47, seven visits from January 8 through
July 22, 2026. It includes progressive cough, lisinopril exposure, symptomatic
reflux, longitudinal blood results and an unresolved right basal opacity. The
records do not establish a final etiologic diagnosis. All people and facilities
are fictional. Independent expert clinical review remains pending.

## Files and boundaries

- `data/cases/CASE-001/case.json`: clinical input accepted by the existing importer.
- `data/cases/CASE-001/manifest.json`: dataset and asset SHA-256, sizes and counts.
- `data/assets/cases/CASE-001/documents/`: searchable clinical PDF renditions.
- `data/assets/cases/CASE-001/imaging/`: code-drawn educational PNG diagrams.
- `evaluation/CASE-001/answer-key.json`: offline blueprint, expected findings,
  counterevidence, literal source anchors and evaluation criteria.

The PRD patient ID `SYN-001` is preserved; PAT IDs in schema examples are not
replacement demographics. Instants retain `+03:00`. Date-only medication periods
remain dates. Approximate symptom onset stays in prose, without an invented
instant. Prescription and patient-reported use are distinguished by their source
documents; no administration or dispensing evidence is asserted.

The clinical schema has no abnormal-flag field. Local synthetic laboratory
intervals and computed high/low labels appear in the PDF/text reports; no extra
clinical property is added. Scheduling discrepancies remain source assertions,
not hidden evaluation labels. Imaging diagrams show location only: their shape
and size do not establish pathology. No CT result, spirometry result, diagnosis,
or later outcome is invented beyond the July 22 cutoff.

## Reproduce and validate

From `apps/api`, using a platform-native uv environment:

```sh
uv sync --locked --group case-data
uv run --locked --group case-data python ../../scripts/generate_case001.py
uv run --locked --group case-data python ../../scripts/validate_case001.py
uv run --locked python -m app.hospital.cli validate CASE-001
uv run --locked --group case-data pytest -q
```

Generation writes authored CASE-001 files; use `--output-root <empty-directory>`
to reproduce in isolation. Fixed source times and invariant PDF rendering permit
byte comparisons using the locked dependency versions. Do not regenerate or
edit an already imported version as an amendment; the importer rejects changes.

Use the existing Alembic/import commands for ingestion. Prefer an explicitly
selected fresh database for verification; stop writers before maintaining the
normal runtime database. The automated CASE-001 tests migrate temporary SQLite
files, import twice, exercise real FastAPI routes and registered asset downloads,
check failed-import rollback and verify answer-key exclusion. They do not write
the normal runtime database.

Offline validation checks canonical schemas, IDs, links, chronology, exact gold
anchors, PDF text and all-page rendering, PNG decoding, and hashes. It cannot
establish clinical accuracy or substitute for an independent investigation run.
The tool registry and investigation engine remain separate engineering gates.

Clinical design reference: [BTS chronic cough statement](https://www.brit-thoracic.org.uk/clinical-resources/clinical-statements/chronic-cough-in-adults/).
It informed plausible investigations and cautious medication interpretation;
the synthetic values are authored fiction, not copied patient data.

Laboratory interval references, checked October 21, 2026: Mayo Clinic Laboratories
[CBC](https://www.mayocliniclabs.com/test-catalog/overview/9109/complete-blood-cell-count-cbc-with-differential-blood),
[basic metabolic panel](https://www.mayocliniclabs.com/test-catalog/overview/113630),
and [CRP](https://prd1.mayocliniclabs.com/test-catalog/overview/9731).
The fixture adopts the adult male hemoglobin/creatinine and adult WBC/potassium
intervals, with 5 mg/L as the CRP upper threshold. No generated result lies on
that threshold. These references inform plausibility; they are not universal
diagnostic cutoffs or certification of the fictional case.
