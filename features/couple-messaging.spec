# PM Spec: Couple Messaging

**Feature Name:** Couple Messaging  
**Slug:** `couple-messaging`  
**Module:** `messages`  
**Status:** Draft  
**Created:** 2026-07-07  

## 1. Goal

Build a complete messaging experience for Saha where partners can chat privately inside their couple account, and connected couples can create shared group chats involving all individuals from participating couples.

The feature should feel warm, intimate, polished, and consistent with Saha's existing product theme while being fully covered by functional tests.

## 2. Background & Context

Saha is a couples app with one couple account and two individual partner identities. The app already has a `Messages` navigation item and `/messages` route, but the current page is a placeholder.

Existing repo context:

- Frontend: React 19, Vite, React Router, TanStack Query, Zustand, Tailwind CSS, Framer Motion, lucide-react.
- Backend: .NET 9, ASP.NET Core Web API, EF Core, Clean Architecture-style projects, MediatR/CQRS patterns, JWT auth.
- Existing domain already includes couples, partners, and couple connections.
- Testing stack includes xUnit, FluentAssertions, NSubstitute, WebApplicationFactory, Vitest, Testing Library, MSW, and Playwright.

## 3. User Stories

- As a partner, I want a private chat with my spouse pinned at the top so we can always message each other quickly.
- As a partner, I want to see messages sent by individual people, not only couple accounts, so chats feel personal.
- As a connected couple, I want to create a group chat with another connected couple so all four people can talk together.
- As a participant, I want to add more connected couples to an existing group chat so the conversation can expand naturally.
- As the owner couple, I want to rename the group chat so the group has a meaningful shared name.
- As a participant, I want to pin useful conversations so they stay easy to find.
- As a couple, I want to delete/hide a conversation for both people in my couple without deleting it for everyone else.
- As a sender, I want to edit or delete my own messages.
- As a participant, I want to react to messages with basic emoticons so I can respond lightly without sending a full message.
- As a viewer, I want to see reactions on messages, including who reacted where appropriate.
- As a participant, I want to share photos and videos in chat.

## 4. Acceptance Criteria

- [ ] Every **completed** couple has exactly one private partner chat. *(Amended 2026-07-10: a couple that has registered but whose partner has not yet accepted their invitation has only one partner, so it has no partner chat. See [`auth-login-registration.spec`](./auth-login-registration.spec).)*
- [ ] The private partner chat is automatically available once the invited partner accepts — i.e. when the couple reaches state `Complete`, not at registration.
- [ ] The private partner chat is always pinned above other conversations.
- [ ] The private partner chat cannot be deleted.
- [ ] Both partners in a couple can send messages in their private partner chat.
- [ ] Messages identify the individual sender identity.
- [ ] A group chat can only be created with a couple that is connected to the creator couple.
- [ ] Accepting a couple connection does not automatically create a group chat.
- [ ] Creating a group chat with another connected couple adds all four individuals as participants.
- [ ] The couple that creates a group chat becomes the owner couple.
- [ ] Only the owner couple can rename a group chat.
- [ ] Any participant can add another eligible connected couple to a group chat.
- [ ] Adding a couple to a group chat adds both individuals from that couple.
- [ ] Previous message history remains visible after couples disconnect.
- [ ] Conversation list shows chat name, participant summary, last message preview, last activity time, and pin state.
- [ ] Non-partner conversations can be pinned and unpinned.
- [ ] Non-partner conversations can be deleted/hidden for the current couple.
- [ ] Deleting/hiding a conversation removes it for both individuals in the current couple only.
- [ ] Text messages can be sent and viewed.
- [ ] Photo messages can be sent and viewed.
- [ ] Video messages can be sent and viewed.
- [ ] A sender can edit their own message.
- [ ] A sender can delete their own message.
- [ ] A non-sender cannot edit or delete another person's message.
- [ ] Edited messages visibly show an edited state.
- [ ] Deleted messages are represented safely in the thread without exposing deleted content.
- [ ] A person can add one reaction per message.
- [ ] A person can change their reaction on a message.
- [ ] A person can remove their reaction from a message.
- [ ] Reactions are visible to other chat participants.
- [ ] The architecture is ready for future real-time delivery, but real-time messaging is not implemented in this version.
- [ ] The UI is responsive and works on desktop and mobile without overlap.
- [ ] All listed behaviors are covered by automated functional tests.

## 5. Main User Flows

1. **Partner chat:** user opens Messages -> private partner chat appears pinned at top -> user selects it -> sends a message -> spouse can see sender identity and message.
2. **Create group chat:** user opens Messages -> creates a chat -> selects a connected couple -> chat opens with both couples' two partners included.
3. **Rename group chat:** owner couple opens group chat settings -> renames chat -> new name appears for participants.
4. **Blocked rename:** non-owner couple opens group chat settings -> rename action is unavailable or rejected.
5. **Add couple:** participant opens group chat settings -> adds another eligible connected couple -> both people from added couple become participants.
6. **Pin conversation:** user pins a group conversation -> conversation moves into pinned ordering below partner chat.
7. **Delete conversation:** user deletes a group conversation -> conversation disappears for both partners in their couple only.
8. **Message actions:** sender sends message -> edits it -> edited state appears -> deletes it -> deleted state appears.
9. **React to message:** participant reacts -> changes reaction -> removes reaction -> all states persist and display correctly.
10. **Share media:** participant chooses photo or video -> sees preview -> sends media -> media appears in thread.

## 6. Out of Scope

- Real-time messaging via SignalR/WebSockets.
- Read receipts.
- Delivered indicators.
- Typing indicators.
- Message search.
- Push notifications.
- Message reporting/moderation.
- Multiple reactions per person on one message.
- Global deletion of conversations for all participants.

## 7. Functional Requirements

### Conversation Types

- `Partner` conversation:
  - One per couple.
  - Automatically created and available after registration.
  - Always pinned first.
  - Cannot be deleted.
  - Contains exactly the two partners in the couple.

- `Group` conversation:
  - Created explicitly by a participant couple.
  - Requires at least two connected couples at creation.
  - Includes every individual partner from participating couples.
  - Has an owner couple.
  - Can be renamed only by the owner couple.
  - Can be expanded by any participant adding eligible connected couples.

### Conversation Visibility

- Conversation deletion means hidden for the acting user's couple.
- If one spouse deletes/hides a group conversation, it is hidden for both individuals in that couple.
- Other participating couples keep the conversation and history.
- Partner chat cannot be hidden or deleted.

### Message Content

- Text messages are supported.
- Photo and video attachments are supported.
- Media messages should include metadata needed for display, such as URL, content type, file name, and size where available.
- Future storage integrations should fit existing blob storage abstractions.

### Message Mutations

- Only the sender can edit their message.
- Only the sender can delete their message.
- Edited messages show an edited marker.
- Deleted messages should no longer expose the original body/media.

### Reactions

- Use basic emoji/emoticon reactions.
- One reaction per individual person per message.
- A person can replace their existing reaction.
- A person can remove their reaction.
- Reactions are persisted and visible to chat participants.

## 8. Technical Approach

### Backend

Follow the existing backend project structure:

- `backend/src/Saha.Domain`
- `backend/src/Saha.Application`
- `backend/src/Saha.Infrastructure`
- `backend/src/Saha.API`

Expected domain/persistence concepts:

- Conversation/chat entity.
- Conversation participant entity or join model.
- Couple-level conversation state for pin/delete/hide.
- Message entity.
- Message media attachment entity.
- Message reaction entity.
- Conversation ownership model for group chats.

Expected API capabilities:

- List conversations.
- Get conversation details.
- Create group conversation.
- Rename conversation.
- Add couple to conversation.
- Pin/unpin conversation.
- Delete/hide conversation for current couple.
- List messages.
- Send text message.
- Send media message.
- Edit message.
- Delete message.
- Add/change/remove reaction.

Authorization rules:

- Only authenticated users can access messaging endpoints.
- A user can only access conversations where their couple is a participant and has not hidden the conversation.
- Partner chat is only accessible to the two partners in the couple.
- Group chat creation requires a valid accepted couple connection.
- Adding a couple requires that the added couple is eligible through the existing connection model.
- Only owner couple can rename a group chat.
- Only the sender can edit/delete their own messages.
- Only one reaction per person per message.

Real-time readiness:

- Keep message creation, edits, deletes, and reactions centralized in application handlers/services.
- Use DTOs/events that can later be published to SignalR.
- Do not hard-code frontend assumptions that only full refreshes will ever be possible.

### Frontend

Replace the current `MessagesPage` placeholder with a complete module under:

- `frontend/src/modules/messages/`

Expected UI pieces:

- Conversation list.
- Chat thread.
- Message composer.
- Media picker and preview.
- Reaction picker.
- Rename chat dialog/flow.
- Add couple dialog/flow.
- Pin/unpin conversation action.
- Delete conversation action.
- Edit/delete message actions.
- Loading, empty, and error states.

UX requirements:

- Follow Saha's existing visual language.
- Use Framer Motion for polished but purposeful animations.
- Animate conversation switching, message entrance, reactions, media preview/loading, pin/delete transitions, and rename/add-couple flows.
- Use lucide-react icons where appropriate.
- Keep the interface responsive for desktop and mobile.
- Avoid layout shifts, overlapping text, and inaccessible controls.

## 9. Test Plan

Functional tests are mandatory. Do not consider the feature complete until the behavior below is covered.

### Backend Unit Tests

Add xUnit tests for:

- Partner chat creation/existence.
- Conversation creation rules.
- Group chat creation only for connected couples.
- Group chat is not created automatically on connection acceptance.
- Owner couple rename permissions.
- Non-owner rename rejection.
- Any participant can add an eligible connected couple.
- Unauthorized couple cannot access chat.
- Delete/hide conversation only for current couple.
- Partner chat cannot be deleted.
- Pin/unpin conversation.
- Send text message.
- Send media message.
- Edit own message.
- Reject edit by non-sender.
- Delete own message.
- Reject delete by non-sender.
- Add/change/remove one reaction per person.
- Reaction visibility and persistence.

### Backend API/Integration Tests

Add WebApplicationFactory tests for:

- Register couple creates partner chat.
- Create group chat with connected couple succeeds.
- Create group chat with unconnected couple fails.
- List conversations returns partner chat pinned first.
- Rename chat succeeds only for owner couple.
- Add couple succeeds for a valid eligible connected couple.
- Send/list text messages.
- Send/list media messages.
- Edit/delete message authorization.
- React/unreact/change reaction.
- Delete conversation hides it for current couple only.

### Frontend Unit/Component Tests

Add Vitest, Testing Library, and MSW tests for:

- Rendering conversation list.
- Partner chat pinned at top.
- Pin/unpin action.
- Delete conversation action.
- Selecting conversations.
- Rendering text messages.
- Rendering photo/video messages.
- Sending message.
- Editing own message UI.
- Deleting own message UI.
- Reaction add/change/remove UI.
- Rename chat permissions UI.
- Add couple flow.
- Loading states.
- Error states.
- Empty states.

### Playwright E2E Tests

Add tests under:

- `frontend/tests/e2e/messages/`

Cover:

- User can open Messages from sidebar.
- Partner chat appears pinned at top.
- Partner can send a message.
- Connected couple group chat can be created.
- Unconnected couple cannot be used to create a group chat.
- Four individuals are represented in a two-couple group chat.
- Owner couple can rename chat.
- Non-owner couple cannot rename chat.
- Participant can add another eligible connected couple.
- Text message appears in the thread.
- Photo/video message can be selected and appears in preview/thread.
- User can edit own message.
- User can delete own message.
- User can react to message.
- User can change/remove reaction.
- Conversation can be pinned/unpinned.
- Conversation can be deleted for current couple.
- Mobile viewport works without overlap.

## 10. Definition of Done

- [ ] `/messages` is no longer a placeholder.
- [ ] Partner chat works end to end.
- [ ] Group chat works end to end.
- [ ] Text, photo, and video messages work.
- [ ] Edit/delete own messages work.
- [ ] Reactions work with one reaction per person per message.
- [ ] Pin/unpin and couple-level delete/hide work.
- [ ] Owner-only rename works.
- [ ] Add-couple flow works.
- [ ] Backend tests pass with `dotnet test`.
- [ ] Frontend tests pass with `npm run test`.
- [ ] Frontend typecheck/lint/build pass where configured.
- [ ] Playwright E2E tests are added and pass where feasible.
- [ ] Any tests that cannot be run locally are documented with the exact reason.
- [ ] Implementation remains extensible for future SignalR/WebSocket real-time messaging.
