# BudgetBox

BudgetBox is an offline-first personal budgeting application. The React frontend lives in [`frontend/`](./frontend/) and the Node API is in [`backend/`](./backend/).

See [the frontend audit](./docs/FRONTEND_AUDIT.md) and [phase progress](./docs/PROGRESS.md) for the current implementation status.

## Rate limiting

The API applies Redis token buckets through `rate-limiter-flexible`. Keys use the `budgetbox:rate:<policy>:` namespace; email and email/IP identity portions are SHA-256 hashes. Policies are 200 requests/minute per IP globally, 10 registrations/hour per IP, 3 password-reset requests/hour per IP and per email, 5 failed logins/15 minutes per email and IP, and 30 sync requests/minute per user. Login attempts are counted only after invalid credentials; the next attempt is blocked. A `RateLimiterMemory` insurance limiter handles requests while Redis is unavailable, with a warning in the server log. Rate-limited responses include `Retry-After`, `RateLimit-Limit`, `RateLimit-Remaining`, and `retryAfterSeconds`.

## Email and Google sign-in configuration

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` in `backend/.env` to send welcome and password-reset emails. In development, if SMTP is left blank, the API logs the welcome email preview and a usable password-reset link to the backend console. In production, SMTP must be configured. Reset links are single-use and expire after 15 minutes; the forgot-password endpoint always returns the same response whether or not the address has an account.

For Google sign-in, create a Web application OAuth client. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `backend/.env`; set the same client ID as `VITE_GOOGLE_CLIENT_ID` in `frontend/.env`. Add the frontend origin (for local development, `http://localhost:5173`) to the OAuth client's authorized JavaScript origins. Keep the client secret only in the backend environment; never add it to a `VITE_` variable. Restart both dev servers after changing environment files.

The frontend obtains a short-lived authorization code from Google in a popup and sends it to `POST /api/auth/google`. The backend exchanges the code using the client secret, verifies the Google profile and verified email, links or creates the BudgetBox account, and returns the normal BudgetBox session token.
