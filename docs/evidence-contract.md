# Phase 2 source provenance boundary

This document establishes source lineage only. Finding anchors, scoring,
verification and investigation evidence DTOs remain Phase 3 decisions.

Each imported source preserves its canonical ID, patient/encounter links, dataset
case/version, source system, source version, original clinical payload and named
timestamps. Internal UUIDs never replace source IDs in public DTOs. Document
versions retain text SHA-256 and optional registered asset FK. Assets retain
storage key, MIME, size, SHA-256 and an explicit synthetic label. A source-document
link must resolve within the same patient. No citation is invented for records
without a source document.

Canonical source files are maintenance inputs, never runtime endpoints. Only
allowlisted clinical fields enter the runtime database. Ground truth,
investigation targets, expected relationships, red-herring labels and scoring
metadata remain outside runtime DB/assets. Deployment must exclude raw cases and
evaluation directories, as in the existing Docker configuration. Local process
file permissions are an operator responsibility: API omission alone is not OS
isolation. Future agents may only use approved tools over hospital services.
