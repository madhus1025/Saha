<!--
  FEATURE PROGRESS TEMPLATE  (stop & resume tracker)
  Copy this file to:  progress/active/<feature-name>-progress.md
  Update it CONTINUOUSLY — at minimum at the start and end of every session, and
  whenever a checklist item changes state. This file is the single source of
  truth for "where are we" so any AI can resume cold.
  When the feature is Completed, move both this file and the matching -brief.md
  to progress/completed/ and update progress/STATUS.md.
-->

# Feature: [Feature Name]

**Slug:** `feature-name`
**Status:** In Progress / Blocked / Completed
**Brief:** [./feature-name-brief.md](./feature-name-brief.md)
**Started:** [YYYY-MM-DD]
**Last Updated:** [YYYY-MM-DD]
**AI Session:** [model / session identifier — append a new line per session]

## Clarifications & Key Decisions
- [YYYY-MM-DD] Decision: ... — Rationale: ...

## Steps & Checklist
> Test-first order is mandatory. Do not check "Implemented feature" before tests exist and fail for the right reason.

- [ ] Reviewed spec & generated clarity (brief approved)
- [ ] Created this progress file + brief
- [ ] Wrote comprehensive tests (unit / integration / e2e) — they FAIL initially
- [ ] Ran full test suite to capture green BASELINE (pre-change)
- [ ] Implemented backend (domain → application → infrastructure → API)
- [ ] Implemented frontend (module, hooks, pages, schemas)
- [ ] Verification loop completed — all NEW + existing tests green
- [ ] Coverage targets met (90% line / 85% branch)
- [ ] Captured evidence (test output / screenshots) below
- [ ] Updated documentation
- [ ] Moved to progress/completed/ and updated STATUS.md

## Current Focus / Next Step
> The FIRST thing the next session should read. Be specific: file paths, exact command to run, what "done" looks like for the next step.
- ...

## Test Evidence
> Paste command output, coverage summaries, and link screenshots. This is the evidence-based part of the workflow.
```
$ cd frontend && npm run test
... (paste result)
```

## Notes, Risks & Open Items
- ...

## Session Log
- [YYYY-MM-DD] [model] — what was done this session, what's left.
