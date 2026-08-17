# Test Case Catalogue Summary

## Completion statement

The repository and implemented application surface were reviewed against frontend routes and components, backend controllers and application handlers, domain rules, persistence configuration and migrations, feature flags, environment configuration, product/design documents, existing automated tests, quality reports and the running IntegrationTest application.

The catalogue contains **259 distinct test cases** mapped to **135 control/component units**, **19 frontend route patterns** (including the root redirect and catch-all route), and **35 versioned API operations**. Credentials and tokens were used only through local runtime fixtures; none are reproduced in this catalogue.

On 2026-07-21, the final runtime validation pass exercised the existing real-backend Playwright Chromium suite in the `Asia/Kolkata` timezone. **60/60 tests passed in 2.0 minutes**. This run covered the accessible auth, registration, guard, Connect, messaging, navigation, dashboard, profile, settings and placeholder-module journeys. Source-derived cases that need fault injection, special infrastructure, other browsers, seeded states or unfinished UI remain catalogued with explicit preconditions and limitations.

## Catalogue metrics

| Metric | Total |
|---|---:|
| Feature and quality domains | 12 |
| Frontend route patterns | 19 |
| User-facing route/screen entries excluding the root redirect | 18 |
| Versioned API operations | 35 |
| Inventoried control/component units | 135 |
| Distinct test cases | 259 |
| Existing real-backend Playwright checks rerun | 60 passed / 0 failed |

Counting rules:

- A test case is counted once from a `Case catalogue` row. References repeated in execution-detail ranges and the coverage inventory are not counted again.
- Repeated list/card instances count as one control class unless they have distinct behavior or destinations. The six reaction choices and six dashboard cards are therefore counted individually.
- A frontend route pattern is counted separately when its guard, direct-link behavior or rendered state differs; `/messages` and `/messages/:conversationId` are separate patterns.
- A case's complete specification is the combination of its case-catalogue row and matching ID/range in the same file's `Execution detail` table.

## Test cases by feature

| Feature or quality domain | Prefixes | Cases | Catalogue file |
|---|---|---:|---|
| Login, session, logout and password recovery | AUTH, SES, PWR | 38 | `authentication/login-session-and-recovery.md` |
| Registration, invitations and awaiting-partner lifecycle | REG, INV | 36 | `authentication/registration-and-invitations.md` |
| Shell, routing, dashboard, modules and settings | NAV, DASH, MOD, SET | 28 | `shell/dashboard-navigation-settings.md` |
| Profile, avatar and partner-view mode | PRF | 24 | `profile/profile-and-partner-view.md` |
| Couple discovery and connections | CON | 31 | `connect/connections.md` |
| Conversations, groups, messages, reactions and media | MSG, GRP, THR, TXT, EDT, DEL, REA, MED, CFG | 59 | `messaging/conversations-and-messages.md` |
| Security and privacy | SEC | 15 | `cross-cutting/security-accessibility-responsive-telemetry.md` |
| Reliability, recovery, concurrency, time and scale | REL | 6 | same |
| Accessibility | ACC | 8 | same |
| Responsive and cross-browser behavior | RSP, BRW | 5 | same |
| Telemetry and observability | TEL | 7 | same |
| Deployment and environment configuration | DEP | 2 | same |
| **Total** |  | **259** |  |

The eight dedicated accessibility cases are supplemented by feature-specific coverage; **42 catalogue cases** explicitly exercise accessibility, keyboard, focus, screen-reader, contrast or WCAG behavior. Responsive behavior is explicit in **16 cases**, and **6 cases** explicitly require cross-browser coverage.

## Test cases by priority

| Priority | Meaning | Cases | Share |
|---|---|---:|---:|
| P0 | Release-, security-, authorization- or data-integrity-critical | 144 | 55.6% |
| P1 | Important functional, recovery, accessibility or compatibility coverage | 94 | 36.3% |
| P2 | Secondary UX, content or lower-risk compatibility coverage | 20 | 7.7% |
| P3 | Low-risk informational/stub content | 1 | 0.4% |
| **Total** |  | **259** | **100%** |

## Positive versus negative coverage

Cases were classified by their primary test purpose; mixed cases deliberately combine a valid path with its relevant invalid, boundary or recovery variations.

| Coverage orientation | Cases | Examples |
|---|---:|---|
| Positive/happy-path focused | 38 | Valid sign-in/registration, dashboard rendering, request acceptance, message send, profile update, group creation |
| Negative/edge/quality focused | 128 | Validation, authorization, IDOR, expiry, replay, failures, concurrency, boundaries, accessibility and compatibility |
| Mixed positive and negative | 93 | Controls or workflows whose nominal state and failure/boundary states must be verified together |
| **Total** | **259** |  |

Negative and edge coverage includes empty and oversized values, Unicode and whitespace, malformed/injection-shaped input, duplicated and concurrent actions, stale responses, offline/timeout/4xx/5xx behavior, session expiry, foreign-resource access, large datasets, refresh/history, and partial dependency failures.

## Role, permission and lifecycle coverage

| Actor or state | Covered boundaries |
|---|---|
| Guest | Guest routes, feature-flagged registration, protected-route redirects, auth enumeration and anonymous API limits |
| Awaiting registrant | Invite/waiting threshold, polling, invitation creation, forbidden Complete-only modules and Connect operations |
| Complete Husband and Wife | Identity-correct login/session/profile/dashboard behavior with a shared couple password and state |
| Invitation recipient | Valid, invalid, expired, reused and raced invitation acceptance; opposite-role assignment |
| Connection initiator and recipient | Incoming/outgoing control visibility, accept/reject actor enforcement, duplicates and terminal-state races |
| Group owner couple | Owner-only rename plus shared couple-level ownership behavior |
| Non-owner group participant | Conversation access, add/pin/hide policy and forbidden rename |
| Message sender | Sender-only edit/delete, including deleted/media/foreign message boundaries |
| Other participant partner | Read/react without edit/delete authority |
| Unrelated authenticated couple | Couple-scoped Connect, profile, conversation and message IDOR protection |
| Partner-view mode | Read-only presentation, persistent banner and explicit warning that it is not server-side impersonation |
| Inactive, deleted, malformed and expired states | Authentication, tokens, invitations, connections, resource lookup and cache recovery |

The backend authorization boundary remains authoritative even when the frontend hides a control. Cases explicitly include direct API attempts with unrelated identities, forged IDs, mismatched route IDs, missing/expired sessions and role-inappropriate actions.

## Accessibility coverage

The catalogue covers keyboard-only operation, focus order and restoration, form labels and error associations, radiogroup/tab/dialog/toggle state, live announcements, route and modal focus, active navigation, icon-button names, contrast, non-color cues, target size, 200%/400% reflow, forced colors, reduced motion, image alternatives, video policy, landmarks, headings and document titles.

Automation is feasible for semantic assertions, accessibility-tree inspection, axe-style scans, keyboard flows, focus state and viewport reflow. VoiceOver/NVDA announcements, cognitive clarity, video captions, forced-colors usability and visual contrast still require targeted manual review.

## Responsive and cross-browser coverage

The planned viewport matrix is 320, 375, 768, 1024 and 1440 pixels, including resize/rotation during open drawers, forms, dialogs and message composition. It covers auth forms, the desktop/mobile app shell, dashboard cards, Connect tabs/cards, profile forms, settings choices and messaging master/detail behavior with long localized content.

The engine matrix is Chromium, Firefox and WebKit, with additional mobile Safari/Chrome attention for touch targets, virtual keyboards, safe areas, date/file pickers, media codecs, cookies and storage. The final real-backend validation run was Desktop Chromium only; cross-engine and mobile cases remain valid catalogue coverage but are not marked runtime-observed.

## Areas requiring mocks, seeded data or special environments

| Area | Required setup |
|---|---|
| Network and API recovery | Route proxy/service double for latency, out-of-order responses, offline, timeout, 401/403/404/409/413/429/500 and response-loss-after-commit |
| Authentication and time | Short-lived/rotated/revoked tokens, controllable clock and timezone, multiple browser tabs/contexts and a low-limit rate policy |
| Validation and persistence boundaries | Seeded duplicates, inactive/deleted/malformed records, exact size/length boundaries and disposable database inspection |
| Concurrency | Parallel API/browser contexts for register, invitation, reset, connection, group and message races |
| Scale | 100+ connections, conversations, participants/messages, equal timestamps and paginated histories |
| Password recovery | SMTP test inbox or token fixture that exposes a reset code without logging it |
| Uploads/media | Azurite or production-like blob storage plus safe boundary, corrupt, spoofed and polyglot fixtures |
| Telemetry/operations | Capturable logs, metrics/traces, Loki/Grafana or test exporters, blocked storage and failing dependency configurations |
| Deployment | HTTPS/HSTS deployment, Azure SQL migration environment, concurrent startup/restart and sanitized environment matrix |
| Accessibility/browser/device | Chromium/Firefox/WebKit projects, mobile devices or emulation, axe tooling, VoiceOver/NVDA and forced-color/zoom setups |

## Inaccessible or blocked functionality

| Functionality | Exact limitation | Catalogue treatment |
|---|---|---|
| Invitation management UI | `/invite` and `/invite/accept` are intentional placeholders because approved screens are absent | Placeholder routes/controls are observed; complete invitation lifecycle is catalogued API-first |
| Successful browser password reset | Local email service does not provide a browser-accessible mailbox/code | Validation and enumeration behavior are observed; successful reset, replay and session revocation require a mailbox/token fixture |
| Profile picture and message media | End-to-end blob-backed storage was not available in the runtime baseline | UI/API/type/size/security/orphan/rendering cases are retained and marked for storage-enabled execution |
| Group conversation settings | Group creation was observed, but rename/add/pin/hide were not fully driven in the baseline | Owner, participant, invalid-membership, per-couple state, concurrency and recovery cases are source-derived |
| Mobile, cross-browser and screen reader | Baseline comprehensive run used Desktop Chromium | Full viewport/engine/SR cases are retained with required setup |
| Production security and operations | TLS/HSTS, real rate limits, SMTP/blob, Azure SQL migration and observability exporters need dedicated environments | Configuration, security, resilience and audit cases are catalogued without claiming local observation |
| Advertised Finance/Memories/Goals/Calendar features | Only `ComingSoonModule` implementations exist | Current placeholder content, guards, navigation, theme and responsiveness are covered; future functionality is out of current product scope |

## Assumptions and residual coverage risks

- The repository and running IntegrationTest behavior as of 2026-07-21 are the baseline. Future designs or feature-flag changes require an inventory refresh.
- Registration is enabled for comprehensive exploration but is off in the default frontend configuration until invitation screens are approved.
- `partnerName` currently represents the signed-in partner and is used as a transient fallback for the other partner on the dashboard; expected semantics need a product decision.
- A hard reload intentionally has no persisted access token, so the first protected call can return 401 before silent refresh succeeds. Proactive boot refresh behavior is not defined.
- Messaging has no push or polling transport; cross-account freshness currently requires an explicit refetch/navigation/reload. Near-real-time expectations need a product decision.
- Reconnecting after a rejected connection is not explicitly defined and may conflict with the unique pair constraint; CON-031 requires the rule to be decided.
- Partner-view mode is presentation state, not impersonation. Mutation behavior outside Profile needs an explicit product policy so the read-only banner cannot mislead users.
- Unsaved profile edits on tab/route navigation and invitation resend/replacement semantics need explicit product decisions.
- The custom group dialogs require targeted verification for Escape, focus trapping and focus restoration; hover-only message actions need keyboard and touch validation.
- Existing automated coverage is evidence, not a substitute for the catalogue. The legacy `tests/e2e/real` fixtures use an older registration contract; the current `tests/e2e/comprehensive` suite is the valid real-backend baseline.

## Catalogue files

- `00-coverage-inventory.md` — route, control, API, role and limitation traceability.
- `authentication/login-session-and-recovery.md` — login, session, logout and password recovery.
- `authentication/registration-and-invitations.md` — wizard, invitation API and awaiting-partner lifecycle.
- `shell/dashboard-navigation-settings.md` — routing, shell, dashboard, module placeholders and settings.
- `profile/profile-and-partner-view.md` — profile CRUD, avatar and partner-view behavior.
- `connect/connections.md` — search, request, accept/decline, state and cross-feature propagation.
- `messaging/conversations-and-messages.md` — lists, groups, threads, messages, reactions, media and settings.
- `cross-cutting/security-accessibility-responsive-telemetry.md` — platform security, resilience, accessibility, compatibility, telemetry and deployment.
