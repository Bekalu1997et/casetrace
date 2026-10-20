# CASETRACE

CASETRACE is an AI clinical investigation prototype that reconstructs medical mysteries from longitudinal synthetic patient records. It is designed to connect evidence across encounters, reconstruct timelines, identify contradictions, and produce findings that link back to their original sources.

The initial demonstration focuses on a timeline contradiction that becomes visible only when multiple clinical records are connected.

## Project status

This repository currently contains architecture documents, project guidance, and the application folder scaffold. The API and web applications are not yet implemented. Dependency manifests, database migrations, startup commands, and automated checks are not yet available. The root configuration files may still be placeholders.

## Intended experience

1. Select a synthetic patient and explore their hospital records.
2. Start an investigation across the available clinical history.
3. Follow actual record retrieval and investigation activity.
4. Inspect reconstructed timelines, contradictions, and verified evidence.
5. Open the source records supporting each report finding.

## Planned architecture

| Component | Technology and responsibility |
| --- | --- |
| Web application | Next.js, TypeScript, Tailwind CSS, shadcn/ui; hospital and investigation workspaces |
| API | Python 3.12+, FastAPI, Pydantic v2; hospital APIs and investigation services |
| Persistence | PostgreSQL, SQLAlchemy 2, Alembic |
| Investigation execution | Specialized agents, clinical retrieval tools, asyncio workers |
| Live activity | Server-Sent Events (SSE) |
| Local infrastructure | Docker Compose |

Agents retrieve clinical information through defined tools and hospital services, rather than accessing the database or raw case files directly. Models propose findings; deterministic backend code verifies source references, timestamps, and clinical values. Evaluation ground truth must remain isolated from agents and runtime interfaces.

## Repository layout

```text
AGENTS.md           Repository instructions and architectural rules
docs/               Product requirements, architecture, contracts, and plans
ui-design/          Design specifications and prototypes
apps/api/           Backend application scaffold
apps/web/           Frontend application scaffold
data/cases/         Synthetic case folders, CASE-001 through CASE-010
data/assets/        Supporting synthetic case assets
scripts/            Development, validation, and data tooling scaffold
tests/              Test scaffold
```

Some documentation files and directories are placeholders. Empty directories are not tracked by Git until files are added.

## Documentation

Start with [repository guidance](AGENTS.md) and the [product requirements](docs/PRD.md).

- Architecture: [frontend](docs/frontend-architecture.md), [backend](docs/backend-architecture.md), and [frontend/backend contract](docs/frontend-backend-contract.md).
- Clinical data: [case schema](docs/case-schema.md), [hospital API](docs/hospital-api.md), and [database schema](docs/database-schema.md).
- Investigations: [agent tools](docs/agent-tools.md), [multi-agent architecture](docs/multi-agent-architecture.md), [state machine](docs/investigation-state-machine.md), and [evidence contract](docs/evidence-contract.md).
- Delivery: [implementation plan](docs/implementation-plan.md), [evaluation plan](docs/evaluation-plan.md), and [demo runbook](docs/demo-runbook.md).
- Design: [UI design](ui-design/ui-design.md) and [design system](ui-design/design-system.md).

## Development

Read the relevant architecture and contracts before implementing a feature. Follow the implementation plan and preserve evidence provenance and distinct timestamp meanings throughout the system.

Setup, run, migration, and test instructions should be added when the corresponding tooling exists and has been verified. No runnable application setup is provided yet.

Use synthetic case data for this prototype. Keep credentials and local environment values out of version control; `.env.example` is reserved for documented placeholder values.
