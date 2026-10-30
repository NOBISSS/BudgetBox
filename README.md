# BudgetBox

BudgetBox is an offline-first personal budgeting application. The React frontend lives in [`frontend/`](./frontend/) and the Node API is in [`backend/`](./backend/).

See [the frontend audit](./docs/FRONTEND_AUDIT.md) and [phase progress](./docs/PROGRESS.md) for the current implementation status.

## Rate limiting

The API applies Redis token buckets through `rate-limiter-flexible`. Keys use the `budgetbox:rate:<policy>:` namespace; email and email/IP identity portions are SHA-256 hashes. Policies are 200 requests/minute per IP globally, 10 registrations/hour per IP, 3 password-reset requests/hour per IP and per email, 5 failed logins/15 minutes per email and IP, and 30 sync requests/minute per user. Login attempts are counted only after invalid credentials; the next attempt is blocked. A `RateLimiterMemory` insurance limiter handles requests while Redis is unavailable, with a warning in the server log. Rate-limited responses include `Retry-After`, `RateLimit-Limit`, `RateLimit-Remaining`, and `retryAfterSeconds`.
