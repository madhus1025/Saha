# AI_INDEX — Router for Future LLMs

Fast lookup: pick your task, read the listed file(s). All paths are under `.ai/`.

| If you need to… | Read |
|---|---|
| Get oriented (stack, layout, entry points) | [REPO.md](REPO.md) |
| Understand layering, request lifecycle, data flow | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Find which directory owns what / where to edit | [FOLDERS.md](FOLDERS.md) |
| Understand a feature + its business rules | [FEATURES.md](FEATURES.md) |
| Add/modify an HTTP endpoint | [API.md](API.md) + [FEATURES.md](FEATURES.md) |
| Understand tables, relationships, indexes | [DATABASE.md](DATABASE.md) |
| Know why a dependency exists / replacement risk | [DEPENDENCIES.md](DEPENDENCIES.md) |
| Match naming, patterns, error/response format | [CONVENTIONS.md](CONVENTIONS.md) |
| Keep this `.ai/` folder up to date | [MAINTENANCE.md](MAINTENANCE.md) |

## Common task → path

- **Auth / login / tokens** → API.md (Auth table) · backend `Saha.Application/Features/Auth/` · `Saha.API/Controllers/AuthController.cs` · frontend `shared/stores/auth.store.ts`, `core/api/axios-instance.ts`
- **Couple connections** → FEATURES.md (Connect) · `Features/Connect/` · `Domain/Entities/CoupleConnection.cs`
- **Profile / picture upload** → `Features/Profile/` · `ProfileController.cs`
- **Add a backend use case** → new folder under `Saha.Application/Features/<X>/` (Command/Query + Handler + Validator), then controller action. See CONVENTIONS.md.
- **Add a frontend feature** → new module under `frontend/src/modules/<x>/`; wire route in `app/router/router.tsx`. Placeholder modules use `ComingSoonModule`.
- **DB schema change** → edit entity + `Persistence/Configurations/*`, add EF migration. See DATABASE.md + MAINTENANCE.md.
- **Telemetry / logging** → ARCHITECTURE.md (Observability) · `docs/telemetry/TELEMETRY.md`

> Deeper prose docs live in `docs/` (see REPO.md). This `.ai/` folder is the high-signal summary.
