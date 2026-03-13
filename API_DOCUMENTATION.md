# Payment Gateway API Documentation

## Overview

A NestJS-based payment gateway POC integrating **Stripe Checkout** with **JWT authentication**.  
Users must register and log in before initiating payments. Payment status is updated automatically via Stripe webhooks.

**Base URL:** `http://localhost:3000/api`  
**Auth:** Bearer JWT token in `Authorization` header (required for payment endpoints)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS |
| Database | PostgreSQL via Prisma ORM |
| Payments | Stripe Checkout |
| Auth | JWT (7-day expiry) + bcrypt |

---

## Database Models

### User
| Field | Type | Description |
|---|---|---|
| `id` | Int | Auto-increment primary key |
| `email` | String (unique) | User's email address |
| `password` | String | bcrypt-hashed password |
| `createdAt` | DateTime | Record creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |

### Payment
| Field | Type | Description |
|---|---|---|
| `id` | Int | Auto-increment primary key |
| `amount` | Float | Payment amount in major currency units (e.g. 50 = $50.00) |
| `currency` | String | ISO currency code (e.g. `usd`, `inr`) |
| `status` | String | `PENDING` \| `COMPLETED` \| `FAILED` |
| `stripePaymentIntentId` | String? (unique) | Stripe Checkout Session ID |
| `userId` | Int | FK → User |
| `createdAt` | DateTime | Record creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |

---

## Authentication APIs

### 1. Register User

**`POST /api/auth/register`**

Creates a new user account. Password is hashed with bcrypt (10 salt rounds) before storage.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `email` | string | ✅ | Must be a valid email address |
| `password` | string | ✅ | Minimum 6 characters |

**Success Response — `201 Created`:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

**Error Responses:**
| Status | Condition | Message |
|---|---|---|
| `409 Conflict` | Email already exists | `Email is already registered` |
| `400 Bad Request` | Validation failed | Validation error details |
| `500 Internal Server Error` | DB or bcrypt failure | `Registration failed. Please try again.` |

**cURL:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "secret123"}'
```

---

### 2. Login User

**`POST /api/auth/login`**

Authenticates an existing user and returns a signed JWT token (valid for 7 days).

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `email` | string | ✅ | Must be a valid email address |
| `password` | string | ✅ | Any non-empty string |

**Success Response — `200 OK`:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**
| Status | Condition | Message |
|---|---|---|
| `401 Unauthorized` | Wrong email or password | `Invalid email or password` |
| `400 Bad Request` | Validation failed | Validation error details |
| `500 Internal Server Error` | DB or JWT failure | `Login failed. Please try again.` |

**cURL:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "secret123"}'
```

> ⚠️ Copy the `accessToken` from the response — it is required as `Authorization: Bearer <token>` for all payment endpoints.

---

## Payment APIs

> 🔒 All payment endpoints require a valid JWT token in the `Authorization` header.

### 3. Create Payment Intent

**`POST /api/payments/create-intent`**

Creates a Stripe Checkout Session for the authenticated user and stores a `PENDING` payment record in the database. Returns the Stripe-hosted checkout URL where the user completes the payment.

**Headers:**
```
Authorization: Bearer <ACCESS_TOKEN>
```

**Request Body:**
```json
{
  "amount": 50,
  "currency": "usd"
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `amount` | number | ✅ | Minimum `0.5` (in major units, e.g. `50` = $50.00) |
| `currency` | string | ✅ | ISO 4217 currency code (e.g. `usd`, `inr`, `eur`) |

**What happens internally:**
1. Extracts `userId` from the JWT token.
2. Looks up the user's email from the DB to pre-fill the Stripe checkout form.
3. Creates a Stripe Checkout Session with `mode: payment`.
4. Saves a `Payment` record with status `PENDING` and the Stripe Session ID.
5. Returns the Stripe-hosted checkout URL.

**Success Response — `201 Created`:**
```json
{
  "success": true,
  "message": "Payment intent created successfully",
  "data": {
    "paymentId": 1,
    "url": "https://checkout.stripe.com/c/pay/cs_test_..."
  }
}
```

**Error Responses:**
| Status | Condition | Message |
|---|---|---|
| `401 Unauthorized` | Missing or invalid JWT | `No token provided` / `Invalid or expired token` |
| `404 Not Found` | User from token not found in DB | `User #1 not found` |
| `400 Bad Request` | Stripe API error | `Payment creation failed: <stripe message>` |
| `400 Bad Request` | Validation failed | Validation error details |
| `500 Internal Server Error` | Unexpected failure | `Failed to create payment. Please try again.` |

**cURL:**
```bash
curl -X POST http://localhost:3000/api/payments/create-intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"amount": 50, "currency": "usd"}'
```

> Open the returned `url` in a browser to complete the Stripe checkout. After payment, Stripe redirects to `/api/success` or `/api/fail`.

---

### 4. Get Payment by ID

**`GET /api/payments/:id`**

Retrieves a single payment record by its database ID, including the associated user's details.

**Headers:**
```
Authorization: Bearer <ACCESS_TOKEN>
```

**URL Parameter:**

| Param | Type | Description |
|---|---|---|
| `id` | integer | The payment's database ID |

**Success Response — `200 OK`:**
```json
{
  "success": true,
  "message": "Payment retrieved successfully",
  "data": {
    "id": 1,
    "amount": 50,
    "currency": "usd",
    "status": "COMPLETED",
    "stripePaymentIntentId": "cs_test_...",
    "userId": 1,
    "createdAt": "2026-03-10T06:30:00.000Z",
    "updatedAt": "2026-03-10T06:31:00.000Z",
    "user": {
      "id": 1,
      "email": "user@example.com"
    }
  }
}
```

**Error Responses:**
| Status | Condition | Message |
|---|---|---|
| `401 Unauthorized` | Missing or invalid JWT | `No token provided` / `Invalid or expired token` |
| `404 Not Found` | Payment ID does not exist | `Payment #1 not found` |
| `500 Internal Server Error` | DB failure | `Failed to retrieve payment.` |

**cURL:**
```bash
curl -X GET http://localhost:3000/api/payments/1 \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

## Webhook API

> ⚠️ Webhook endpoints are called **by Stripe**, not by the frontend. They do not require a JWT token. Instead they verify the `stripe-signature` header using the `STRIPE_WEBHOOK_SECRET`.

### 5. Stripe Webhook

**`POST /api/webhook`**

Receives Stripe events and updates the payment status in the database accordingly. Stripe sends this request automatically after a checkout session completes, fails, or expires.

**Headers (sent by Stripe automatically):**
```
stripe-signature: t=...,v1=...
Content-Type: application/json
```

**How it works:**
1. Receives the raw request body (preserved as `Buffer` via `express.raw`).
2. Verifies the `stripe-signature` header using `STRIPE_WEBHOOK_SECRET` to confirm the request is genuine.
3. Processes the event type and updates the payment status in the database.

**Handled Stripe Events:**

| Event | Trigger | Status set in DB |
|---|---|---|
| `checkout.session.completed` | User successfully completed checkout (card payments) | `COMPLETED` |
| `checkout.session.async_payment_succeeded` | Async payment method (e.g. bank transfer) succeeded | `COMPLETED` |
| `checkout.session.async_payment_failed` | Async payment method failed | `FAILED` |
| `payment_intent.payment_failed` | Card was declined at checkout | `FAILED` |
| `checkout.session.expired` | Checkout session timed out without payment | `FAILED` |

**Success Response — `200 OK`:**
```json
{
  "received": true
}
```

**Error Responses:**
| Status | Condition | Message |
|---|---|---|
| `400 Bad Request` | Invalid or missing Stripe signature | `Webhook signature verification failed: ...` |
| `500 Internal Server Error` | DB update failure | `Failed to process webhook event.` |

---

## Pages

### Success Page
**`GET /api/success`**

Serves the `success.html` page. Stripe redirects here after a successful payment.

### Fail Page
**`GET /api/fail`**

Serves the `fail.html` page. Stripe redirects here when a user cancels the checkout.

---

## Payment Status Flow

```
POST /api/payments/create-intent
        │
        ▼
   status: PENDING  (saved in DB immediately)
        │
        ▼
   User opens Stripe Checkout URL
        │
   ┌────┴────────────────┐
   │                     │
   ▼                     ▼
Card accepted         Card declined / expired
   │                     │
   ▼                     ▼
Webhook fires         Webhook fires
checkout.session      payment_intent.payment_failed
   .completed         checkout.session.expired
   │                     │
   ▼                     ▼
status: COMPLETED    status: FAILED
```

---

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `PORT` | Server port | `3000` |
| `JWT_SECRET` | Secret key for signing JWT tokens | `my-secret-key` |
| `NODE_ENV` | Environment | `development` |
| `APP_URL` | Public base URL (used for Stripe redirect URLs) | `https://xxxx.ngrok-free.app` |
| `STRIPE_SECRET_KEY` | Stripe secret API key | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret from `stripe listen` | `whsec_...` |

---

## Local Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env   # fill in the values

# 3. Run database migrations
npx prisma migrate dev

# 4. Start the server
npm run dev

# 5. In a separate terminal — forward Stripe webhooks to localhost
stripe listen --forward-to localhost:3000/api/webhook \
  --events checkout.session.completed,checkout.session.async_payment_failed,payment_intent.payment_failed,checkout.session.expired

# Copy the whsec_... secret printed above into .env as STRIPE_WEBHOOK_SECRET, then restart the server
```

---

## Test Cards (Stripe Test Mode)

| Card Number | Result |
|---|---|
| `4242 4242 4242 4242` | ✅ Payment succeeds |
| `4000 0000 0000 0002` | ❌ Card declined (generic) |
| `4000 0000 0000 9995` | ❌ Insufficient funds |
| `4000 0000 0000 0069` | ❌ Expired card |
| `4000 0000 0000 0127` | ❌ Incorrect CVC |

Use any future expiry date (e.g. `12/29`) and any 3-digit CVC.
