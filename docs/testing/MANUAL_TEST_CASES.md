# Saha — Manual Test Cases

## TC-REG: Registration

### Positive Cases

| ID | Title | Steps | Expected Result |
|---|---|---|---|
| REG-001 | Successful registration | 1. Navigate to /register. 2. Fill Step 1: Together ID = `MADHU-PRIYA`, password = `SecurePass@123!`, confirm password = `SecurePass@123!`. 3. Click Next. 4. Fill Step 2 (Husband): Name = `Madhu Avinash`, DOB = `01/01/1990`, Email = `madhu@test.com`, Phone = `+11234567890`, Username = `madhuavinash`. 5. Click Next. 6. Fill Step 3 (Wife): Name = `Priya Avinash`, DOB = `06/15/1992`, Email = `priya@test.com`, Phone = `+19876543210`, Username = `priyaavinash`. 7. Click Next. 8. Review Step 4 and click Register. | Account created. Redirected to /login. Success toast shown. |
| REG-002 | Together ID auto-uppercases | 1. In Step 1, type `madhu-priya` in lowercase. | Together ID field displays `MADHU-PRIYA` instantly. |
| REG-003 | Step indicator shows progress | 1. Complete Steps 1–3. | Step indicator shows 3 of 4 steps completed with checkmarks on completed steps. |
| REG-004 | Navigate back between steps | 1. Complete Step 1. 2. Click Next. 3. Click Back. | Returns to Step 1. Previously entered data is preserved. |

### Negative Cases

| ID | Title | Steps | Expected Result |
|---|---|---|---|
| REG-010 | Duplicate Together ID | 1. Register with Together ID = `TAKEN-ID01`. 2. Try to register another couple with the same Together ID. | Error: "This Together ID is already taken." 409 response from API. |
| REG-011 | Duplicate username | 1. Register couple with husband username = `existinguser`. 2. Register another couple where wife username = `existinguser`. | Error: "This username is already taken." |
| REG-012 | Password too short | 1. Enter password = `Short1!`. | Inline validation: "Password must be at least 12 characters." Next button disabled. |
| REG-013 | Password without special character | 1. Enter password = `SecurePassword123`. | Inline validation: "Password must contain at least one special character." |
| REG-014 | Passwords don't match | 1. Enter password = `SecurePass@123!`, confirm = `DifferentPass@123!`. | Inline validation: "Passwords do not match." |
| REG-015 | Same username for husband and wife | 1. Enter husband username = `sameuser`, wife username = `sameuser`. | Validation on Step 3: "Usernames must be different." Cannot proceed. |
| REG-016 | Same email for husband and wife | 1. Enter same email for both partners. | Validation error: "Email addresses must be different." |
| REG-017 | Invalid Together ID format | 1. Enter Together ID = `AB` (too short). | Inline validation: "Together ID must be at least 4 characters." |
| REG-018 | Username with uppercase letters | 1. Enter username = `Madhu123`. | Inline validation: "Username must be lowercase only." |

### Boundary Cases

| ID | Title | Steps | Expected Result |
|---|---|---|---|
| REG-020 | Together ID exactly 4 characters | 1. Enter `AB12`. | Accepted. |
| REG-021 | Together ID exactly 50 characters | 1. Enter 50-character ID. | Accepted. |
| REG-022 | Together ID 51 characters | 1. Enter 51-character ID. | Rejected. Field limits to 50 characters. |
| REG-023 | Username exactly 3 characters | 1. Enter `abc`. | Accepted. |
| REG-024 | Username exactly 30 characters | 1. Enter 30-character username. | Accepted. |
| REG-025 | Minor age (under 18) | 1. Enter DOB = today minus 17 years. | Validation error: "Must be at least 18 years old." |

---

## TC-LGN: Login

### Positive Cases

| ID | Title | Steps | Expected Result |
|---|---|---|---|
| LGN-001 | Husband logs in | 1. Navigate to /login. 2. Enter husband's username and shared password. 3. Click Sign In. | Redirect to /dashboard. Welcome message uses husband's name. |
| LGN-002 | Wife logs in | 1. Navigate to /login. 2. Enter wife's username and shared password. 3. Click Sign In. | Redirect to /dashboard. Welcome message uses wife's name. Role shown is "Wife". |
| LGN-003 | Password field shows/hides | 1. Click the eye icon in the password field. | Password text becomes visible. Clicking again hides it. |
| LGN-004 | Remember session across page refresh | 1. Log in. 2. Refresh the browser. | User remains logged in. Dashboard is shown. |
| LGN-005 | Redirect after unauthenticated access | 1. While logged out, navigate to /dashboard. 2. After login, | Redirected to /dashboard (original destination). |

### Negative Cases

| ID | Title | Steps | Expected Result |
|---|---|---|---|
| LGN-010 | Wrong password | 1. Enter correct username with wrong password. | Error: "Invalid credentials." No detail about which field is wrong. |
| LGN-011 | Non-existent username | 1. Enter username that doesn't exist. | Error: "Invalid credentials." Same message as wrong password (no enumeration). |
| LGN-012 | Empty username | 1. Leave username blank and submit. | Inline validation: "Username is required." |
| LGN-013 | Empty password | 1. Leave password blank and submit. | Inline validation: "Password is required." |
| LGN-014 | Rate limiting | 1. Submit login with wrong credentials 6 times within 1 minute. | 6th request returns 429 Too Many Requests. Error message shown to user. |

---

## TC-FPW: Forgot Password

### Positive Cases

| ID | Title | Steps | Expected Result |
|---|---|---|---|
| FPW-001 | Request reset code by Together ID | 1. Click "Forgot password?" on login page. 2. Enter valid Together ID. 3. Click Send Code. | Success message shown. Both partners receive email with same 6-digit code. |
| FPW-002 | Reset password with valid code | 1. Request code. 2. Enter code from email. 3. Enter new password and confirm. 4. Click Reset. | Password changed. Redirect to /login. Can log in with new password. |
| FPW-003 | Non-existent Together ID shows success | 1. Enter Together ID that doesn't exist. 2. Click Send Code. | Same success message as a real request. No indication the ID doesn't exist. |
| FPW-004 | Code sent to both partners | 1. Request reset. | Check inbox for BOTH husband and wife email — both should receive the code. |
| FPW-005 | Code expires after 15 minutes | 1. Request code. 2. Wait 16 minutes. 3. Enter code. | Error: "Code has expired or is invalid." |
| FPW-006 | Code can only be used once | 1. Request code. 2. Use it to reset password. 3. Try to use same code again. | Error: "Code has expired or is invalid." |

### Negative Cases

| ID | Title | Steps | Expected Result |
|---|---|---|---|
| FPW-010 | Wrong code | 1. Request code. 2. Enter incorrect 6-digit code. | Error: "Code has expired or is invalid." |
| FPW-011 | New password same as old | 1. Reset password to current password. | Error: "New password must be different from current password." |

---

## TC-PRF: Profile

### Positive Cases

| ID | Title | Steps | Expected Result |
|---|---|---|---|
| PRF-001 | View own profile | 1. Log in as husband. 2. Navigate to /profile. | "My Profile" tab active. Shows husband's name, username, DOB, email, phone. |
| PRF-002 | View partner tab | 1. From profile page, click "Partner" tab. | Shows wife's info in read-only format. No edit buttons. |
| PRF-003 | Edit own profile | 1. On My Profile tab, click Edit. 2. Change display name. 3. Click Save. | Name updated. Success toast. Updated name shows everywhere. |
| PRF-004 | Upload profile picture | 1. Click the camera icon on the profile avatar. 2. Select a JPEG under 5MB. | "Photo updated" toast appears. Avatar in profile card and TopBar updates to the new photo. |
| PRF-005 | Launch as partner | 1. On Profile page, click "View as Partner". | PartnerViewBanner appears at top: "Viewing as Partner (Read Only Mode)". Profile page shows partner's data. All edit buttons hidden. |
| PRF-006 | Exit partner view | 1. While in partner view, click "Exit Partner View" in banner. | Banner disappears. Returns to own profile. Edit functionality restored. |
| PRF-007 | Partner view persists across navigation | 1. Enter partner view. 2. Navigate to Dashboard. | Banner still visible at top. Dashboard shows partner's name in greeting. |
| PRF-008 | Partner view does not persist on page refresh | 1. Enter partner view. 2. Refresh browser. | Partner view mode is cleared. Normal view is restored. |

### Negative Cases

| ID | Title | Steps | Expected Result |
|---|---|---|---|
| PRF-010 | Upload non-image file | 1. Try to upload a .pdf file as profile picture. | Browser file picker filters out non-images (accept="image/jpeg,image/png,image/webp"). If bypassed, server returns error. |
| PRF-011 | Upload file over 5MB | 1. Try to upload a 6MB image. | "Upload failed" error toast. Server returns 413. |
| PRF-012 | Save profile with empty name | 1. Clear the name field. 2. Click Save. | Validation error: "Name is required." Cannot save. |
| PRF-013 | Avatar fallback when no photo set | 1. Log in as a user with no profile picture. 2. View profile and sidebar. | Husband or wife illustration is shown immediately — no broken image, no initials. |

---

## TC-CNT: Connect

### Positive Cases

| ID | Title | Steps | Expected Result |
|---|---|---|---|
| CNT-001 | Search for another couple | 1. Navigate to /connect. 2. Click "Find Couples" tab. 3. Type a Together ID (or partial). | Results appear showing matching couples with their Together ID. |
| CNT-002 | Send connection request | 1. Find a couple in search. 2. Click "Connect". | Request sent. Couple appears in Pending tab. Button changes to "Pending". |
| CNT-003 | Accept connection request | 1. Log in as a couple that received a request. 2. Navigate to Connect → Pending. 3. Click "Accept". | Couple moves to Connected tab. Both couples see each other as connected. |
| CNT-004 | Reject connection request | 1. On Pending tab, click "Reject". | Request removed from pending. No connection formed. |
| CNT-005 | View connected couples | 1. Navigate to Connect → Connected tab. | Shows all accepted connections with couple names and Together IDs. |

### Negative Cases

| ID | Title | Steps | Expected Result |
|---|---|---|---|
| CNT-010 | Search own Together ID | 1. Search for your own Together ID. | Own couple does not appear in results. |
| CNT-011 | Send duplicate connection request | 1. Send a connection request to Couple X. 2. Try to send another request to the same couple. | "Connect" button is disabled/not visible — already pending. |

---

## TC-SEC: Security

| ID | Title | Steps | Expected Result |
|---|---|---|---|
| SEC-001 | Access token not in localStorage | 1. Log in. 2. Open DevTools → Application → Local Storage. | `saha-auth` key exists but does NOT contain `accessToken`. |
| SEC-002 | Refresh cookie is HttpOnly | 1. Log in. 2. Open DevTools → Application → Cookies. | `X-Refresh-Token` cookie has `HttpOnly` flag. Cannot be read via `document.cookie`. |
| SEC-003 | Refresh cookie is Secure | 1. Inspect the refresh token cookie. | `Secure` flag is present. Cookie only sent over HTTPS. |
| SEC-004 | XSS in profile name | 1. Try to save name as `<script>alert('xss')</script>`. | Script does not execute. Stored as plain text. Displayed escaped. |
| SEC-005 | SQL injection in login | 1. Enter `' OR '1'='1` as username. | Login fails normally. No SQL error. |
| SEC-006 | Unauthenticated API access | 1. Make a request to `/api/v1/profile` without a token. | 401 Unauthorized. |
| SEC-007 | Expired access token | 1. Wait 15 minutes after login (or manually expire token). 2. Make an API call. | Silent refresh occurs. User does not see an error. Call succeeds with new token. |
| SEC-008 | Security headers present | 1. Inspect API response headers. | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` all present. |

---

## TC-ACC: Accessibility

| ID | Title | Steps | Expected Result |
|---|---|---|---|
| ACC-001 | Keyboard navigation — Login | 1. Navigate to /login. 2. Use Tab key only. | Can focus and interact with username, password, show/hide toggle, submit button, and forgot password link. |
| ACC-002 | Form error announcements | 1. Submit empty login form. | Error messages are associated with their fields via `aria-describedby`. Screen reader announces errors. |
| ACC-003 | Partner view banner accessible | 1. Enter partner view. | Banner has `role="alert"` or similar. Screen reader announces the mode change. |
| ACC-004 | Color contrast | 1. Inspect text against background colors. | All text meets WCAG AA contrast ratio (4.5:1 for normal, 3:1 for large text). |
| ACC-005 | Focus visible | 1. Tab through the page. | Every focused element has a visible focus ring. |

---

## TC-RES: Responsive / Cross-Device

| ID | Title | Steps | Expected Result |
|---|---|---|---|
| RES-001 | Mobile login | 1. Open app on 375px wide viewport (iPhone SE). | Login form fills screen correctly. No horizontal scroll. Inputs are easily tappable. |
| RES-002 | Mobile sidebar | 1. On mobile, click hamburger menu. | Sidebar slides in from left with animation. Shows nav links; Settings and Sign out are at the bottom. Tap outside closes it. |
| RES-003 | Tablet layout | 1. Open app on 768px wide viewport. | Sidebar may collapse. Content fills width appropriately. |
| RES-004 | Multi-step registration on mobile | 1. Complete registration on mobile. | Step indicator fits screen. Form fields are full-width. Next/Back buttons accessible. |

---

## TC-PER: Performance

| ID | Title | Steps | Expected Result |
|---|---|---|---|
| PER-001 | Login response time | 1. Log in and measure network request time. | Login API responds within 1 second under normal load. |
| PER-002 | Dashboard load time | 1. Measure time to interactive after login. | Dashboard is interactive within 2 seconds on 4G connection. |
| PER-003 | Profile picture upload | 1. Upload a 4.9MB image. | Upload completes within 10 seconds. Progress indicator shown. |
| PER-004 | Connect search debounce | 1. Type quickly in Connect search (e.g. 5 keystrokes). | Only 1 API request is made (after debounce delay). |
