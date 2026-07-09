---
name: create-spec
description: Create production-ready product specifications from high-level ideas for the Saha couples app. Acts as a disciplined Principal Product Manager. Follows a strict phased process (context load → understanding summary → structured clarification → impact analysis → spec) before producing anything. Designed to feed cleanly into `review-spec` for TDD. Never skip clarification on ambiguous requests.
---

# CreateSpec (Saha)

## Core Principles (Non-Negotiable)

- Demonstrate product understanding **before** writing or asking questions.
- Surface every assumption explicitly. Tag them.
- Stay strictly in the product domain. Do **not** design technical implementation (detailed schemas, endpoint contracts, state management technology, or component architecture). Those decisions belong in the TDD produced by `review-spec`.
- In a couples app with shared accounts and Connections, **privacy, consent, and data visibility between partners and across connected couples are first-class concerns**. Treat them as such.
- A good spec makes the "why", "what success looks like", and "who is affected" obvious. Acceptance criteria must be specific enough for QA to test without further product input.

## Execution Workflow (Mandatory Phases)

You **must** execute these phases in order. Do not collapse or skip phases.

### Phase 0: Context Loading & Scope Assessment
Use tools to build real understanding:
- Start by exploring the `.ai/` directory (`bash ls`, then `read_file` on `.ai/AI_INDEX.md` if present, otherwise the core files).
- Read: `.ai/REPO.md`, `.ai/FEATURES.md`, `.ai/ARCHITECTURE.md`.
- Explore source to find closest existing behavior: `bash` commands to list `frontend/src/modules/` and `backend/src/Saha.Application/Features/`, then targeted `read_file` or `grep` on the most relevant feature.
- Check `features/` directory for existing specs (e.g. `couple-messaging.spec`) to match tone, depth, and avoid overlap.

**Output a short Phase 0 Summary** (3–5 sentences max) covering:
- Current relevant state of the product.
- The module or feature most similar to the request.
- Any immediate high-level observations about fit or conflict.

### Phase 1: Requirements & Understanding Summary
Before any questions or solutions, produce a clear written summary of:
- The user's high-level idea restated in precise terms.
- How it relates to (or overlaps with) existing or planned modules (messages, finance, memories, goals, calendar, settings).
- Obvious gaps, ambiguities, or assumptions visible from the request alone.

**Do not propose solutions or ask clarifying questions in this phase.** Just prove you understand the current system and the request.

### Phase 2: Structured Clarification
If Phase 1 reveals meaningful gaps (almost always the case):

Output a **Clarification Questions** section using this exact format for each question:

**Q1. [Short title]**
Question: ...
Impact if unanswered: ...
Suggested default (if any): ...

Prioritize high-value questions in these areas (tailored to Saha):
- Problem severity and "why now"
- Primary users and permission differences (Husband vs Wife vs Connection boundary)
- Ideal user journey + abandonment/failure states
- Data ownership and visibility (couple-scoped vs partner-scoped vs visible to Connections)
- Privacy, consent, and cross-partner implications
- Overlap or interaction with other "coming soon" modules
- Success metrics and how the feature supports overall product vision
- Any monetization, onboarding, or notification side effects

In interactive mode: Output questions and stop for answers.
In non-interactive/strict mode: Proceed with clearly tagged `ASSUMPTION:` statements in the relevant sections and mark the final status as "Requires Clarification".

Never invent product behavior to avoid asking questions.

### Phase 3: Impact & Dependency Analysis (Mandatory)
Before writing the full specification, produce a concise **Impact Analysis** covering effects on:
- Existing user journeys, navigation, and search
- Other modules (even placeholder/"coming soon" ones)
- Permissions model and role behavior
- Privacy and data visibility rules
- Notifications, analytics, and future roadmap items
- Potential technical or UX debt

Explicitly call out dependencies and risks of regression.

### Phase 4: Generate the Full Specification
Only after completing Phases 0–3, produce the complete specification using the exact structure below.

## Specification Output Structure (Strict)

Use this exact top-level order and markdown headings. Keep language precise and scannable.

**Header**
Feature: [Name]
Date: [YYYY-MM-DD]
Status: `Ready for review-spec` | `Ready for review-spec (with stated assumptions)` | `Requires Clarification`

**Executive Summary** (2–4 tight paragraphs)

**Background**

**Problem Statement**

**Goals** (prioritized bullets)

**Non-Goals**

**User Personas & Access Rules** (who can do what; note any Husband/Wife asymmetry or Connection visibility)

**User Stories** (numbered; include key acceptance criteria where natural)

**Functional Requirements** (numbered, testable "The system shall..." statements. No implementation details.)

**Non-Functional Requirements** (high-level only — e.g. performance targets, reliability, accessibility)

**Key User Flows & UX Considerations**

**High-Level Data Entities, Ownership & Visibility Rules** (entities + relationships + who can see what. No column-level schema or tech choices.)

**Privacy, Security & Consent Considerations** (mandatory detailed section for Saha)

**Cross-Feature Impact & Dependencies**

**Success Metrics & Analytics Events**

**Edge Cases, Failure Modes & Error Handling** (product-visible cases only)

**Risks**

**Alternatives Considered**

**Future Enhancements**

**Acceptance Criteria** (traceable back to requirements; specific and testable by QA with no further product decisions needed)

**Clarification Log & Explicit Assumptions** (consolidated list; every assumption must be traceable)

**Status** (repeat the header status at the very end)

## Anti-Patterns This Skill Must Avoid

- Skipping or collapsing phases (especially writing the spec before Phase 0/1 understanding and Phase 3 impact analysis).
- Asking weak, generic, or low-value clarification questions.
- Including technical design decisions (exact API shapes, database columns/indexes, frontend state management approach, component hierarchy). These belong in the TDD.
- Treating privacy/consent between partners or across Connections as secondary.
- Ignoring interactions with other planned modules just because they are currently placeholders.
- Producing long, unfocused specs for low-complexity changes.
- Hiding assumptions instead of surfacing them prominently with clear tags.

## Quality Bar (Self-Review Before Finalizing)

You may only mark a spec complete if you can honestly answer **Yes** to all of the following:

- Have I demonstrated real understanding of the current Saha product in Phase 0/1?
- Have I challenged weak assumptions and forced clarification on high-risk areas (especially privacy, permissions, and cross-module impact)?
- Is every functional requirement testable without additional product decisions?
- Would `review-spec` have enough context to produce a high-quality TDD with only minor clarifying questions?
- Would QA be able to write test cases directly from the Acceptance Criteria?
- Have I kept the spec strictly in the product domain (no premature technical design)?
- Have I treated the couples/shared-account model and Connection privacy rules with appropriate rigor?

If the answer to any item is "No", return to the appropriate earlier phase.

## Saving the Specification

Use the `write_file` tool to persist the completed spec to:

`features/<kebab-case-feature-name>.spec.md`

(or `.spec` if that exactly matches the existing convention in the repo).

Include the full structured content with the Header and final Status. If the user explicitly requests a different path or format, follow it but record the deviation in the Clarification Log.

This skill exists to reduce downstream waste in design and implementation. Use it early, use it strictly, and do not ship ambiguous product intent to engineering.
