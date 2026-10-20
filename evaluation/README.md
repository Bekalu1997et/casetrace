# Offline evaluation only

This directory contains synthetic case blueprints and answer keys. It must never
be mounted into the API or agent runtime, served as an asset, or bundled into the
frontend. The existing Docker build allowlist excludes it. Local filesystem ACL
isolation remains an operator responsibility; API exclusion does not establish
process isolation on a developer account.

`CASE-001/answer-key.json` follows the offline structure in
`docs/evaluation-plan.md`. Source IDs and literal field/quote anchors are for
dataset evaluation, not a new runtime finding contract. No numerical medical
confidence score is assigned. Expert clinical review is pending.
