# Coverage Inventory and Traceability Matrix

## Scope and evidence

- Repository reviewed: React routes/pages/components/stores/API clients; ASP.NET controllers, middleware, validators, handlers, domain entities/value objects, persistence configuration/migrations, infrastructure services/configuration; product/design/progress/testing/telemetry/deployment documentation; existing unit, integration, and Playwright suites.
- Runtime baseline: local Vite + IntegrationTest API, Playwright Chromium, 2026-07-21. The existing real-backend comprehensive suite passed **60/60** in 2.0 minutes. Runtime credentials were consumed only from local/test fixtures and are not reproduced here.
- Counting rule: a “control” is an interactive control or one independently testable rendered/system component class. Repeated list items count once; the six reaction choices and six dashboard cards count individually because each has a distinct label/destination. The inventory contains **135 control/component units**.
- Catalogue total: **259 distinct test cases**. Counts include only rows in each file's `Case catalogue`; repeated ID/range references in `Execution detail` and this inventory are not counted again.
- Status: **Covered** means cases include observed and source-derived behavior; **Partial/runtime-blocked** means cases exist but require the named environment/mock/design to execute fully; **Stub covered** means the implemented placeholder itself is covered, not its advertised future functionality.

Each case is read by joining its row in `Case catalogue` with the matching ID or ID range in that file's `Execution detail`. Together those two rows provide the case-specific feature, screen, control, scenario/objective, priority, type, role, automation feasibility and source reference, plus preconditions, test data, detailed steps, expected result and covered negative/edge conditions.

## Frontend route matrix

| Route | Guard/state | Screen | Runtime status | Primary cases |
|---|---|---|---|---|
| `/` | Any | Replace redirect to dashboard then applicable guard | Observed through navigation baseline | NAV-001 |
| `/login` | Guest | Login | Observed | AUTH-001–010 |
| `/register` | Guest; feature flagged | Three-step one-partner registration | Observed with flag enabled | REG-001–026 |
| `/forgot-password` | Guest | Forgot password | Observed | PWR-001–006 |
| `/reset-password` | Guest | Reset password | Validation observed; real mail/code blocked | PWR-007–014 |
| `/invite/accept` | Guest | Invitation acceptance placeholder | Observed placeholder; API reviewed | INV-005–008 |
| `/waiting` | Protected AwaitingPartner | Waiting threshold | Observed landing; live accept transition needs timer/setup | INV-009–010 |
| `/invite` | Protected AwaitingPartner | Invitation management placeholder | Observed placeholder; API reviewed | INV-001–004 |
| `/dashboard` | Protected Complete | Dashboard | Observed | DASH-001–005 |
| `/messages` | Protected Complete | Conversation list/split empty detail | Observed | MSG-001–009, GRP-001–008 |
| `/messages/:conversationId` | Protected Complete + participant at API | Thread/detail | Observed happy flows | THR/TXT/EDT/DEL/REA/MED/CFG cases |
| `/connect` | Protected Complete | Connections | Observed | CON-001–031 |
| `/profile` | Protected Complete | Profile/partner view | Observed except upload | PRF-001–024 |
| `/settings` | Protected Complete | Theme/settings stubs | Observed | SET-001–008 |
| `/finance` | Protected Complete | Coming Soon | Observed | MOD-001, MOD-005 |
| `/memories` | Protected Complete | Coming Soon | Observed | MOD-002, MOD-005 |
| `/goals` | Protected Complete | Coming Soon | Observed | MOD-003, MOD-005 |
| `/calendar` | Protected Complete | Coming Soon | Observed | MOD-004, MOD-005 |
| `*` | Any | Not Found | Observed | NAV-009 |

## Control/component traceability

| Feature | Page or route | Component or control (units) | Available states/behaviors | User roles | Test cases created | Test case file | Coverage status | Known limitation / inaccessible scenario |
|---|---|---:|---|---|---:|---|---|---|
| Login | `/login` | Username, password, visibility, Sign in (4) | empty, invalid, valid, pending, error, visible/hidden | Guest; either partner after submit | 10 | `authentication/login-session-and-recovery.md` | Covered | Low production rate limit needs separate config |
| Login | `/login` | Forgot, Create home, Invitation links (3) | enabled, feature redirect, history | Guest | 3 | same | Covered | Invitation destination is placeholder |
| Registration shell | `/register` | Progress, sign-in link, step navigation state (3) | steps 1–3, back, unmount, flag off | Guest | 4 | `authentication/registration-and-invitations.md` | Covered | Default runtime flag is off outside comprehensive config |
| Registration step 1 | `/register` | Name, username, DOB, email, phone, Continue (6) | empty, valid, invalid, min/max, async, preserved | Guest | 13 | same | Covered | Availability/network fault vectors need interception |
| Registration step 1 | `/register` | Wife/Husband radio options (2) | unset, checked, arrow wrap, focus/error | Guest | 2 | same | Covered | Keyboard case source-reviewed; targeted run required |
| Registration step 1 | `/register` | Username availability status (1) | idle/checking/available/taken/failed/stale | Guest | 3 | same | Covered | Failure/race requires mock |
| Registration step 2 | `/register` | Password/confirmation (2) | empty, byte/char boundaries, match/mismatch | Guest | 4 | same | Covered | — |
| Registration step 2 | `/register` | Visibility, strength meter (2) | show/hide; absent/weak/medium/strong | Guest | 2 | same | Covered | Strength is advisory by design |
| Registration step 2 | `/register` | Continue/Back (2) | enabled submission, navigation, preservation | Guest | 3 | same | Covered | — |
| Registration step 3 | `/register` | TogetherID, availability (2) | uppercase, invalid, checking/available/taken/failed | Guest | 4 | same | Covered | Availability failure requires mock |
| Registration step 3 | `/register` | Open home/Back (2) | pending, success, duplicate, server failure | Guest → Awaiting | 5 | same | Covered | Concurrency/database inspection requires fixture |
| Forgot password | `/forgot-password` | Identifier/Send (2) | empty, valid, unknown, pending, success/error-masked | Guest | 6 | `authentication/login-session-and-recovery.md` | Covered | SMTP recipient verification needs mail double |
| Forgot password | `/forgot-password` | Enter code/Back links (2) | success panel, history/refresh | Guest | 2 | same | Covered | — |
| Reset password | `/reset-password` | Identifier, code, new, confirm (4) | required/format/complexity/match, valid token states | Guest | 8 | same | Partial/runtime-blocked | Real code capture/mailbox unavailable in browser baseline |
| Reset password | `/reset-password` | Visibility (1) | shown/hidden and accessible state | Guest | 1 | same | Covered | Accessible name is absent in current source; case will expose it |
| Reset password | `/reset-password` | Reset/Resend (2) | pending/success/failure/retry/navigation | Guest | 7 | same | Partial/runtime-blocked | Full successful reset needs token/mail fixture |
| Invitation | `/invite` | Back to threshold (1) | placeholder CTA/guards | Awaiting registrant | 4 | `authentication/registration-and-invitations.md` | Stub covered | Approved design absent |
| Invitation acceptance | `/invite/accept` | Back to sign in (1) | placeholder/direct link | Guest invitee | 4 | same | Stub covered | Acceptance UI not implemented; API cases exist |
| Waiting | `/waiting` | Polling threshold/Manage invitation (2) | awaiting, background, complete redirect, failure/expiry | Awaiting registrant | 4 | same | Partial/runtime-blocked | Live 15s acceptance transition not baseline-driven |
| Auth/session system | API/client | Refresh/logout/guards/storage (4) | valid/expired/revoked/reused/concurrent/offline | Guest, Awaiting, Complete | 17 | `authentication/login-session-and-recovery.md` | Covered by catalogue | Token manipulation/time/multi-tab setup needed |
| Desktop sidebar | App routes | Eight navigation links (8) | active/inactive, direct/history, keyboard | Complete partner | 6 | `shell/dashboard-navigation-settings.md` | Covered | Repeated link destinations consolidated in cases |
| Sidebar | App routes | Sign out (1) | pending, success/failure, repeat, history | Complete partner | 3 | same | Covered | — |
| Mobile shell | App routes | Open, Close, overlay (3) | open/closed, resize, focus/scroll | Complete partner | 2 | same | Partial/runtime-blocked | Mobile pass not in baseline Chromium desktop run |
| Top bar | App routes | Theme toggle/profile link (2) | light/dark/system interaction, current identity | Complete partner | 5 | same | Covered | Native/system live change needs emulation |
| Partner banner | App routes | Exit (1) | visible/hidden, cross-route, reload | Viewing-as partner | 6 | profile/shell files | Covered | Product semantics outside Profile need clarification |
| Dashboard | `/dashboard` | Greeting, ID, couple card (3) | clock boundaries, both identities, loading/error/long | Complete partner | 4 | `shell/dashboard-navigation-settings.md` | Covered | Failure/malformed DTO needs mock |
| Dashboard | `/dashboard` | Six module cards (6) | visible, keyboard/pointer navigation | Complete partner | 2 | same | Covered | — |
| Placeholder modules | Four routes | Four ComingSoon panels (4) | content, theme, responsive, guards | Complete partner | 5 | same | Stub covered | Advertised features are not implemented |
| Settings | `/settings` | Light/Dark/System (3) | selected, persisted, OS change, storage fault | Complete partner | 6 | same | Covered | System live update/source storage faults need emulation |
| Settings | `/settings` | Notifications and Privacy cards (2) | Coming soon/content/theme | Complete partner | 2 | same | Stub covered | No settings controls implemented |
| Profile navigation | `/profile` | My/Partner tabs (2) | active, lazy load, loading/error, rapid switch | Partner | 4 | `profile/profile-and-partner-view.md` | Covered | Failure paths need mock |
| Profile self | `/profile` | Edit/camera (2) | present/hidden, edit/read-only/upload pending | Self/partner view | 7 | same | Partial/runtime-blocked | Blob-backed upload not baseline-driven |
| Profile edit | `/profile` | Name, DOB, email, phone (4) | prefilled, validation/boundary/conflict | Self | 8 | same | Covered | Email collision/time boundaries need seed/time |
| Profile edit | `/profile` | Save/Cancel (2) | pending/success/error/unsaved navigation | Self | 6 | same | Covered | Unsaved-navigation requirement not specified |
| Partner view | `/profile` | View as partner (1) | enter, cross-route, read-only, reload | Partner | 5 | same | Covered | Other feature mutation semantics need decision |
| Connect navigation | `/connect` | Three tabs (3) | active, keyboard, query state | Complete couple | 3 | `connect/connections.md` | Covered | Tab ARIA semantics should be verified |
| Connect notification | `/connect` | Pending badge (1) | zero/nonzero, incoming/outgoing, first load | Complete couple | 2 | same | Covered | — |
| Connected list | `/connect` | Empty CTA and card class (2) | loading/empty/large/error/populated | Complete couple | 5 | same | Covered | Large data needs seed |
| Connect search | `/connect` | Search/Connect (2) | under-min, loading/result/no-result/status/failure/reconnect-after-reject | Complete couple | 13 | same | Covered | Explicit query error UI absent; rejected reconnect may hit unique-row conflict |
| Pending requests | `/connect` | Accept/Decline (2) | incoming only, pending/success/failure/race | Recipient couple | 8 | same | Covered | Reject mutation lacks onError toast in current source |
| Pending requests | `/connect` | Outgoing card (1) | initiator label, no actions | Initiator couple | 3 | same | Covered | — |
| Conversation list | `/messages` | New and row class (2) | loading/error/empty/pinned/active/preview/time | Complete participant | 10 | `messaging/conversations-and-messages.md` | Covered | Large/time/failure cases need fixtures |
| Thread header/history | `/messages/:id` | Mobile Back, Settings, Load earlier (3) | conditional, loading/end/error/pagination | Participant | 9 | same | Covered | Scroll-position preservation needs targeted run |
| Composer | `/messages/:id` | Attach, textarea, Send (3) | empty/draft/edit/pending/error/media | Participant | 14 | same | Covered/partial media | Media needs blob/local storage |
| Message actions | `/messages/:id` | React/Actions (2) | own/other/deleted, open/close/focus | Participant/sender | 10 | same | Partial accessibility | Current hover-only affordance needs mobile/keyboard review |
| Reaction picker | `/messages/:id` | Six reactions (6) | add/change/remove/count/concurrent/invalid | Participant | 5 | same | Covered by catalogue | Concurrent multi-user setup needed |
| Reaction summary | `/messages/:id` | Reaction chip class (1) | mine/other/count/remove | Participant | 3 | same | Covered | — |
| New group dialog | `/messages` | Dialog close/backdrop (2) | open/close/focus/Escape/stacking | Complete partner | 3 | same | Partial accessibility | Current custom modal lacks explicit focus trap/Escape |
| New group dialog | `/messages` | Name/search/select/Cancel/Create (5) | validation, no connection, filter, selection, pending/failure | Complete partner | 8 | same | Covered | Full failure/concurrency needs mock |
| Group settings | Group thread | Rename/Save/Add/Pin-or-Unpin/Hide/Close (6) | owner/nonowner, eligible/empty, per-couple state, failures | Group participants | 8 | same | Partial runtime | Existing baseline opens/creates group but does not fully drive all settings |
| Media rendering | Thread | Image/video attachment class (1) | valid/broken/unsafe/cross-browser | Participant | 6 | same | Partial/runtime-blocked | Blob storage and browser codec matrix required |
| Cross-cutting platform | Browser/API | Interceptor, telemetry, headers, limiter, upload, error mapper (6) | auth/fault/privacy/security/accessibility/deploy | All/system | 43 | `cross-cutting/security-accessibility-responsive-telemetry.md` | Covered by catalogue | Many cases require special environments/log access |

## API operation inventory

| Area | Operation patterns reviewed | Count | Representative case ranges | Limitations |
|---|---|---:|---|---|
| Auth/lifecycle | register, invitations create/accept, availability, session, login, refresh, forgot, reset, logout | 10 | REG, INV, AUTH, SES, PWR | Invitation/reset UIs incomplete or environment-dependent |
| Connect | list/filter, search, request, accept, reject | 5 | CON-007–029 | Concurrency/large states need seeded fixtures |
| Conversations | list, detail, create group, rename, add couple, pin, unpin, hide | 8 | MSG, GRP, CFG | Full settings not baseline-driven |
| Messages | list page, send text/media, edit, delete, react, remove reaction | 7 | THR, TXT, EDT, DEL, REA, MED | Blob media blocked; concurrency needs parallel contexts |
| Profile | self, partner, update, picture upload | 4 | PRF-001–018 | Upload storage required |
| Telemetry | event batch ingest | 1 | TEL-001–007 | Log/metrics/export verification requires observability environment |
| **Total** |  | **35** |  |  |

## Roles, permissions, and state matrix

| Actor/state | Allowed UI | Forbidden/redirected UI | Critical API boundary cases |
|---|---|---|---|
| Guest | Login, recovery, accept placeholder; registration only when flagged | Protected and threshold routes → login | Anonymous auth/telemetry only; protected APIs 401 |
| Awaiting registrant | Invite and Waiting | Complete modules → Waiting; guest routes → Waiting/Invite | Session/invitation allowed; Connect/Messaging complete-home rules |
| Complete Husband | All modules as own identity | Guest/threshold routes redirect | Couple-scoped access; sender/owner distinctions |
| Complete Wife | Same capabilities with own identity | Same | Identity response must remain Wife while sharing couple password/state |
| Group owner couple | Group rename plus participant actions | — | Rename owner-only; state shared at couple level |
| Non-owner participant couple | Group participant actions, pin/hide own couple state | Rename absent/403 | Conversation access; add policy; no cross-couple state mutation |
| Message sender partner | Edit/delete own message | Edit/delete others absent/403 | Sender ID enforcement |
| Other participant partner | Read/react | Edit/delete other sender absent/403 | Reaction membership; conversation access |
| Unrelated authenticated couple | Own data only | Foreign resources hidden | Conversation/message 404; profile/connect IDOR blocked |
| Partner-view mode | Read-only profile representation plus banner | Self profile mutation hidden | Not server impersonation; wider mutation policy flagged for clarification |

## Known blocked or special-environment coverage

| Area | Exact blocker | Catalogue treatment |
|---|---|---|
| Invitation UI | `/invite` and `/invite/accept` intentionally placeholders; approved designs absent. | Placeholder controls covered; complete backend contracts/cases documented as API-first. |
| Full password reset | Local null/console email does not provide a browser-accessible mailbox/code. | Token/mail fixture or SMTP test inbox required; all lifecycle cases retained. |
| Profile/media uploads | Blob/Azurite or production-like storage and boundary files required. | UI/API/security/orphan cases retained and marked partial. |
| Group settings | Baseline suite creates group but does not fully operate rename/add/pin/hide. | Source-derived cases retained; second exploration targets accessible controls. |
| Mobile/cross-browser/SR | Baseline config ran Desktop Chromium only. | Viewport/Firefox/WebKit/real SR matrices explicitly catalogued. |
| Production security/ops | TLS/HSTS, real rate limits, SQL migration, SMTP/blob, Grafana exporters/logs need dedicated environments. | Configuration, resilience, audit and telemetry cases explicitly catalogued. |
