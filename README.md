# BudgetBox

BudgetBox is an offline-first personal budgeting application. The React frontend lives in [`frontend/`](./frontend/) and the Node API is in [`backend/`](./backend/).

See [the frontend audit](./docs/FRONTEND_AUDIT.md) and [phase progress](./docs/PROGRESS.md) for the current implementation status.

## Rate limiting

The API applies Redis token buckets through `rate-limiter-flexible`. Keys use the `budgetbox:rate:<policy>:` namespace; email and email/IP identity portions are SHA-256 hashes. Policies are 200 requests/minute per IP globally, 10 registrations/hour per IP, 3 password-reset requests/hour per IP and per email, 5 failed logins/15 minutes per email and IP, and 30 sync requests/minute per user. Login attempts are counted only after invalid credentials; the next attempt is blocked. A `RateLimiterMemory` insurance limiter handles requests while Redis is unavailable, with a warning in the server log. Rate-limited responses include `Retry-After`, `RateLimit-Limit`, `RateLimit-Remaining`, and `retryAfterSeconds`.

## Email and Google sign-in configuration

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` in `backend/.env` to send welcome and password-reset emails. In development, if SMTP is left blank, the API logs the welcome email preview and a usable password-reset link to the backend console. In production, SMTP must be configured. Reset links are single-use and expire after 15 minutes; the forgot-password endpoint always returns the same response whether or not the address has an account.

For Gmail, `SMTP_HOST` is `smtp.gmail.com` and port `587` uses STARTTLS. Use the full Gmail address for `SMTP_USER`, a Google App Password for `SMTP_PASS` (requires 2-Step Verification), and the same address as `SMTP_FROM` unless you have configured a permitted send-as alias. Do not use the email address itself as `SMTP_HOST` or use your normal Google account password. For port and TLS behavior, see the [Nodemailer SMTP settings](https://nodemailer.com/smtp) and [Google App Password guidance](https://support.google.com/accounts/answer/185833).

For Google sign-in, create a Web application OAuth client. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `backend/.env`; set the same client ID as `VITE_GOOGLE_CLIENT_ID` in `frontend/.env`. Add the frontend origin (for local development, `http://localhost:5173`) to the OAuth client's authorized JavaScript origins. Keep the client secret only in the backend environment; never add it to a `VITE_` variable. Restart both dev servers after changing environment files.

The frontend obtains a short-lived authorization code from Google in a popup and sends it to `POST /api/auth/google`. The backend exchanges the code using the client secret, verifies the Google profile and verified email, links or creates the BudgetBox account, and returns the normal BudgetBox session token.

## Start the local services

The backend's default MongoDB and Redis URLs expect local services on ports 27017 and 6379. Start them from the repository root with `docker compose up -d`, then start the backend and frontend in separate terminals. Stop the containers with `docker compose down`; keep the named database volumes so local data persists.

## Unlock saved budgets offline

After a password account signs in successfully on a device, BudgetBox stores a salted PBKDF2 password verifier and the cached profile in that browser's IndexedDB. If the user logs out and later has no internet, they can enter the same email and password on the login page to unlock that device's saved budgets. This unlock is local only: edits remain on that device until the user reconnects and signs in online to get a server session and sync. Google-only accounts still need internet to authenticate after logout because BudgetBox has no password to verify locally. Clearing local data also removes the offline unlock verifier. Password login or registration must complete online once after this feature is installed to enable offline unlock on that device.

## Deploy the frontend on Vercel

The Vite frontend is configured for Vercel with SPA deep-link rewrites, security headers, an offline app-shell service worker, and build-generated Open Graph metadata, `robots.txt`, and `sitemap.xml`. In Vercel, set the project root directory to `frontend` and configure the production API URL, Google client ID, and `VITE_SITE_URL`. See [the Vercel deployment guide](./frontend/VERCEL_DEPLOYMENT.md) for setup and post-deployment checks. The Express backend must be hosted separately and allow the deployed frontend origin through `FRONTEND_URL` and CORS.

## Recurring payments and month-end estimates

Monthly category values represent amounts recorded as spent so far. To record a fixed payment, enter it under bills or subscriptions and mark its scheduled occurrence as paid in the monthly budget's **Recurring payments** panel. Schedules support daily, weekly, monthly, quarterly, yearly, and one-time dates. A schedule is saved to the signed-in user's IndexedDB first, then synced through the authenticated recurring sync endpoints; the server keeps the latest `updatedAt` value per schedule. A due day of 29–31 is clamped to the last day of shorter months. Quarterly and yearly schedules use actual cash-flow dates and are included only in months with an occurrence.

The dashboard and Insights estimate month-end spending as fixed bills/subscriptions already recorded, plus unpaid scheduled occurrences, plus the daily run rate of food, transport, and other variable spending. Paid recurring occurrences outside bills/subscriptions are removed from the variable run rate so they are not extrapolated a second time. This is an estimate from the monthly amounts the user records, not a transaction ledger; BudgetBox does not currently store individual non-recurring purchases or automatically mark a recurring payment paid based on a bank feed.

See [the API notes](./docs/API.md) for the recurring sync request and response formats.
