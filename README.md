# 📧 ReachInbox Email Job Scheduler

A production-grade email scheduler service + dashboard built as a full-stack application. Accepts email send requests via APIs, schedules them using BullMQ delayed jobs (no cron), sends emails via Ethereal SMTP, and exposes a React-based frontend dashboard.

---

## 🏗 Architecture Overview

### How Scheduling Works
1. User composes an email campaign via the frontend (subject, body, CSV of recipients, sender, start time, delay, hourly limit)
2. Frontend sends a `POST /api/emails/schedule` request to the backend
3. Backend creates email records in PostgreSQL with `status: 'scheduled'`
4. For each email, a **BullMQ delayed job** is added to Redis with `delay = scheduledAt - now`
5. Each email is indexed in **Elasticsearch** for full-text search
6. When a job's delay expires, the **BullMQ Worker** picks it up and:
   - Checks idempotency (won't re-send if `status === 'sent'`)
   - Checks global + per-sender rate limits via **Redis atomic counters**
   - If rate limited → reschedules the job to the next hour window (does NOT drop it)
   - If rate limited → sends a **Slack notification** via the user's connected webhook (if connected)
   - If allowed → sends the email via **Ethereal SMTP** (Nodemailer)
   - Updates the DB record and Elasticsearch index

### How Persistence on Restart Works
- **BullMQ jobs are stored in Redis** with `appendonly` enabled. They survive Redis restarts.
- **On server startup**, a recovery sweep runs:
  1. Finds all emails with `status IN ('scheduled', 'queued')` and `scheduledAt > now`
  2. Checks if each email's BullMQ job still exists in Redis
  3. If a job is missing (e.g., Redis was flushed), it re-creates the delayed job
- **Idempotency guarantee**: Even if a job fires twice, the worker checks `status === 'sent'` before sending. The `idempotencyKey` (hash of senderId + recipient + subject + scheduledAt) prevents duplicate DB records.

### How Rate Limiting & Concurrency Work

#### Worker Concurrency
- Configured via `WORKER_CONCURRENCY` env variable (default: 5)
- Multiple jobs run in parallel; each job independently checks rate limits via atomic Redis operations

#### Delay Between Emails
- Minimum 2 seconds between individual sends (configurable via `MIN_DELAY_BETWEEN_EMAILS_MS`)
- Enforced by staggering `scheduledAt` times when creating the batch (recipient[0] at startTime, recipient[1] at startTime + delay, etc.)
- Additionally enforced by BullMQ's built-in `limiter` option

#### Hourly Rate Limiting
- **Global limit**: BullMQ worker `limiter: { max: MAX_EMAILS_PER_HOUR, duration: 3600000 }`
- **Per-sender limit**: Redis counter keys `ratelimit:sender:{senderId}:{hourWindow}` with 1-hour TTL
  - Uses `INCR` (atomic, safe across multiple workers/instances)
  - If limit exceeded, decrements the counter (didn't actually send) and reschedules the job to the next hour window
  - No emails are dropped — they are delayed while preserving order

#### Slack Notification on Rate Limit
- User clicks "Connect Slack" → real OAuth 2.0 flow → backend stores access token + incoming webhook URL
- When a sender's hourly limit is reached, the worker sends a real Slack message via the webhook
- If Slack is not connected, rate limit hits are silently handled (no crash)
- If user disconnects then reconnects Slack, notifications resume without redeployment

#### Behavior Under Load (1000+ emails at same time)
- Emails are staggered by `delayBetweenEmails` seconds, so 1000 emails with 2s delay = ~33 minutes of spread
- The rate limiter caps sends at `MAX_EMAILS_PER_HOUR` globally and `MAX_EMAILS_PER_HOUR_PER_SENDER` per sender
- Excess emails are rescheduled to the next hour window, not dropped
- BullMQ's concurrency setting controls how many emails process simultaneously

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend Framework | Express.js (TypeScript) |
| Queue | BullMQ (backed by Redis) |
| Database | PostgreSQL (via Sequelize ORM) |
| Search | Elasticsearch 8 |
| SMTP | Ethereal Email (Nodemailer) |
| Auth | Google OAuth 2.0 (Passport.js) + JWT |
| Notifications | Slack OAuth 2.0 + Incoming Webhooks |
| Frontend | React + Vite (TypeScript) |
| CSS | Tailwind CSS |
| Queue Dashboard | @bull-board/express |

---

## 📦 How to Run

### Prerequisites
- Node.js 18+
- Docker & Docker Compose (for Redis, PostgreSQL, Elasticsearch)
- Google OAuth 2.0 credentials (from Google Cloud Console)
- Slack App credentials (for Slack notifications)

### 1. Clone & Install
```bash
git clone <repo-url>
cd task-scheduler

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Start Infrastructure (Docker)
```bash
# From the root directory
docker-compose up -d
```
This starts:
- PostgreSQL on port 5432
- Redis on port 6379
- Elasticsearch on port 9200

### 3. Configure Environment Variables
```bash
# Copy the template
cp backend/.env.example backend/.env
```

Edit `backend/.env` and fill in:

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `JWT_SECRET` | Any random secret string for JWT signing |
| `SLACK_CLIENT_ID` | Slack app client ID (for notifications) |
| `SLACK_CLIENT_SECRET` | Slack app client secret |

#### Setting Up Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → APIs & Services → Credentials → Create OAuth client ID
3. Set authorized redirect URI: `http://localhost:3001/api/auth/google/callback`
4. Copy Client ID and Client Secret to `.env`

#### Setting Up Ethereal Email
Ethereal accounts are auto-generated via the "New" button in the Compose modal. No manual setup needed.

#### Setting Up Slack App (for rate limit notifications)
1. Go to [Slack API](https://api.slack.com/apps) → Create New App
2. Add scopes: `incoming-webhook`, `chat:write`
3. Set redirect URL: `http://localhost:3001/api/slack/callback`
4. Copy Client ID and Client Secret to `.env`

### 4. Run Backend
```bash
cd backend
npm run dev
```
Server starts at `http://localhost:3001`
BullMQ Dashboard at `http://localhost:3001/admin/queues`

### 5. Run Frontend
```bash
cd frontend
npm run dev
```
Frontend starts at `http://localhost:5173`

---

## ✅ Features Implemented

### Backend
| Feature | Status |
|---------|--------|
| Email scheduling API | ✅ |
| BullMQ delayed jobs (no cron) | ✅ |
| PostgreSQL persistence (Sequelize) | ✅ |
| Elasticsearch indexing & search | ✅ |
| Ethereal SMTP sending (multiple senders) | ✅ |
| Worker concurrency (configurable) | ✅ |
| Min delay between emails (configurable) | ✅ |
| Global rate limiting (BullMQ limiter) | ✅ |
| Per-sender rate limiting (Redis counters) | ✅ |
| Rate-limited jobs rescheduled (not dropped) | ✅ |
| Slack OAuth for rate limit notifications | ✅ |
| Persistence on server restart | ✅ |
| Idempotency (no duplicate sends) | ✅ |
| BullMQ dashboard (Bull Board) | ✅ |
| Google OAuth 2.0 login | ✅ |
| Recovery sweep on startup | ✅ |

### Frontend
| Feature | Status |
|---------|--------|
| Google OAuth login (real) | ✅ |
| User info in header (name, email, avatar) | ✅ |
| Logout | ✅ |
| Dashboard with Scheduled/Sent tabs | ✅ |
| Compose New Email modal | ✅ |
| CSV/text file upload (email parsing) | ✅ |
| Sender selection & auto-generate | ✅ |
| Scheduling options (start time, delay, limit) | ✅ |
| Scheduled emails table | ✅ |
| Sent emails table | ✅ |
| Loading states (skeleton) | ✅ |
| Empty states | ✅ |
| Error handling (toasts) | ✅ |
| Search via Elasticsearch | ✅ |
| Connect Slack button | ✅ |
| Auto-refresh (10s interval) | ✅ |
| TypeScript throughout | ✅ |
| Tailwind CSS styling | ✅ |
| Clean folder structure | ✅ |
| Reusable UI components | ✅ |

---

## 🏛 Project Structure

```
task-scheduler/
├── backend/
│   ├── src/
│   │   ├── config/          # DB, Redis, Elasticsearch, env config
│   │   ├── models/          # Sequelize models (User, Email, Sender, SlackIntegration)
│   │   ├── queues/          # BullMQ queue & worker
│   │   ├── services/        # Business logic (email, SMTP, rate limit, Slack, ES)
│   │   ├── routes/          # Express API routes
│   │   ├── middleware/      # Auth & error handling
│   │   ├── utils/           # Idempotency & helpers
│   │   └── index.ts         # Server entry point
│   ├── docker-compose.yml
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI (Button, Input, Modal, Badge, etc.)
│   │   ├── pages/           # LoginPage, DashboardPage, CallbackPage
│   │   ├── context/         # AuthContext
│   │   ├── services/        # API client (axios)
│   │   ├── types/           # TypeScript interfaces
│   │   └── App.tsx          # Main app with routing
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## 📝 API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/google` | Initiate Google OAuth |
| GET | `/api/auth/google/callback` | Google OAuth callback |
| GET | `/api/auth/me` | Get current user (requires auth) |
| POST | `/api/auth/logout` | Logout |

### Emails
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/emails/schedule` | Schedule email batch |
| GET | `/api/emails/scheduled` | List scheduled emails |
| GET | `/api/emails/sent` | List sent emails |
| GET | `/api/emails/search` | Search via Elasticsearch |
| GET | `/api/emails/:id` | Get email details |

### Senders
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/senders` | Create sender |
| POST | `/api/senders/generate` | Auto-generate Ethereal sender |
| GET | `/api/senders` | List senders |
| DELETE | `/api/senders/:id` | Delete sender |

### Slack
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/slack/connect` | Get Slack OAuth URL |
| GET | `/api/slack/callback` | Slack OAuth callback |
| GET | `/api/slack/status` | Check Slack connection |
| POST | `/api/slack/disconnect` | Disconnect Slack |

### Dashboard
| Path | Description |
|------|-------------|
| `/admin/queues` | BullMQ Bull Board dashboard |

---

## ❌ Hard Constraints Compliance

| Constraint | Compliance |
|------------|-----------|
| No cron jobs | ✅ Uses BullMQ delayed jobs only |
| No node-cron/agenda | ✅ Not used |
| Persistent after restart | ✅ Redis persistence + DB recovery sweep |
| No duplicate sends | ✅ Idempotency key + status check |
| All values configurable | ✅ Via .env (no hardcoding) |

---

## 📌 Assumptions & Trade-offs

1. **Ethereal Email** is used for SMTP (as required). Emails can be viewed at https://ethereal.email using the generated account credentials.
2. **Delay between sends**: Set to 2 seconds by default (configurable). Enforced via staggered `scheduledAt` times and BullMQ limiter.
3. **Rate limit rescheduling**: When the hourly limit is hit, jobs are pushed to the start of the next hour window. This preserves approximate order but may cause minor reordering under heavy load.
4. **Elasticsearch**: Used for full-text search across emails. If Elasticsearch is unavailable, the system continues to function (search returns empty results).
5. **Multiple senders**: Users create Ethereal accounts via the UI. Each sender has independent rate limit counters.