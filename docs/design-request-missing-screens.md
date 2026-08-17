# Design Request — Missing Screens (companion to "Together · Hearth Desktop")

> **How to use:** copy everything below the line into a fresh Claude conversation.
> Attach `Together - Hearth Desktop.pdf` alongside it so the new work inherits the
> existing visual language rather than inventing a parallel one.
>
> Gap audit that produced this list: [`design-application-analysis.md`](./design-application-analysis.md)

---

I'm attaching an existing design deck, **"Together · Hearth Desktop"**, for a couples app called **Saha**. It covers 28 desktop screens across Start, Core, Memories, Plans, Us, System, and States, in both light and dark themes.

The deck covers **first-run and steady-state browsing only**. Everything transactional, destructive, or unhappy-path is missing. I need you to design the missing screens **in exactly the same visual and verbal language** as the attached deck — same cream field, same sandstone/gold palette, same restrained emotional tone, same light + dark treatment, same desktop widths.

## The voice to match

The existing deck's copy is the product spec. Study it. The tone is emotional restraint, never cutesy:

- *"Progress that warms, not races."*
- *"Loved by both — no counts."*
- *"An attic instead of a trash can."*
- *"A digest that doesn't nag."*
- *"Errors apologize like a person."*
- *"Offline is a banner, not a wall."*
- *"Two circles waiting to overlap."*

Carry this into the hard screens. A password reset should feel like the app is helping, not scolding. A failed upload should apologize. A deactivation flow should be honest and sad, not alarming — and it must never use a red "DANGER ZONE" panel.

## What Saha is (constraints that shape these screens)

- **One shared account per couple, two partner identities.** One password for the couple. Both partners see everything. There is no private-from-your-partner content.
- Each partner has: username (unique, lowercase), name, date of birth, email, phone, optional profile picture, and a role — **Husband or Wife**.
- Each couple has a **TogetherID**: a unique, uppercase, public handle (4–50 chars, e.g. `RAVI-MEERA`). It is how one couple finds another.
- Couples can **connect to other couples**, and connected couples can share **group chats** where all four people talk.
- Login is by **username**, not email. Either partner's username signs the couple in.

---

# Screens to design

## Group 1 — Authentication & account (9 screens)

**Before you design these, please answer this question rather than guessing.**

The attached deck's *Onboarding 1* says **"Names + story date, one card."** But creating a Saha account actually requires **thirteen fields**: TogetherID, and then username, name, date of birth, email, and phone **for each of the two partners**, plus password and confirmation. Names and a story date cannot create an account.

So one of these must be true, and the answer changes several screens:

- **(a)** Registration is being deliberately simplified, and TogetherID / DOB / phone are collected later or dropped. (Note: DOB enforces a minimum age of 16; TogetherID is how other couples find you.)
- **(b)** *Onboarding 1* happens **after** a full registration screen that the deck simply doesn't show — in which case, design that registration screen.
- **(c)** Registration is split across multiple onboarding cards, with *Onboarding 1* being only the first.

**Tell me which you're assuming, and why, before you draw.** Then design:

1. **Login** — username + password. Includes the "forgot password" entry point. Must reconcile with the deck's *Welcome* screen ("one centered decision") — tell me what that one decision is, given that a returning user, a brand-new couple, and an invited partner each need a different one.
2. **Register** — however many cards your answer above implies.
3. **Forgot password** — the user enters their TogetherID *or* username. Deliberately does not reveal whether the account exists.
4. **Reset password** — the user enters a code received by email, plus a new password.
5. **Change password** (signed in) — note: changing the password **signs both partners out on every device**. The screen must say so plainly, before the button, not after.
6. **Deactivate account** — this ends the shared home for *both* people. One partner's click affects the other. Design the consent moment honestly. What does the other partner see? The deck's philosophy is *"never deleted"* — reconcile that with deactivation.
7. **Logout confirmation** — or argue that it needs no confirmation.
8. **Session expired** — the couple's session lapsed; they land back at sign-in. Should not feel like an error or a data loss.
9. **Too many attempts (rate limited)** — sign-in allows only **5 attempts per minute**. A user who mistypes their password five times hits a hard wall. Today this state does not exist and would show a raw error. Design the kindest possible version.

## Group 2 — Connect: finding & joining other couples (6 surfaces)

The deck omits this module entirely, yet the group chats it *does* show are impossible without it. Note the deck's *Invitation* screen ("two circles waiting to overlap") may or may not be this flow — **tell me whether you read Invitation as couple-invites-couple, or as partner-invites-partner.**

10. **Search for a couple** by TogetherID, and the not-found state.
11. **Send a connection request** — plus the confirmation that it's pending.
12. **Incoming requests** — another couple wants to connect with you.
13. **Accept** a request → the moment two circles overlap.
14. **Decline** a request — quiet, no notification drama for either side.
15. **Your connections** — the list of couples you're linked to, and its empty state.
16. Error states: **you cannot connect with yourself**, and **you already have a request with this couple**.

## Group 3 — Messaging beyond the thread (10 surfaces)

The deck shows only the thread itself.

17. **Conversation list** — the partner thread is always pinned first and can never be removed. Group threads sit below.
18. **Create a group chat** — pick from your connected couples. A group needs at least two couples (four people).
19. **Rename a group** — only the couple who created it may rename.
20. **Add another couple** to an existing group.
21. **Pin / unpin** a conversation.
22. **Hide a conversation** — it disappears for *both* partners in your couple, but stays alive for everyone else in the group. This is subtle; make it legible.
23. **Edit a message** — and how an edited message is marked afterwards.
24. **Delete a message** — what remains in its place, given *"an attic instead of a trash can."*
25. **React to a message** — the picker. Remember: **one reaction per person**, and *"Loved by both, no counts."*
26. **Share a photo or video** — the composer state, upload progress, and the failure state.

## Group 4 — Profile (3 screens)

The deck's *Us (Profile)* says "the couple is the profile," but each partner still has their own editable details.

27. **Edit your own profile** — name, date of birth, email, phone.
28. **Upload a profile picture** — including the **5 MB limit exceeded** rejection.
29. **View your partner's profile.**

## Group 5 — Shell & system (4 surfaces)

30. **Top bar** — what lives beside the sidebar the deck already implies.
31. **Sidebar, collapsed / narrow.**
32. **404 — page not found**, in the deck's voice.
33. **"Viewing as your partner" banner.** The app has a mode where one partner previews the app as the other sees it. A persistent banner shows while it's active. The deck never mentions this mode — design the banner, and tell me if you think the mode should survive at all.

---

# Deliverable

For each screen: **light and dark**, desktop width, matching the attached deck's card-on-cream-field composition.

Give each screen a one-line caption in the deck's voice, exactly as the existing sections do (*"Two circles waiting to overlap."*).

**Flag any screen where you had to invent product behavior that the deck and these constraints don't determine.** I would much rather have a question than a confident guess — this app handles a shared account where one partner's action binds the other, so invented consent behavior is expensive to unwind.
