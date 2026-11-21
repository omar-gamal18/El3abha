# El3abha: System Requirements

> Backend and integration specification for the existing Figma design. The design labels the Player role “User” and the Venue Owner role “Stadium Owner.”

**Technology:** Node.js, Express, Prisma, PostgreSQL, Socket.io, Jest, Supertest, Swagger/OpenAPI, React.
**UI reference:** `figma-scan-report.md`. That report has complete screen structure but incomplete detail for most screens. This document distinguishes observed requirements from unresolved details; unknowns must not be used to justify changing the design.

## 1. Purpose, Scope, and UI Boundary

The system replaces phone/social-media coordination with venue discovery, schedule availability, manual InstaPay payment proof, and booking management for Players, Venue Owners, and Admins. The backend supports existing screens; API and database work must not require a Figma redesign.

### 1.1 Existing screens the system supports

| Area             | Scanned UI                                                                                                     | Backend data/actions required                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Authentication   | Role selection, account form, login, Google button, session option, three password-reset/OTP screens           | Register/login, Google identity verification, session renewal, OTP request/resend/verify/reset, profile data |
| Player discovery | Home search/cards, Explore filters/results, Stadium Details, map/location, reviews summary, date/time selector | Search/list, detail, availability, ratings/reviews read, favorite state, private booking initialization      |
| Player account   | Booking history, status tabs, Favorites and empty state, Profile/Security, nav notification bell               | Booking lists/detail/cancel, favorites, profile/password update, notification list/unread/read               |
| Payment          | Existing InstaPay payment screen, three-step progress, booking summary, receipt upload                         | Full amount and fee breakdown, recipient/reference, receipt upload/review status, stable booking snapshot    |
| Owner            | Overview, listings, add/edit venue, availability, bookings/check-in, earnings                                  | Owner-scoped venue, schedule, block, booking, metrics, transaction and payout-account APIs                   |
| Admin            | Overview, users/owners, venue approval, bookings, categories, complaints, reports, settings                    | Role-protected lists/actions, review decisions, aggregates, configurable policy, audit history               |

The “Complete booking” frame is structurally identical to Explore Stadiums and is not treated as a separate workflow. The report does not include detailed designs for a booking-details page, confirmation page, standalone notifications page, Help Center, sign-out dialog, owner registration/verification page, Admin login page, mobile/tablet layouts, or all error states. None is required by this specification.

### 1.2 In scope

- Player/Owner registration and login; seeded Admin login; Google sign-in; secure session option; OTP-based password reset.
- Venue listings, photos, approval, search/filter/sort, details, ratings/reviews display, weekly availability, and blocks.
- Booking creation and concurrency safety; full manual InstaPay transfer; upload and review of proof; player/owner/admin booking views.
- Favorites, player profile/security/history, and persisted real-time notifications for the visible bell.
- Owner listing/schedule/booking/earnings views and Admin moderation, settings, category, complaint, and reporting screens.
- API validation, authorization, audit, testing, migrations, deployment configuration, and Swagger documentation.

### 1.3 Not in this release

- Payment gateway, card payments, mobile wallets, platform escrow, automatic payment verification, refunds, or automatic payout settlement.
- A visible deposit flow, sender-number field, payment-method selector, or payment countdown.
- Multiple bookable units/pitches per venue, native apps, live chat, matchmaking, or public Admin registration.
- New pages or controls absent from the source Figma. Reviews are displayed; a review submission form is not verified by this scan.

## 2. Roles and Authorization

The API authenticates every protected request and derives role and ownership from the account/token. A role value supplied by a client, or the hidden role selector in a Figma layer, is never authorization.

| Capability                                                                           | Player (`PLAYER`, UI “User”) | Owner (`OWNER`, UI “Stadium Owner”) |             Admin (`ADMIN`)             |
| ------------------------------------------------------------------------------------ | :--------------------------: | :---------------------------------: | :-------------------------------------: |
| Register/sign in                                                                     |             Yes              |                 Yes                 |     Sign in to seeded account only      |
| Search/browse approved venues and view public details                                |             Yes              |                 Yes                 |                   Yes                   |
| Manage own venues, photos, schedule and blocked times                                |              No              |                 Yes                 |                   No                    |
| Create booking, view own bookings, submit receipt, cancel where allowed              |             Yes              |                 No                  |         Inspect/administer only         |
| Review and decide bookings on owned venues                                           |              No              |                 Yes                 |       Administrative actions only       |
| Manage own favorites, profile, password and notifications                            |             Yes              |                 No                  |                   No                    |
| Review venues and owner verification                                                 |              No              |                 No                  |                   Yes                   |
| Manage users, bookings, sports categories, complaints, platform settings and reports |              No              |                 No                  |                   Yes                   |
| View owner earnings and payout-account data                                          |              No              |          Own account only           | As required for administration, audited |

Public sign-up accepts only `PLAYER` or `OWNER`. The Admin account is provisioned through seed/configuration. Requests against another user’s, owner’s, venue’s, booking’s, receipt’s, or payout record are denied even if the caller knows its ID.

## 3. User Workflows

### 3.1 Authentication and account management

1. Sign-up first records the selected role (User or Stadium Owner), then submits the account form. The existing requirements expect name, email, phone, password, and password confirmation; exact labels/order should follow the source form.
2. Login supports email/password and Google. Google identity must be verified by the backend. The backend returns the account’s actual role and never trusts a role from the client.
3. The session option maps to secure refresh-session persistence. Logout revokes the active refresh session; refresh tokens are rotated and stored hashed.
4. Forgot-password requests a six-digit OTP, supports resend, verifies expiry and one-time use, then accepts a new password. Do not reveal whether an email exists.
5. Email verification is not a blocking registration/login step: the scanned UI contains no verification screen.
6. Profile/security APIs return only the authenticated user’s allowed fields, never password hashes, OTPs, or session secrets. Admin activation/deactivation is available through the Users & owners screen.

### 3.2 Venue submission and approval

1. Owner creates a venue using the existing Basic information, Location & contact, Facilities, Photos, and Publishing areas. At least one valid photo is required.
2. New venues enter `PENDING` and remain absent from public search/details. Admin sees them in the approval queue and can approve or reject with a reason.
3. On approval, the venue becomes discoverable and the Owner sees its published status. Rejection reason is visible to the Owner.
4. Editing an approved venue field that affects trust or booking (location/contact/payment recipient) triggers re-review. Preserve active bookings and history; do not silently rewrite their snapshots.
5. Owner can soft-delete only when doing so does not invalidate active bookings. Admin moderation is audited.

### 3.3 Player discovery and venue details

- Home/Explore search supports the visible location, sport, and date inputs, filters, result count, sorting, and venue cards. Only approved, non-deleted venues are returned.
- Venue cards include a representative photo, name, sport, location, hourly price, and rating where available. Search responses do not include private InstaPay recipient details.
- Stadium Details supplies gallery/description/facilities, map/location data, public contact information, rating/reviews summary, and availability for the selected date. The booking sidebar’s date and time selection starts booking directly; no separate booking-details screen is assumed.
- The design shows Football, Basketball, and Padel. Admin-managed category data backs those controls; categories with no public venues may still be listed if the UI’s category management rules permit it.

### 3.4 Owner schedule and availability

- Owner defines weekly opening hours/time slots, optional per-slot price override, and active state.
- Owner can block a date, time range, or whole day using the existing calendar and block controls. A block cannot overlap an active booking.
- Public availability is calculated for a venue/date and returns each time option with its price and state: `AVAILABLE`, `BOOKED`, `BLOCKED`, or `PAST`.
- All date/time comparisons use `Africa/Cairo`. A venue has one bookable unit; weekly slots for the same venue cannot overlap.

### 3.5 Booking and manual InstaPay payment

1. Player chooses an available time in Stadium Details. The server verifies approval, date/time, block state, ownership/configuration, and availability, then creates the booking atomically.
2. A configurable server-side hold may reserve the slot while payment is completed. No countdown control is required by the UI. If the hold expires, the API reports an actionable conflict and releases the slot.
3. Payment screen receives booking reference, venue fee, service fee, total, InstaPay recipient/address and recipient name, schedule, duration, and other summary fields shown in the existing design.
4. Amount is the **full transfer**, not a deposit: `totalAmount = venueFee + serviceFee`. The scanned example is EGP 600 + EGP 30 = EGP 630. The server computes both components using venue pricing and the current platform fee setting, then snapshots the results.
5. InstaPay is the only method in this release. The player transfers the displayed total manually to the displayed recipient and uploads JPG, PNG, or PDF proof up to 10 MB. Do not require a method selector, sender number, card/wallet data, gateway, or escrow.
6. Successful proof submission sets the booking to `PENDING_REVIEW`. The venue Owner is the normal reviewer; Admin can inspect and perform the administrative actions represented in the Admin UI. Receipt URLs are private to the Player, venue Owner, and Admin.
7. The Owner confirms or rejects with a reason. The UI shows a three-step progress indicator, but the scan contains no separate confirmation screen; return status/confirmation data to the existing flow without requiring another page.
8. A receipt is not a verified payment until an authorized reviewer acts. No automatic transfer validation, refund, or payout occurs.

### 3.6 Player bookings, favorites, profile, and notifications

- Player history supports search/date/status filters that the existing table can display, pagination, booking detail, and permitted cancellation. The four visible tabs must be supported without imposing additional tabs.
- UI status labels map from internal states: future confirmed bookings to **Upcoming**; ended confirmed bookings to **Completed**; payment/review-pending bookings to the existing awaiting-payment/review label; cancelled bookings to **Cancelled**. Rejected/expired records retain their reason and remain accessible through the existing history view without inventing a new screen.
- Favorites support add/remove, list, the visible category/filter controls, and a useful empty result. Add/remove is idempotent and Player-scoped.
- Profile supports personal-information read/update, password/security actions, and booking history. Unverified profile fields must not be invented.
- Notifications are persisted and support the navigation bell, unread count, list/read actions, and real-time delivery. The full notifications page mentioned in a designer note is not in scope.

### 3.7 Admin workflows

- **Overview:** provide the four metric tiles, platform booking activity, moderation priorities, and recent activity data.
- **Users & owners:** searchable/filterable account directory, account status actions, owner-verification status and review actions. Store only verification evidence fields present in the actual form.
- **Stadium approvals:** queue by status, venue details/photos, review checklist data, approve/reject and mandatory rejection reason.
- **Bookings:** searchable/filterable booking list, booking inspection, and permitted administrative actions. Never leak receipt or payment recipient data to unrelated users.
- **Sports categories:** list/create/edit/retire categories and expose the rule data shown by the screen. Seed Football, Basketball, and Padel.
- **Complaints:** persist complaint records and support the queue, detail, and resolution action. Complaints enter through an already-approved support intake; this spec adds no public complaint page or unscanned form.
- **Reports:** support the visible date filters, summary metrics, revenue-by-day chart, bookings-by-sport table, top-stadium table, and download action. Report verified receipts separately from pending proofs; do not represent unverified transfers as collected revenue.
- **Settings:** persist the platform policy values represented in General, Fees & booking policies, Platform notifications, and Administrator access. Fee settings apply to new bookings; historical snapshots do not change.

### 3.8 Owner workflows

- **Overview:** provide the four summary metrics, earnings trend, today-at-a-glance notices, and upcoming bookings.
- **Listings:** list/filter venues, show publication/approval state and listing performance, and route existing actions to create/edit screens.
- **Add/edit venue:** support verified fields for basic information, location/contact, facilities, photos, and publishing state. At least one photo is required. Do not add fields whose labels or controls are not confirmed.
- **Availability:** provide weekly schedule, active/open/blocked state, date/range blocks, and notices for changes that would conflict with bookings.
- **Bookings:** list/filter incoming bookings, show booking detail/check-in information, and expose authorized review actions using the existing screen controls.
- **Earnings:** supply the four metrics, revenue trend, recent transaction records, and payout-account data. This is reporting/display only; no automatic payout or platform settlement is implied.

## 4. Functional Requirements

Priority meanings: **P0** is necessary for the scanned user journeys; **P1** is required only if the corresponding visible screen/control is retained in the release.

### 4.1 Identity and authorization

| ID      | Requirement                                                                                                                              | Priority |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------- | :------: |
| AUTH-01 | Register with unique email, name, phone, password, confirmation, and `PLAYER` or `OWNER`; reject public `ADMIN` registration.            |    P0    |
| AUTH-02 | Login by email/password and Google; derive role from the account and return a secure session.                                            |    P0    |
| AUTH-03 | Hash passwords; hash, rotate, expire, and revoke refresh sessions; logout revokes the active session.                                    |    P0    |
| AUTH-04 | Implement six-digit expiring, single-use password-reset OTP, resend, rate limit, and generic responses that prevent account enumeration. |    P0    |
| AUTH-05 | Enforce role, ownership, active-account, and soft-delete checks on every protected endpoint.                                             |    P0    |
| AUTH-06 | Provide self-profile read/update and password change; Admin can activate/deactivate accounts.                                            |    P0    |

### 4.2 Venue, search, and category management

| ID     | Requirement                                                                                                                                                          | Priority |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------: |
| VEN-01 | Owner creates and edits venue information, facilities, contact/location, hourly price, InstaPay recipient, and photos using fields confirmed in the Add/edit screen. |    P0    |
| VEN-02 | Require at least one valid venue photo; enforce configured size/type limits and remove orphan uploads after failed operations.                                       |    P0    |
| VEN-03 | New venue state is `PENDING`; only approved, non-deleted venues are public.                                                                                          |    P0    |
| VEN-04 | Admin approves or rejects with an audited decision and reason; Owner sees state and rejection reason.                                                                |    P0    |
| VEN-05 | Editing approved trust/booking fields returns the venue to review; deletion is blocked when active bookings would be invalidated.                                    |    P0    |
| VEN-06 | Public search supports visible text/location/sport/date/price filters, sorting, pagination, result counts, and card data.                                            |    P0    |
| VEN-07 | Venue detail returns gallery, facilities, map/location, public contact, review summary/list, and date availability; private InstaPay recipient is excluded.          |    P0    |
| VEN-08 | Admin maintains sports categories; initial categories are Football, Basketball, and Padel.                                                                           |    P0    |

### 4.3 Availability and booking

| ID      | Requirement                                                                                                                                                                                | Priority |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------: |
| SLOT-01 | Owner manages weekly schedule/time slots and optional slot price overrides.                                                                                                                |    P0    |
| SLOT-02 | Same-venue weekly slots cannot overlap; prevent edits, removal, or blocking that invalidates active future bookings.                                                                       |    P0    |
| SLOT-03 | Owner blocks a date, time range, or full day; availability returns `AVAILABLE`, `BOOKED`, `BLOCKED`, or `PAST`.                                                                            |    P0    |
| BOOK-01 | Player creates a booking only for an approved venue and an available, future slot.                                                                                                         |    P0    |
| BOOK-02 | Prevent concurrent double booking with a database constraint and atomic state updates; support configurable server-side payment hold without a visible countdown requirement.              |    P0    |
| BOOK-03 | Server calculates venue fee, configurable service fee, and full total; snapshot currency (EGP), values, recipient, time, venue, and slot details.                                          |    P0    |
| BOOK-04 | Provide only InstaPay checkout fields: recipient/address, recipient name, booking reference, full total, and summary. No deposit, wallet/card, sender-number, gateway, or escrow workflow. |    P0    |
| BOOK-05 | Accept JPG/PNG/PDF proof up to 10 MB; protect the file; set `PENDING_REVIEW` only after successful upload and valid state check.                                                           |    P0    |
| BOOK-06 | Owner can confirm or reject a pending review; rejection requires a reason. Player/Owner cancellation follows state/permission rules.                                                       |    P0    |
| BOOK-07 | Player and Owner histories support status filtering, date ranges, search where shown, pagination, booking detail, and the UI status mapping.                                               |    P0    |
| BOOK-08 | Admin can inspect bookings and perform only authorized administrative actions; decisions are audited.                                                                                      |    P0    |

### 4.4 Player and dashboard capabilities

| ID        | Requirement                                                                                                                                                                | Priority |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------: |
| PLAYER-01 | Favorites support list/add/remove, visible filters, and empty state; operations are Player-scoped and idempotent.                                                          |    P0    |
| PLAYER-02 | Venue details return review/rating data; review creation UI is not required without a verified design.                                                                     |    P0    |
| PLAYER-03 | Profile supports the existing personal-information and security sections without inventing field labels.                                                                   |    P0    |
| NOTIF-01  | Save notifications before delivery; support unread count, list/read actions, socket delivery, and REST fallback for the bell.                                              |    P0    |
| ADMIN-01  | Admin overview, user/owner management, owner verification, venue approval, bookings, category management, complaints, reports, and settings are backed by authorized APIs. |    P0    |
| ADMIN-02  | Reports support displayed date-filtered metrics, chart/table datasets, and download; calculations use persisted/verified records.                                          |    P0    |
| OWNER-01  | Owner overview, listings/performance, venue editing, availability, bookings/check-in, earnings/transactions, and payout-account data are Owner-scoped.                     |    P0    |

## 5. Booking State Machine and Business Rules

### 5.1 Internal states

| State             | Meaning                                                         | Slot reservation            |
| ----------------- | --------------------------------------------------------------- | --------------------------- |
| `PENDING_PAYMENT` | Booking created; awaiting proof while server hold remains valid | Occupied until hold expires |
| `PENDING_REVIEW`  | Proof uploaded; awaiting Owner decision                         | Occupied                    |
| `CONFIRMED`       | Owner accepted the proof                                        | Occupied                    |
| `REJECTED`        | Authorized reviewer rejected with reason                        | Released                    |
| `CANCELLED`       | Player or Owner cancelled where permitted                       | Released                    |
| `EXPIRED`         | Hold ended before proof was submitted                           | Released                    |

### 5.2 Allowed transitions

| From                            | To                | Actor/condition                                                                |
| ------------------------------- | ----------------- | ------------------------------------------------------------------------------ |
| New                             | `PENDING_PAYMENT` | Player; slot is free, venue approved, time is future                           |
| `PENDING_PAYMENT`               | `PENDING_REVIEW`  | Booking Player; valid receipt submitted while booking can still accept payment |
| `PENDING_PAYMENT`               | `EXPIRED`         | System; configured hold elapsed                                                |
| `PENDING_PAYMENT`               | `CANCELLED`       | Booking Player                                                                 |
| `PENDING_REVIEW`                | `CONFIRMED`       | Venue Owner; receipt accepted                                                  |
| `PENDING_REVIEW`                | `REJECTED`        | Venue Owner/Admin; reason required                                             |
| `PENDING_REVIEW` or `CONFIRMED` | `CANCELLED`       | Player or Owner, subject to cancellation policy                                |

Rejected, expired, and cancelled are terminal. Any unsupported transition returns `409 INVALID_STATE_TRANSITION`. The exact cancellation cutoff/penalty is not present in the scan; do not invent a refund or fee rule.

### 5.3 Pricing, time, and consistency rules

- `venueFee = slot price override`, or venue hourly price multiplied by duration when no override exists.
- `serviceFee` is calculated from the active Admin-configured service-fee policy. The scan proves the sample is EGP 30 on an EGP 600 venue fee but does not establish whether the general policy is fixed or percentage-based. Keep the policy configurable and do not infer a formula beyond its configured value.
- `totalAmount = venueFee + serviceFee`; all amounts are server-calculated and stored as currency-safe decimal/minor-unit values, not binary floating point.
- Snapshot all price components, currency, recipient details, and booking schedule at creation/payment display. Later venue/settings changes do not rewrite history.
- Transfer is manual to the recipient displayed; a submitted receipt is not considered verified until accepted. Report pending, rejected, and confirmed amounts separately.
- Use `Africa/Cairo` for local booking dates, schedule interpretation, past-slot checks, and availability. Store timestamps consistently (UTC instants plus venue-local date/time where needed).
- An active booking is `PENDING_PAYMENT` with a valid hold, `PENDING_REVIEW`, or `CONFIRMED`. One active booking per venue slot/date is enforced in the database.

## 6. API Contract

All routes are under `/api`. Validate query/body/file input before services run. Protected routes use the role/ownership rules in section 2. API responses contain only fields needed by the UI and never return password/session secrets.

### 6.1 Common response, pagination, and errors

Success response:

```json
{
  "success": true,
  "data": {},
  "meta": { "page": 1, "limit": 10, "total": 0, "totalPages": 0 }
}
```

Error response:

```json
{
  "success": false,
  "error": {
    "code": "SLOT_TAKEN",
    "message": "This time is no longer available.",
    "details": null
  }
}
```

- List defaults: `page=1`, `limit=10`, maximum `limit=50`. Empty result is an empty list; invalid page/limit/sort returns `400 VALIDATION_ERROR`.
- Each endpoint has a documented sort allowlist. Filters combine with AND semantics unless a documented multi-value filter is explicitly OR-based.
- Required codes include `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `EMAIL_ALREADY_EXISTS` (409), `SLOT_TAKEN` (409), `SLOT_BLOCKED` (409), `SLOT_IN_PAST` (400), `VENUE_NOT_APPROVED` (409), `LOCK_EXPIRED` (409), `INVALID_STATE_TRANSITION` (409), `SLOT_HAS_BOOKINGS` (409), and `RATE_LIMITED` (429).

### 6.2 Required endpoint groups

| Group                | Routes/capabilities                                                                                                                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth                 | `POST /auth/register`, `/login`, `/google`, `/refresh`, `/logout`; `GET/PATCH /auth/me`; OTP request/resend/verify/reset routes                                                                     |
| Public venues        | `GET /venues` (search/list), `GET /venues/:id`, `GET /venues/:id/availability?date=YYYY-MM-DD`, `GET /venues/:id/reviews`                                                                           |
| Favorites            | `GET /favorites`, `POST /favorites/:venueId`, `DELETE /favorites/:venueId`                                                                                                                          |
| Owner venues         | `POST /owner/venues` (multipart), `GET /owner/venues`, `PUT /owner/venues/:id`, `DELETE /owner/venues/:id`; photo operations as required by the form                                                |
| Owner availability   | Slot CRUD under `/owner/venues/:id/slots`; block/list/unblock under `/owner/venues/:id/blocked-slots`                                                                                               |
| Bookings             | `POST /bookings`, `POST /bookings/:id/receipt` (multipart), `GET /bookings/my`, `GET /bookings/:id`, `PATCH /bookings/:id/cancel`                                                                   |
| Owner bookings       | `GET /owner/bookings`, owner confirm/reject actions, owner-scoped booking detail/check-in fields                                                                                                    |
| Player notifications | `GET /notifications`, `GET /notifications/unread-count`, mark one/all read                                                                                                                          |
| Owner dashboard      | Owner summary, listing performance, earnings/transactions, payout-account read/update                                                                                                               |
| Admin                | Users/owners and verification, venue queue/approve/reject, booking list/detail/actions, categories CRUD, complaint list/detail/resolve, reports/download, settings read/update, activity/audit list |

The exact route spelling for OTP, category actions, complaints, payout account, reports, and settings is finalized in Swagger before frontend integration. It must not change the required data or introduce UI controls absent from Figma.

### 6.3 UI-facing search/filter fields

- Public venues: text query, location/city, sport, date/availability, price bounds, sort, page/limit. Distance sorting is not required unless confirmed by the actual Explore controls.
- Owner venues: text query, publish/approval state, sort, page/limit.
- Admin venues: text query, approval state, sport/city/date filters, sort, page/limit.
- Player bookings: visible status group, date range, venue text where shown, sort, page/limit.
- Owner bookings: visible state, venue/date filters, player text where shown, sort, page/limit.
- Admin users, complaints, categories, and reports: implement only filters visibly present in their screens; detailed scan is required before adding more.
- Favorites: visible category/filter controls, plus pagination if the result list needs it.

## 7. Data Model and Constraints

IDs may be UUIDs; use `createdAt`/`updatedAt` consistently and `deletedAt` only for soft-deleted entities. Monetary fields use fixed precision/minor units with `currency = EGP`.

| Entity             | Key fields and constraints                                                                                                                                                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `User`             | id, name, unique email, phone, passwordHash or Google subject, role, isActive, ownerVerificationStatus, createdAt, updatedAt, deletedAt                                                                                                                     |
| `RefreshSession`   | id, userId, tokenHash, expiresAt, revokedAt, createdAt; never store raw refresh token                                                                                                                                                                       |
| `PasswordResetOtp` | id, userId, codeHash, expiresAt, usedAt, attemptCount, createdAt; one-time and rate-limited                                                                                                                                                                 |
| `Venue`            | id, ownerId, name, sportCategoryId, city/address, optional lat/lng/map URL, contact phone, private InstaPay recipient/name, hourly price, description, facilities, approval state/reason/reviewer/time, deletedAt                                           |
| `VenuePhoto`       | id, venueId, URL/storage key, display order; at least one active photo for publishing                                                                                                                                                                       |
| `SportCategory`    | id, name, description/rules as confirmed by form, active state; unique normalized name                                                                                                                                                                      |
| `SlotTemplate`     | id, venueId, weekday, start/end local time, optional price override, active state; no overlap within venue/day                                                                                                                                              |
| `BlockedSlot`      | id, venueId, date, optional slot/time range, reason; cannot overlap active booking                                                                                                                                                                          |
| `Booking`          | id, public reference, playerId, venueId, slotId, date/start/end snapshots, venueFee, serviceFee, totalAmount, currency, recipient/name snapshots, state, holdExpiresAt, receipt URL/hash, submittedAt, reviewerId, decision/reason, cancelledBy, timestamps |
| `Review`           | id, venueId, playerId, rating, comment, createdAt, deletedAt; read for Stadium Details; write flow is outside current UI scope                                                                                                                              |
| `Favorite`         | playerId, venueId, createdAt; unique `(playerId, venueId)`                                                                                                                                                                                                  |
| `Notification`     | id, userId, type, message, related entity, isRead, createdAt                                                                                                                                                                                                |
| `PlatformSetting`  | key, validated value, updatedBy, updatedAt; fee/policy and notification settings                                                                                                                                                                            |
| `Complaint`        | id, reference, category/title/description fields as confirmed, status, resolution, timestamps, resolver; no new public intake UI implied                                                                                                                    |
| `PayoutAccount`    | ownerId, provider/display fields confirmed by design, protected account reference, updatedAt; no automatic payout integration                                                                                                                               |
| `Transaction`      | booking/owner reference, amount components, review/confirmation state, timestamps; represents recorded booking activity, not gateway settlement                                                                                                             |
| `AuditLog`         | actorId, action, entity type/id, metadata, createdAt; append-only                                                                                                                                                                                           |

Database guarantees: unique email; unique favorite per Player/Venue; unique public booking reference; partial unique index for active venue slot/date; foreign keys; and appropriate indexes for venue filters, booking history, owner booking lists, and notifications. Use transactions and conditional updates for state changes.

## 8. Notifications, Real-Time, and Auditing

- Persist a notification before attempting Socket.io delivery. REST remains the fallback if the client is offline.
- Authenticate the Socket.io handshake; join `user:{userId}` only after verification. Join `venue:{venueId}` only after checking the client may view that venue’s availability.
- Required events: `notification:new` to the user; `booking:updated` to the Player and venue Owner; `availability:changed` to authorized viewers of that venue.
- Emit availability changes after a booking is created, cancelled, confirmed, rejected, or expired, and after a block/schedule update.
- Audit Admin approval/rejection, owner-verification decisions, Admin booking actions, Owner booking decisions, account activation changes, and platform-setting changes. Do not log secrets or raw receipt contents.
- Notification types should cover venue approval/rejection, booking created, receipt submitted, booking confirmed/rejected/cancelled/expired, and relevant reminders. Avoid sending duplicate notifications for retried state updates.

## 9. Security, Upload, and Reliability Requirements

- Hash passwords with bcrypt or an equivalent approved password hash. Store only hashes of refresh tokens and OTPs. Use short-lived access credentials and rotate refresh sessions.
- Rate-limit login, registration, Google callback/token exchange, OTP request/resend/verify, and password changes. Use generic forgot-password responses.
- Validate every field with shared schemas. Parameterize database access; never build raw SQL from untrusted input. If raw SQL is used for the active-booking index, keep it in a migration.
- Validate file size and detected content type, not only file extension. Receipt accepts JPG, PNG, PDF up to 10 MB. Venue photos accept configured image types/size. Restrict signed/private receipt access and clean up uploads when a database transition fails.
- Keep payment-recipient values out of public venue list/detail responses; return them only during the authorized booking/payment flow. Never return credentials, OTPs, token hashes, or password hashes.
- Use a global error handler and consistent error response. Expected conflicts must not become generic 500 responses. Make uploads, notification delivery, and retryable actions idempotent where possible.
- Soft-deleted data is excluded from normal reads. Admin access to retained moderation/audit data is role-restricted.

## 10. Non-Functional Requirements

| ID     | Category        | Requirement                                                                                                                                                         |
| ------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-01 | Performance     | Target p95 at or below 500 ms for typical list/detail API requests at approximately 100 concurrent users.                                                           |
| NFR-02 | Database        | Paginate lists; avoid N+1 queries; index commonly filtered/joined fields; measure venue search and booking history on seeded data.                                  |
| NFR-03 | Reliability     | Booking create/review/cancel operations are transactional or conditional; race conditions return deterministic conflicts.                                           |
| NFR-04 | Security        | Enforce input validation, authentication, role/ownership checks, rate limits, secure sessions, private uploads, Helmet, and restricted CORS.                        |
| NFR-05 | Maintainability | Layer routes/controllers/services/data access; use migrations, lint/format checks, reusable pagination/validation, and structured logs.                             |
| NFR-06 | Testing         | At least 70% business-logic coverage; include integration tests for permissions, OTP lifecycle, upload validation, fees, state transitions, and concurrency.        |
| NFR-07 | Documentation   | Swagger covers every implemented endpoint, schema, query, response, error, and authorization requirement.                                                           |
| NFR-08 | Compatibility   | Keep API/browser behavior compatible with the supported frontend stack. Mobile layout is not specified by the scanned Figma and is not an API acceptance condition. |

## 11. Configuration and Release Settings

Configure through environment or validated platform settings: `DATABASE_URL`, access/session secrets and lifetimes, Google OAuth credentials, email/OTP delivery, upload storage credentials, `FRONTEND_URL`, `TZ=Africa/Cairo`, booking-hold duration, upload-size limits, Admin seed credentials, and the service-fee policy. Never commit secrets. The Admin settings UI may update only explicitly supported policy keys; every change is audited.

## 12. Design Details Requiring Confirmation

The scan does not fully establish profile field labels, service-fee formula/allocation, cancellation cutoffs, complaint intake fields, owner-verification evidence, payout-provider fields, every Admin/Owner action, all status-tab labels, or responsive/mobile behavior. Implement the stable data needed by observed screens, keep uncertain values configurable, and obtain a detailed frame review before adding fields or new UI requirements.
