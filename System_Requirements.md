# El3abha: System Requirements

> Sports venue booking platform. Players find and book venues (football pitches, padel courts, and more), Venue Owners publish venues and manage bookings, and an Admin verifies every venue before it goes live.

**Stack:** Node.js + Express · Prisma · PostgreSQL · Socket.io · Jest + Supertest · Swagger/OpenAPI · React (frontend)
**Team:** Backend/DB/Testing: Omar Gamal, Ahmed Arafa · Frontend/UI: Farah Shaaban, Rawan Tarek, Habiba Mohamed, Youssef Mahmoud

---

## 1. Purpose and Scope

### 1.1 Purpose
Replace phone calls and social media groups with one platform where venue details, prices, photos, free time slots, and booking status live in one place.

### 1.2 In scope
- Registration and login for Players and Venue Owners; a pre-created Admin
- Venue submission with photos, Admin approval or rejection
- Owner-defined weekly time slots, blocked slots, and per-slot pricing
- Search, filtering, sorting, and pagination on all list screens
- Booking with a 30% deposit paid manually to the owner (InstaPay / mobile wallet), with a short slot lock
- Owner verification of the payment and confirmation of the booking
- Reviews, favorites, nearest-venue search
- In-app notifications, delivered in real time over WebSocket
- Audit log, soft delete, email verification, password reset

### 1.3 Out of scope (current version)
- Any payment gateway, refunds, or holding money (the platform never touches money)
- PayPal / bank card payments
- Multiple pitches inside one venue (**one venue = one bookable unit**)
- Native mobile apps, live chat, matchmaking between players
- Multiple Admin accounts or Admin registration from the website

---

## 2. Roles and Permissions

| Capability | Player | Owner | Admin |
|---|:--:|:--:|:--:|
| Register / log in | ✔ | ✔ | log in only (seeded) |
| Browse, search, filter approved venues | ✔ | ✔ | ✔ |
| View venue details and availability | ✔ | ✔ | ✔ |
| Create / edit / delete own venues | ✘ | ✔ | ✘ |
| Manage own slots, prices, blocked slots | ✘ | ✔ | ✘ |
| Approve / reject venues | ✘ | ✘ | ✔ |
| Create booking and submit payment proof | ✔ | ✘ | ✘ |
| Confirm / reject bookings on own venues | ✘ | ✔ | ✘ |
| Cancel booking | own bookings | bookings on own venues | ✘ |
| View payment receipt | own booking | own venue's bookings | ✔ |
| Review a venue (after confirmed and played booking) | ✔ | ✘ | ✘ |
| Favorites | ✔ | ✘ | ✘ |
| Manage users, moderate venues/reviews, stats, audit log | ✘ | ✘ | ✔ |
| Owner statistics (optional) | ✘ | ✔ | ✘ |

Registration only accepts `role = PLAYER` or `OWNER`. Any attempt to register as `ADMIN` is rejected.

---

## 3. Functional Requirements

Priority: **P0** = must have (MVP), **P1** = should have, **P2** = optional.

### 3.1 Authentication and Accounts
| ID | Requirement | Pri |
|---|---|:--:|
| FR-AUTH-01 | Register with name, email (unique), phone, password, and role (PLAYER or OWNER). | P0 |
| FR-AUTH-02 | Admin is created by a seed script only. | P0 |
| FR-AUTH-03 | Login with email and password; returns a short-lived JWT access token and a refresh token. | P0 |
| FR-AUTH-04 | Refresh tokens are stored hashed, rotated on use, and revocable (logout revokes). | P1 |
| FR-AUTH-05 | Role-based access control and ownership checks enforced on the server. | P0 |
| FR-AUTH-06 | Email verification with a hashed, expiring, single-use token; resend endpoint. | P1 |
| FR-AUTH-07 | Forgot / reset password with a hashed, expiring, single-use token. | P1 |
| FR-AUTH-08 | View and edit own profile. Deactivated users cannot log in. | P1 |

### 3.2 Venues (Owner)
| ID | Requirement | Pri |
|---|---|:--:|
| FR-VEN-01 | Owner submits a venue: name, sport, city, address, latitude, longitude, Google Maps link, contact phone, payment number (InstaPay / wallet), price per hour, deposit percentage (default 30), description, facilities, photos. | P0 |
| FR-VEN-02 | At least one photo is required; only image types and a max size are accepted. | P0 |
| FR-VEN-03 | A new venue has status `PENDING` and is invisible to players. | P0 |
| FR-VEN-04 | Owner sees the status of each venue and the rejection reason if rejected. | P0 |
| FR-VEN-05 | Owner can edit or soft-delete own venues. Editing **phone, address, or payment number** of an `APPROVED` venue sends it back to `PENDING`. | P0 |
| FR-VEN-06 | A venue with active bookings cannot be deleted. | P0 |

### 3.3 Admin
| ID | Requirement | Pri |
|---|---|:--:|
| FR-ADM-01 | List venues by status (default `PENDING`) with search, filters, and pagination. | P0 |
| FR-ADM-02 | Approve a venue: it becomes visible to players and the owner is notified. | P0 |
| FR-ADM-03 | Reject a venue with a mandatory reason; the owner is notified. | P0 |
| FR-ADM-04 | List users with filters and pagination; deactivate / reactivate a user. | P1 |
| FR-ADM-05 | Soft-delete venues and reviews (moderation). | P1 |
| FR-ADM-06 | Dashboard statistics: users, venues by status, bookings by status. | P1 |
| FR-ADM-07 | View the audit log with filters and pagination. | P1 |

### 3.4 Slots, Availability, and Pricing
| ID | Requirement | Pri |
|---|---|:--:|
| FR-SLOT-01 | Owner defines **weekly slot templates**: day of week, start time, end time, optional price override. Duration is chosen by the owner (not fixed to one hour). | P0 |
| FR-SLOT-02 | Slots of the same venue and day must not overlap. | P0 |
| FR-SLOT-03 | Owner can block a specific slot or a whole day on a given date (maintenance, holiday, phone booking) with a reason. A slot with an active booking cannot be blocked. | P0 |
| FR-SLOT-04 | Editing or deactivating a slot template that has active future bookings is rejected. | P0 |
| FR-SLOT-05 | Availability endpoint for a venue and date returns each slot with state `AVAILABLE`, `BOOKED`, `BLOCKED`, or `PAST`, plus its price. | P0 |
| FR-SLOT-06 | Slot price = slot price override if set, otherwise `pricePerHour × duration in hours`. Deposit = `depositPercentage%` of that price. Both are always computed on the server. | P0 |

### 3.5 Booking and Payment
| ID | Requirement | Pri |
|---|---|:--:|
| FR-BOOK-01 | Player creates a booking for a venue, date, and slot. The server locks the slot for a short time (default 10 min, configurable) with status `PENDING_PAYMENT`. | P0 |
| FR-BOOK-02 | The create response contains totalPrice, depositAmount, the owner's payment number, and `lockExpiresAt`. The payment number is revealed only to the player who created the booking. | P0 |
| FR-BOOK-03 | Player submits payment: payment method, sender number, and a receipt image (must show date and time). Allowed only while `PENDING_PAYMENT` and before `lockExpiresAt`. Status becomes `PENDING_CONFIRMATION` and the lock no longer expires. | P0 |
| FR-BOOK-04 | Owner confirms (`CONFIRMED`) or rejects (`REJECTED`, with a reason) a booking in `PENDING_CONFIRMATION`. | P0 |
| FR-BOOK-05 | If no payment is submitted before `lockExpiresAt`, the booking becomes `EXPIRED` and the slot is released. | P0 |
| FR-BOOK-06 | Player or owner can cancel; the slot is released. There is **no refund** (platform handles no money). | P0 |
| FR-BOOK-07 | Past slots cannot be booked. | P0 |
| FR-BOOK-08 | Only venues with status `APPROVED` can be booked. | P0 |
| FR-BOOK-09 | The player can see the owner's phone number to contact them directly. | P0 |
| FR-BOOK-10 | The server stores a SHA-256 hash of each receipt image and flags a receipt that was already used on another booking (shown to the owner as a warning, not auto-rejected). | P1 |
| FR-BOOK-11 | Player history and owner incoming bookings support filters, search, sorting, and pagination (section 5). | P0 |
| FR-BOOK-12 | If the owner does not respond to `PENDING_CONFIRMATION`, the booking stays pending. Reminder notifications only; no auto-cancel. | P1 |

### 3.6 Reviews and Favorites
| ID | Requirement | Pri |
|---|---|:--:|
| FR-REV-01 | A player can review a venue (rating 1 to 5, optional comment) only if they have a `CONFIRMED` booking whose slot has already ended. One review per player per venue. | P1 |
| FR-REV-02 | Average rating and review count are computed and returned with the venue. | P1 |
| FR-REV-03 | Reviews list supports rating filter, sorting, and pagination. | P1 |
| FR-FAV-01 | A player can add or remove a venue from favorites and list favorites with pagination. | P1 |

### 3.7 Notifications and Real-time
| ID | Requirement | Pri |
|---|---|:--:|
| FR-NOT-01 | Every notification is saved in the database first, then pushed in real time over WebSocket. | P0 |
| FR-NOT-02 | Notification types: `VENUE_APPROVED`, `VENUE_REJECTED`, `BOOKING_CREATED`, `PAYMENT_SUBMITTED`, `BOOKING_CONFIRMED`, `BOOKING_REJECTED`, `BOOKING_CANCELLED`, `BOOKING_EXPIRED`, `BOOKING_REMINDER`. | P0 |
| FR-NOT-03 | List notifications (filter by read state and type, paginated), unread count, mark one read, mark all read. | P0 |
| FR-NOT-04 | When a slot is locked, released, or confirmed, everyone viewing that venue's availability gets a live update. | P1 |

---

## 4. Business Rules and Booking State Machine

### 4.1 Booking statuses
| Status | Meaning | Slot occupied? |
|---|---|:--:|
| `PENDING_PAYMENT` | Slot locked; waiting for the player to pay and submit proof | Yes (until `lockExpiresAt`) |
| `PENDING_CONFIRMATION` | Proof submitted; waiting for the owner to verify | Yes |
| `CONFIRMED` | Owner confirmed the deposit | Yes |
| `REJECTED` | Owner rejected (reason required) | No |
| `CANCELLED` | Cancelled by player or owner | No |
| `EXPIRED` | Lock ran out without payment | No |

### 4.2 Allowed transitions
| From | To | Triggered by | Condition |
|---|---|---|---|
| (new) | `PENDING_PAYMENT` | Player | Slot free, venue approved, slot not in the past |
| `PENDING_PAYMENT` | `PENDING_CONFIRMATION` | Player | `lockExpiresAt` not passed |
| `PENDING_PAYMENT` | `EXPIRED` | System | `lockExpiresAt` passed |
| `PENDING_PAYMENT` | `CANCELLED` | Player | none |
| `PENDING_CONFIRMATION` | `CONFIRMED` | Owner | none |
| `PENDING_CONFIRMATION` | `REJECTED` | Owner | reason provided |
| `PENDING_CONFIRMATION` | `CANCELLED` | Player or Owner | none |
| `CONFIRMED` | `CANCELLED` | Player or Owner | none |

`REJECTED`, `CANCELLED`, and `EXPIRED` are final. Any other transition returns `409 INVALID_STATE_TRANSITION`.

### 4.3 Rules
- **BR-01** Amounts (`totalPrice`, `depositAmount`) are always computed on the server, never taken from the client.
- **BR-02** Active statuses (occupy a slot): `PENDING_PAYMENT`, `PENDING_CONFIRMATION`, `CONFIRMED`.
- **BR-03** The deposit goes straight to the owner's payment number. The platform never holds money.
- **BR-04** The owner's payment number is not shown on public venue endpoints.
- **BR-05** Dates and "past slot" checks use the **Africa/Cairo** timezone.
- **BR-06** Soft-deleted users, venues, and reviews are excluded from every query.
- **BR-07** Every Admin decision and every booking decision (confirm, reject, cancel) writes an audit log entry.

---

## 5. Search, Filtering, Sorting, and Pagination

### 5.1 Pagination contract (all list endpoints)
- Query params: `page` (default 1), `limit` (default 10, max 50).
- Response:
```json
{
  "success": true,
  "data": [ ... ],
  "meta": { "page": 1, "limit": 10, "total": 57, "totalPages": 6 }
}
```
- `page` or `limit` out of range returns `400 VALIDATION_ERROR`. An empty result returns `data: []`, not an error.
- `total` comes from a `count` query in the same transaction as the list query.
- Sorting uses a `sort` param with a whitelist of allowed values per endpoint (unknown values return 400).

### 5.2 Per-endpoint search, filters, and sorting

| Endpoint | Search (`q`) | Filters | Sort values (default first) |
|---|---|---|---|
| `GET /venues` (public, approved only) | name, city, address, description (case-insensitive) | `sport`, `city`, `minPrice`, `maxPrice`, `minRating`, `lat` + `lng` + `radiusKm` (default 10), `date` + `availableOnly=true` (P1) | `newest`, `price_asc`, `price_desc`, `rating_desc`, `distance` (only with `lat`/`lng`) |
| `GET /owner/venues` | name | `status` | `newest`, `name_asc` |
| `GET /admin/venues` | name, owner name | `status` (default `PENDING`), `sport`, `city`, `ownerId`, `createdFrom`, `createdTo` | `oldest` (default for pending), `newest` |
| `GET /admin/users` | name, email, phone | `role`, `isActive`, `emailVerified` | `newest`, `name_asc` |
| `GET /admin/audit-logs` | none | `actorId`, `action`, `entityType`, `from`, `to` | `newest` |
| `GET /bookings/my` | venue name | `status` (multi), `dateFrom`, `dateTo`, `when=upcoming\|past` | `date_desc`, `date_asc`, `newest` |
| `GET /owner/bookings` | player name, player phone | `status` (multi), `venueId`, `dateFrom`, `dateTo` | `date_asc`, `date_desc`, `newest` |
| `GET /venues/:id/reviews` | none | `rating` | `newest`, `rating_desc`, `rating_asc` |
| `GET /favorites` | venue name | `sport`, `city` | `newest` |
| `GET /notifications` | none | `isRead`, `type` | `newest` |

### 5.3 Implementation notes
- Build `where` clauses from a validated query object (Zod), never from raw query strings.
- Nearest search: filter by a latitude/longitude bounding box first, then compute exact distance with the Haversine formula (Prisma `$queryRaw`) and sort by it. PostGIS is not required.
- Text search: `ILIKE` with an index (a `pg_trgm` GIN index is recommended on venue name/city).
- Recommended indexes: `Venue(status, city, sport)`, `Venue(pricePerHour)`, `Venue(latitude, longitude)`, `Booking(playerId, createdAt)`, `Booking(venueId, date)`, `Notification(userId, isRead, createdAt)`.
- Shared helpers (`paginate()`, `buildSort()`, query schemas) are written once and reused by all list endpoints.

---

## 6. Data Model

Conventions: `id` is a UUID (or autoincrement; team decides once), timestamps `createdAt` / `updatedAt`, `deletedAt` for soft delete. Time of day is stored as `"HH:mm"` strings, dates as `DATE`.

| Entity | Fields | Constraints / Notes |
|---|---|---|
| **User** | id, name, email, phone, passwordHash, role (`PLAYER`/`OWNER`/`ADMIN`), isActive, emailVerified, deletedAt, createdAt | `email` unique |
| **Venue** | id, ownerId → User, name, sport, city, address, latitude, longitude, mapsUrl, phone, paymentNumber, depositPercentage (default 30), pricePerHour, description, facilities (string[]), status (`PENDING`/`APPROVED`/`REJECTED`), rejectionReason, reviewedById → User, reviewedAt, deletedAt, createdAt, updatedAt | `sport` is an enum, extensible (`FOOTBALL`, `PADEL`, ...) |
| **VenuePhoto** | id, venueId, url, publicId | at least 1 per venue |
| **SlotTemplate** | id, venueId, dayOfWeek (0 to 6), startTime, endTime, price (nullable override), isActive | no overlap per (venueId, dayOfWeek); validated in the service |
| **BlockedSlot** | id, venueId, date, slotTemplateId (nullable = whole day), reason | cannot be created over an active booking |
| **Booking** | id, venueId, slotTemplateId, playerId, date, startTime, endTime (snapshots), totalPrice, depositAmount, status, lockExpiresAt, paymentMethod (`INSTAPAY`/`VODAFONE_CASH`/`ETISALAT_CASH`/`ORANGE_CASH`), senderNumber, paymentProofUrl, proofHash, paymentSubmittedAt, decidedAt, rejectionReason, cancelledById, createdAt, updatedAt | **Partial unique index** on `(slotTemplateId, date)` where status in active statuses |
| **Review** | id, venueId, playerId, rating (1 to 5), comment, deletedAt, createdAt | unique `(venueId, playerId)` |
| **Favorite** | userId, venueId, createdAt | unique `(userId, venueId)` |
| **Notification** | id, userId, type, message, relatedId, isRead, createdAt | |
| **RefreshToken** | id, userId, tokenHash, expiresAt, revokedAt, createdAt | |
| **EmailVerificationToken** / **PasswordResetToken** | id, userId, tokenHash, expiresAt, usedAt | single use |
| **AuditLog** | id, actorId, action, entityType, entityId, metadata (JSON), createdAt | append only |

Design notes:
- Because the owner picks the slots, a booking points to a slot template plus a date. Overlap between different slots is prevented by validating slot templates at creation, so a unique index on `(slotTemplateId, date)` is enough to prevent double booking.
- `startTime`/`endTime` are copied into the booking so history stays correct even if the owner later changes the schedule.
- The partial unique index is created in a **raw SQL migration**, because the Prisma schema cannot express it.

---

## 7. API Summary (prefix `/api`)

**Auth:** `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `PATCH /auth/me`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/verify-email`, `POST /auth/resend-verification`, `POST /auth/forgot-password`, `POST /auth/reset-password`

**Venues (public):** `GET /venues`, `GET /venues/:id`, `GET /venues/:id/availability?date=YYYY-MM-DD`, `GET /venues/:id/reviews`

**Favorites:** `GET /favorites`, `POST /favorites/:venueId`, `DELETE /favorites/:venueId`

**Owner:** `POST /owner/venues` (multipart), `GET /owner/venues`, `PUT /owner/venues/:id`, `DELETE /owner/venues/:id`, `GET|POST|PUT|DELETE /owner/venues/:id/slots`, `GET|POST|DELETE /owner/venues/:id/blocked-slots`, `GET /owner/bookings`, `GET /owner/stats` (P2)

**Bookings:** `POST /bookings`, `POST /bookings/:id/payment` (multipart), `GET /bookings/my`, `GET /bookings/:id`, `PATCH /bookings/:id/confirm`, `PATCH /bookings/:id/reject`, `PATCH /bookings/:id/cancel`

**Reviews:** `POST /venues/:id/reviews`

**Notifications:** `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`

**Admin:** `GET /admin/venues`, `PATCH /admin/venues/:id/approve`, `PATCH /admin/venues/:id/reject`, `DELETE /admin/venues/:id`, `GET /admin/users`, `PATCH /admin/users/:id/deactivate`, `PATCH /admin/users/:id/activate`, `DELETE /admin/reviews/:id`, `GET /admin/stats`, `GET /admin/audit-logs`

### Response and error format
```json
{ "success": true, "data": { }, "meta": { } }
{ "success": false, "error": { "code": "SLOT_TAKEN", "message": "This slot is no longer available.", "details": null } }
```

| Code | HTTP | When |
|---|:--:|---|
| `VALIDATION_ERROR` | 400 | Invalid body, query, or file |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Wrong role, not the owner of the resource, deactivated account |
| `NOT_FOUND` | 404 | Resource does not exist or is soft-deleted |
| `EMAIL_ALREADY_EXISTS` | 409 | Duplicate email |
| `SLOT_TAKEN` | 409 | Slot has an active booking |
| `SLOT_BLOCKED` | 409 | Owner blocked the slot or day |
| `SLOT_IN_PAST` | 400 | Slot start time has passed |
| `VENUE_NOT_APPROVED` | 400 | Booking a non-approved venue |
| `LOCK_EXPIRED` | 409 | Payment submitted after `lockExpiresAt` |
| `INVALID_STATE_TRANSITION` | 409 | Transition not allowed (section 4.2) |
| `SLOT_HAS_BOOKINGS` | 409 | Editing, blocking, or deleting something with active bookings |
| `REVIEW_NOT_ALLOWED` | 403 | No finished confirmed booking |
| `REVIEW_ALREADY_EXISTS` | 409 | Second review of the same venue |
| `RATE_LIMITED` | 429 | Too many requests |

---

## 8. Concurrency and Race Conditions

Scenario: two players press "Book" on the same venue, date, and slot at the same time. Exactly one succeeds (201); the other gets `409 SLOT_TAKEN`. Because the player pays during the booking flow, the slot is locked **before** the payment screen, so nobody transfers money for a slot that is already taken.

1. **Database guarantee:** partial unique index on `Booking(slotTemplateId, date)` where status in (`PENDING_PAYMENT`, `PENDING_CONFIRMATION`, `CONFIRMED`).
2. **Insert, don't check:** insert directly and map Prisma error `P2002` to `409 SLOT_TAKEN`. No "check then insert".
3. **Lazy expiry:** inside the create-booking transaction, first mark stale `PENDING_PAYMENT` rows for that slot and date as `EXPIRED` (where `lockExpiresAt < now`), then insert.
4. **Cron (every minute):** expire stale locks, notify players, emit `availability:changed`.
5. **Atomic status changes:** use `updateMany` with the expected current status in `WHERE` and check the affected count. This covers confirm vs. expire, double-clicked confirm, and player/owner cancelling together.
6. **Payment submission:** conditional update `PENDING_PAYMENT → PENDING_CONFIRMATION` only if `lockExpiresAt > now`. Upload the receipt first; if the update fails, delete the uploaded image.
7. **Reviews and favorites:** unique constraints at the database level, handle `P2002`.
8. **Blocking vs. booking:** blocking a slot that has an active booking is rejected (`SLOT_HAS_BOOKINGS`).
9. **Required test:** fire N parallel `POST /bookings` for the same slot with `Promise.all` and assert exactly one `201` and N−1 `409`.

---

## 9. Real-time (Socket.io)

- Attached to the same HTTP server as Express. The JWT is verified in the handshake; unauthenticated connections are rejected.
- Rooms: `user:{userId}` (joined automatically) and `venue:{venueId}` (joined by clients viewing a venue's availability).
- Events:

| Event | Sent to | Payload |
|---|---|---|
| `notification:new` | `user:{id}` | the saved notification |
| `booking:updated` | player and owner of the booking | bookingId, new status |
| `availability:changed` | `venue:{venueId}` | date, slotTemplateId, new slot state |

- Notifications are saved in the database before emitting. REST endpoints remain the fallback when the socket is disconnected.
- Deployment: the host must support WebSockets. Running multiple server instances later requires the Socket.io Redis adapter.

---

## 10. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Performance | 95% of typical API requests respond in ≤ 500 ms; about 100 concurrent users supported. |
| NFR-02 | Performance | List endpoints are always paginated; no unbounded queries; indexes per section 5.3. |
| NFR-03 | Security | bcrypt hashing; short-lived JWT; hashed refresh tokens; Helmet; CORS restricted to the frontend origin. |
| NFR-04 | Security | Strict rate limits on login, register, forgot-password; general limit elsewhere. |
| NFR-05 | Security | Server-side validation of every input (Zod); Prisma parameterized queries. |
| NFR-06 | Security | Uploads limited to image types and a max size; receipts visible only to the booking's player, the venue's owner, and Admin. |
| NFR-07 | Reliability | Consistent error format and codes; global error handler; no unhandled crashes. |
| NFR-08 | Reliability | Schema managed with Prisma migrations; seed script for the Admin. |
| NFR-09 | Maintainability | Layered code (routes → controllers → services → Prisma); ESLint + Prettier; backend unit test coverage ≥ 70% of business logic. |
| NFR-10 | Documentation | Swagger/OpenAPI for every endpoint, with request/response examples and error codes. |
| NFR-11 | Extensibility | Adding a payment gateway or new sports must not require redesigning the schema or API. |
| NFR-12 | Compatibility | Frontend works on current Chrome, Firefox, Edge, Safari, and responsive on mobile. |

---

## 11. Environment and Configuration (`.env`)

`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES`, `JWT_REFRESH_EXPIRES`, `CLOUDINARY_*`, `SMTP_*`, `FRONTEND_URL`, `BOOKING_LOCK_MINUTES` (default 10), `MAX_UPLOAD_MB`, `TZ=Africa/Cairo`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (used only by the seed script).

---

## 12. Assumptions

- One venue is one bookable unit.
- Slots are fully owner-defined (any duration); there is no fixed one-hour grid.
- One payment number per venue covers InstaPay and wallets.
- The owner verifies the deposit manually in their own InstaPay / wallet app; there is no automatic verification.
- Deposits are non-refundable and no money passes through the platform.
- Pricing: per-slot override or `pricePerHour × duration`, replacing a separate pricing-rules table.
