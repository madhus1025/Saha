# Saha — Feature Status Board

> **Start every session here.** This is the master index of all features and
> their current state. See [`README.md`](./README.md) for how tracking works and
> [`../docs/ai-first-development-workflow.md`](../docs/ai-first-development-workflow.md)
> for the mandatory workflow.

**Legend:** ✅ Done · 🟡 In Progress · ⛔ Blocked · ⬜ Not Started (stub/placeholder)

**Last updated:** 2026-07-10

## Modules

| Module | Status | Brief / Progress | Notes |
|---|---|---|---|
| auth (login/register/forgot/reset) | 🟡 In Progress | [brief](./active/auth-login-registration-brief.md) · [progress](./active/auth-login-registration-progress.md) | "Hearth" redesign: one-partner registration + couple lifecycle. Chunks 1–2/3 done (backend + login/wizard UI); Chunk 3 (invite screens) ⛔ blocked on design |
| connect (couple-to-couple) | ✅ Done | — (pre-harness) | Built (~309 lines) + e2e |
| dashboard | ✅ Done | — (pre-harness) | Built + e2e |
| profile | ✅ Done | — (pre-harness) | Built + e2e |
| settings | ✅ Done | — (pre-harness) | Built + e2e |
| calendar | ⬜ Not Started | — | `ComingSoonModule` stub |
| finance | ⬜ Not Started | — | `ComingSoonModule` stub |
| goals | ⬜ Not Started | — | `ComingSoonModule` stub |
| memories | ⬜ Not Started | — | `ComingSoonModule` stub |
| messages | ✅ Done | [brief](./completed/couple-messaging-brief.md) · [progress](./completed/couple-messaging-progress.md) | couple messaging (partner + group chat) — full stack + tests |

## How to update this board

When you start a feature, change its row to 🟡 and link its brief/progress files:

```
| memories | 🟡 In Progress | [brief](./active/memories-timeline-brief.md) · [progress](./active/memories-timeline-progress.md) | photo timeline |
```

When you finish, change to ✅ and point the links at `./completed/...`.

## Harness / Infrastructure

| Item | Status | Notes |
|---|---|---|
| Git repository | ✅ Done | Initialized 2026-06-30 |
| Root `.gitignore` | ✅ Done | .NET + Node + db/test artifacts |
| `progress/` tracking system | ✅ Done | This directory |
| `docs/ai-first-development-workflow.md` | ✅ Done | The mandatory workflow |
| Test pyramid (xUnit / Vitest / Playwright) | ✅ Done | Pre-existing; see TESTING_GUIDE |
