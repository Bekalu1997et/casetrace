.PHONY: install api web migrate test lint typecheck build docker-up docker-down e2e

install:
	cd apps/api && uv sync --locked
	cd apps/web && pnpm install --frozen-lockfile

api:
	cd apps/api && uv run --locked python -m app

web:
	cd apps/web && pnpm dev

migrate:
	cd apps/api && uv run --locked alembic upgrade head

test:
	cd apps/api && uv run --locked pytest
	cd apps/web && pnpm test

lint:
	cd apps/api && uv run --locked ruff check .
	cd apps/api && uv run --locked ruff format --check .
	cd apps/web && pnpm lint

typecheck:
	cd apps/api && uv run --locked mypy
	cd apps/web && pnpm typecheck

build:
	cd apps/web && pnpm build

e2e:
	cd apps/web && pnpm exec playwright test

docker-up:
	docker compose up --build

docker-down:
	docker compose down

# Phase 2 maintenance commands, from repository root; CASE may be overridden.
CASE ?= CASE-001
.PHONY: validate-case seed-case hospital-smoke
validate-case:
	cd apps/api && uv run --locked python -m app.hospital.cli validate $(CASE)

seed-case:
	cd apps/api && uv run --locked python -m app.hospital.cli import $(CASE)

hospital-smoke:
	bash scripts/hospital-smoke.sh
