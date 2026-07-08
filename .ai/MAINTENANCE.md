# MAINTENANCE — Keeping `.ai/` Accurate

**Last full regeneration:** 2026-07-07 (commit `3b1b21c` — "feat: CI/CD fixes, Linux App Service, telemetry, clean migration").
**Scope of that run:** full repository (backend Clean Architecture + React frontend + infra/docs). Initial generation of the `.ai/` folder.

## When to fully regenerate
Re-run the generator (this whole `.ai/` prompt) when any of these happen:
- A **placeholder module becomes real** (finance / memories / goals / messages / calendar / settings gains backend endpoints + a domain aggregate). → touches FEATURES, API, DATABASE, FOLDERS.
- A **new domain/aggregate** or a **new bounded set of endpoints** is added.
- A **large refactor** of layering, the MediatR pipeline, or the auth/token flow.
- **Significant dependency changes** (framework upgrade, swap of ORM/state/router/auth libs).
- **Before handing the repo to another AI/agent** for substantial work.

## Lightweight updates (preferred for small changes)
Edit only the affected file(s) and note the change here; do **not** regenerate everything.

| Change | Edit these files |
|---|---|
| New/changed endpoint | `API.md` (+ `FEATURES.md` if rules change) |
| New business rule / validation | `FEATURES.md` (+ `CONVENTIONS.md` glossary if a new term) |
| Schema / migration / index change | `DATABASE.md` |
| New/removed dependency | `DEPENDENCIES.md` |
| New top-level dir or moved responsibility | `FOLDERS.md` (+ `REPO.md` layout table) |
| New naming/pattern convention | `CONVENTIONS.md` |
| New common task / entry point | `AI_INDEX.md` |

After any edit, update the **date line at the top of this file** with a one-line note (e.g. `2026-07-08 — added Finance endpoints to API.md/FEATURES.md`).

## Full regeneration process
1. Re-run the `.ai` generator prompt, focusing exploration on changed areas (`git diff <last-regen-commit>..HEAD --stat` to scope).
2. Preserve accurate sections; only rewrite what drifted.
3. Run the generator's Quality Checklist (traceable claims, marked inferences, no duplication, scannable, tables for endpoints/schema).
4. Update this file's date/scope line.

## Suggested automation
- **Commit `.ai/` with the code change** that made it stale — keeps context in sync with history. (This is the single most important habit.)
- Optional CI check (add to `.github/workflows/pr-check.yml`): warn if a PR touches `backend/src/Saha.API/Controllers/**`, `Application/Features/**`, or `Persistence/Migrations/**` but not `.ai/**`.
- Optional pre-commit reminder: same path heuristic locally.

## Known drift risks specific to this repo
- **API.md / FEATURES.md** drift fastest — every new controller action or handler rule must be reflected.
- **DATABASE.md** — any new EF migration means re-checking tables/indexes.
- Placeholder-module list (in REPO/FOLDERS/FEATURES) must be trimmed as modules ship.
- Verify claims against code before trusting them; entity/handler paths are the source of truth, not this summary.
