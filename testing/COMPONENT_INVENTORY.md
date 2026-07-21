# Component & Workflow Inventory

Status: ✅ automated coverage · 🟨 partial/stub-verified · ⬜ documented, not automated.

## Authentication

| Component | Actions | Key states | Status |
|-----------|---------|-----------|--------|
| LoginPage | sign in (either username), toggle password, links to register / accept-invite / forgot | valid, invalid creds, unknown user, empty (validation), awaiting-partner→/waiting | ✅ |
| RegisterPage (wizard shell) | step 1→2→3, progress dots, back | step transitions | ✅ |
| RegisterStepYourHalf | name/username/DOB/role/email/phone, live username availability | valid, <16, bad username, taken username | ✅ |
| RegisterStepOneKey | shared password + confirm, strength meter, show/hide | length rule, mismatch | 🟨 (happy path ✅) |
| RegisterStepYourDoor | TogetherID + live availability | available/taken verdict, format | ✅ |
| RoleToggle | select Wife/Husband (radiogroup, arrow keys) | selected | ✅ (click); ⬜ keyboard arrows |
| PasswordStrengthMeter | reflects strength | weak/strong | ⬜ unit-only |
| ForgotPasswordPage | request code | success (enumeration-safe for real + unknown) | ✅ |
| ResetPasswordPage | code + new password | code/format/mismatch validation | ✅ (validation); ⬜ full reset w/ real code (needs mailbox) |
| AcceptInvitationPage / InvitePage | placeholder CTA | — | 🟨 placeholder verified |
| WaitingPage | polls session, "Manage the invitation" | awaiting → auto-advance on completion | 🟨 (lands ✅; ⬜ live auto-advance) |

## App shell / navigation

| Component | Actions | Status |
|-----------|---------|--------|
| Sidebar | 7 nav links + Settings + Sign out | ✅ (nav + logout) |
| TopBar | theme toggle, profile link, mobile menu | ✅ (theme); 🟨 mobile menu |
| CompleteCoupleRoute / ProtectedRoute / GuestRoute | redirects | ✅ |
| ComingSoonModule (Finance/Memories/Goals/Calendar) | renders placeholder | ✅ |
| NotFoundPage | 404 | ✅ |
| Toaster | success/error/default toasts | ✅ (asserted across flows) |

## Dashboard

| Component | Actions | Status |
|-----------|---------|--------|
| Greeting + TogetherID chip | time-based greeting | ✅ |
| Couple card | both partners (username + partner name) | ✅ |
| Module grid (6 cards) | navigate to module | ✅ |

## Connect

| Component | Actions | Key states | Status |
|-----------|---------|-----------|--------|
| Tabs (Connected/Pending/Find) | switch; **pending count badge** | badge visible from other tabs (BUG-004) | ✅ |
| Search | search by TogetherID | results, no-match, <2 chars, connect | ✅ |
| Pending card | Accept / **Decline** (a11y label, BUG-006) | incoming/outgoing | ✅ |
| Connected card | shows connected couples | list, empty | ✅ |
| SendConnectionRequest | request; **complete-couple guard** (BUG-003) | 201 / already / self / incomplete-refused | ✅ (API) |

## Messaging

| Component | Actions | Key states | Status |
|-----------|---------|-----------|--------|
| ConversationList | select, New group, pinned, preview, **relative time (BUG-001)** | loading skeleton, empty, active | ✅ |
| ChatThread / composer | send, Enter-to-send, empty prompt | loading, empty ("Say hello"), **time "now" (BUG-001)** | ✅ |
| MessageBubble actions | edit, delete (tombstone), react/unreact | own vs other, edited, deleted | ✅ |
| NewGroupDialog | name + search connected couples + create | no connections, no match | ✅ |
| ConversationSettingsDialog | rename, add couple, pin, hide | owner-only rename | ⬜ (opens for groups; not fully driven) |
| Media attachment | image/video upload | — | ⬜ needs Azurite |

## Profile

| Component | Actions | Status |
|-----------|---------|--------|
| Tabs (My/Partner) | switch | ✅ |
| Profile view | details | ✅ |
| Edit form | name/DOB/email/phone, save, cancel | ✅ (persist + validation) |
| Partner tab | read-only (no Edit) | ✅ |
| View-as-partner + banner | enter/exit read-only | ✅ |
| Picture upload | change photo | ⬜ needs blob storage |

## Settings

| Component | Actions | Status |
|-----------|---------|--------|
| Theme selector | light/dark/system, persist | ✅ |
| Notifications / Privacy | "coming soon" copy | 🟨 |

## Explicitly out of automated scope (documented)

Media upload (needs Azurite), profile-picture upload (needs blob), reset with a real emailed code
(needs a mailbox), mobile/tablet viewport passes, keyboard-only navigation of RoleToggle, and the
`/invite`+`/invite/accept` flows (intentional placeholders, no approved design).
