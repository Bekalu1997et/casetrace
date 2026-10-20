---
name: database-development
description: 'Maintain reliable storage and retrieval for the synthetic hospital data and CASETRACE investigation artifacts. Use for: Schema, migrations, seeding, repository queries, indexes, source references, fixtures, and database transactions.'
---

# Database Development Skill

## Purpose
Maintain reliable storage and retrieval for the synthetic hospital data and CASETRACE investigation artifacts.

## When to use
Schema, migrations, seeding, repository queries, indexes, source references, fixtures, and database transactions.

## Context
Read `case-schema.md`, `hospital-api.md`, backend architecture, and `data-access-patterns.md`. Preserve whichever database engine and ORM are already selected in the repository; do not replace them without an explicit architectural decision.

## Data boundaries
- **Source:** patients, encounters, clinical notes, lab observations, medication orders/reconciliations, radiology reports, documents, media metadata.
- **Investigation:** runs, executed tool calls, retrieved evidence references, timeline projections, hypotheses/findings, report versions.
- **Testing only:** ground-truth answers, hidden clues, evaluator metadata. Never expose these via normal hospital/agent queries.

## Invariants
- Immutable source IDs and stable source-to-encounter relationships.
- Preserve raw clinical time/source offset and canonical comparison representation.
- Store media references and metadata separately from large assets unless architecture specifies otherwise.
- Enforce foreign keys and uniqueness where appropriate; ensure source references cannot silently dangle.
- Use migrations and deterministic seed scripts; re-seeding must not duplicate logical records.
- Demonstration resets should clear investigation artifacts without mutating canonical source fixtures.

## Done when
Migration and rollback (if supported) tested, seed validated, cross-document references resolve, query tests pass, and CASE-001 remains replayable.
