# `progress/` — AI-First Progress Tracking

This directory is the **memory of the project across AI sessions**. Saha is built
primarily by AI agents; any agent must be able to stop mid-feature and any other
agent must be able to resume cold, with zero loss of context. That is only
possible if state lives in files — not in a chat history. This folder is that state.

> Read this together with [`docs/ai-first-development-workflow.md`](../docs/ai-first-development-workflow.md),
> which defines the full mandatory workflow. This README explains the *mechanics*
> of the tracking files.

## Layout

```
progress/
├── README.md          ← you are here (mechanics)
├── STATUS.md          ← master board: every feature + current status. Start here.
├── templates/
│   ├── feature-brief-template.md      ← the contract for a feature (write first)
│   └── feature-progress-template.md   ← the stop/resume tracker
├── active/            ← in-progress features live here
│   └── <feature>-brief.md  +  <feature>-progress.md
└── completed/         ← finished features are moved here (history, not deleted)
```

## Naming convention

- One **slug** per feature, `kebab-case`, e.g. `memories-timeline`.
- Each feature has exactly two files while active:
  - `active/<slug>-brief.md`     — the goal & acceptance criteria (the *what/why*)
  - `active/<slug>-progress.md`  — the live checklist & session log (the *where are we*)
- On completion, move **both** files to `completed/` and flip the row in `STATUS.md`.

## The loop (every feature)

1. **Start here:** read [`STATUS.md`](./STATUS.md) to see what exists and what's in flight.
2. Copy `templates/feature-brief-template.md` → `active/<slug>-brief.md`, fill it,
   resolve open questions with the user.
3. Copy `templates/feature-progress-template.md` → `active/<slug>-progress.md`.
4. Add a row to `STATUS.md`.
5. Work the checklist **test-first** (see the workflow doc). Update the progress
   file at the start/end of every session and whenever a checkbox changes.
6. When done: tests green + evidence captured → move both files to `completed/`,
   update `STATUS.md`.

## Rules of thumb

- **The progress file is never stale.** If you touch the feature, you touch its
  progress file in the same session.
- **`Current Focus / Next Step` is sacred.** It is the first thing the next
  session reads — make it actionable (exact file, exact command, exact goal).
- **Evidence over assertion.** "Tests pass" means pasted output, not a claim.
- **Never delete history.** Completed features move to `completed/`, they are not removed.
