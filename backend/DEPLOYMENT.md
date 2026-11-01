# Deploying the BudgetBox API

The backend can run as a Node 20 service or as the included non-root Docker image. MongoDB and Redis are external production dependencies; the application image does not bundle databases. This guide configures the API for the Vercel frontend.

## Production environment

Set these values in the hosting provider's secret/environment settings. Do not commit a production `.env` file.

| Variable | Production value |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | Use the provider-assigned port; the image defaults to `5000` |
| `MONGODB_URI` | Reachable MongoDB URI. Use a managed cluster or private network address, never localhost |
| `REDIS_URL` | Reachable Redis URI. Prefer `rediss://` for managed/public endpoints |
| `JWT_SECRET` | Unique random secret of at least 32 characters; generate with `openssl rand -base64 48` |
| `JWT_EXPIRES_IN` | Token lifetime such as `1d` or `12h` |
| `BCRYPT_COST` | `12` by default; use `10`–`14` after checking host CPU latency |
| `FRONTEND_URL` | Exact HTTPS production origin, e.g. `https://budgetbox.vercel.app`, without a path or trailing slash |
| `TRUST_PROXY` | `true` when exactly one trusted proxy/load balancer sits in front of Express; otherwise `false` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Required together in production for welcome and reset emails |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional; set both to enable Google sign-in |
| `DEMO_EMAIL`, `DEMO_PASSWORD` | Optional seed-only credentials; production seed requires an explicit email and a unique password of at least 12 characters |

The process validates these settings before starting. Production startup rejects a short or example JWT secret, localhost frontend/database/cache URLs, non-HTTPS frontend origins, incomplete SMTP configuration, and malformed connection URLs. CORS allows only the exact `FRONTEND_URL`; Vercel preview domains require a deliberate separate allowlist change.

On Vercel, set `VITE_API_URL` to `https://<your-api-host>/api` and `VITE_GOOGLE_CLIENT_ID` if Google sign-in is enabled, then redeploy the frontend. Add the production frontend origin to the Google OAuth Web client as an authorized JavaScript origin. Keep the Google client secret only on the backend.

## Build and run with Docker

From the repository root:

```sh
docker build -f backend/Dockerfile -t budgetbox-api:latest ./backend
docker run --name budgetbox-api --restart unless-stopped --env-file backend/.env.production -p 127.0.0.1:5000:5000 budgetbox-api:latest
```

Create `backend/.env.production` on the server (or inject values through a secrets manager); it is ignored by Git and excluded from the Docker build context. The image uses Node 20 Alpine, installs production dependencies only in the runtime layer, runs as the unprivileged `node` account, and checks `/api/health` every 30 seconds. The application handles `SIGTERM` and `SIGINT`, stops accepting new HTTP requests, drains existing connections, and closes MongoDB and Redis before exiting.

If your host assigns `PORT`, pass that value through and publish the same port. The health check returns 200 only when both MongoDB and Redis are ready. Do not expose port 5000 publicly; terminate TLS at the platform proxy or a reverse proxy.

## AWS EC2 checklist

1. Use a supported Linux AMI, install Docker, and run the container under the `node` user inside the image. Use AWS Systems Manager Parameter Store or Secrets Manager to supply runtime secrets.
2. Configure the EC2 security group to accept public traffic only on 80/443 (or only from an Application Load Balancer). Keep API port 5000 private/loopback.
3. Put an ALB or a maintained reverse proxy with an HTTPS certificate in front of the container. Set `TRUST_PROXY=true` only when the Express app receives traffic through one trusted proxy hop; do not let arbitrary clients reach the container directly when this is enabled.
4. Use MongoDB Atlas or a private MongoDB service and a managed Redis endpoint. Restrict database network rules to the EC2 egress address/private network. Prefer TLS for Redis and require TLS for public database endpoints.
5. Enable automatic container restart, provider health checks against `/api/health`, centralized logs/alarms, and automated MongoDB backups. Test a restore procedure before production data is important.
6. Set the Vercel production origin in `FRONTEND_URL`, set the API's HTTPS URL in Vercel `VITE_API_URL`, and test health, register/login, email reset, Google sign-in (if configured), budget sync, recurring sync, and rate-limit responses.

The Docker build can be run locally with `docker build -f backend/Dockerfile -t budgetbox-api:local ./backend`. To seed a local development database, run `npm run seed` from `backend/`; it creates the default demo account and three recent sample months without overwriting existing month records. In a production image, seed explicitly only when required with `npm run seed:prod` after supplying production-only `DEMO_EMAIL` and `DEMO_PASSWORD`; it does not run during normal startup.

## Operational notes

- `/api/health` is a readiness check and returns 503 when either required dependency is down. Redis outages also affect sessions, password reset, and rate limiting, even though the rate limiter has an in-memory fallback.
- The API uses structured Pino logs and redacts authorization, password, password-hash, and SMTP password fields. Forward logs to the host's protected log service and apply retention.
- Configure the proxy for HTTPS, request size limits and timeouts; Express accepts JSON bodies up to 100 KB and sets request/header timeouts.
- Keep the database and Redis private. Apply least-privilege database users and regular credential rotation. Production deployments need monitoring and backups configured in their chosen provider; the application cannot create those cloud resources for you.
- The project does not include an automated schema migration framework. Deploy compatible code and database changes together; MongoDB model indexes are created by Mongoose at startup.
