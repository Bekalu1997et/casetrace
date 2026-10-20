# Phase 1 inventory and boundaries

Inspected on 2026-10-20 on `develop/casetrace-mvp`; starting working tree clean.

All requested core documents exist: AGENTS, README, PRD, implementation plan;
frontend/backend architecture, frontend-backend contract, database/case schemas;
hospital API, agent tools, multi-agent architecture and investigation state machine.
`docs/evidence-contract.md` is missing. Existing contracts already record unresolved
IDs, resource mappings, time fields, status enums and event/evidence schemas.
Those remain P0-02 gates to domain implementation, not Phase 1 decisions.

Installed development entrypoints are `.skill/case-trace-development`,
`backend-development`, `database-development`, `frontend-development`, and
`casetrace-ui`, each with `SKILL.md`. Their relevant coding/error/testing,
API/service/data-access, component and UI-state references were inspected.
There is no `skills/` tree or separate validation skill; no duplicate was created.

`ui-design/ui-design.md` and `ui-design/design-system.md` exist but are empty.
The usable design source is `docs/casetrace-ui-design/ui-design.md`, which includes
tokens, plus its index and screen HTML prototypes. The foundation follows those
tokens and shell structure without importing prototype patient records or counts.

Before this work, apps and root configuration were scaffolds with no manifests,
lockfiles, models or tests. Existing docs, skills, design prototypes and synthetic
case directories are preserved. New code implements infrastructure only.

The health route is already fully defined in contract section 76:
`GET /api/health`, returning `status: ok`, `version: 1.0.0`, `database: connected`.
It checks SQLite using SELECT 1 without requiring clinical tables or providers.
The API specification version is distinct from application package version 0.1.0.

The initial Alembic revision intentionally contains no domain DDL. Choosing public
IDs or enum constraints from the illustrative schema now would bypass P0-02.
All hospital/investigation entities, UTC source adapters, scoped repositories,
seeders and agent/tool interfaces are deferred to their dependency-ready phases.
