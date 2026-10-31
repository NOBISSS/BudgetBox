# Deploy the BudgetBox frontend to Vercel

## Project configuration

Import the GitHub repository into Vercel and configure the project as follows:

| Vercel setting   | Value           |
| ---------------- | --------------- |
| Framework preset | Vite            |
| Root directory   | `frontend`      |
| Install command  | `npm ci`        |
| Build command    | `npm run build` |
| Output directory | `dist`          |

The Vercel rewrite in `frontend/vercel.json` serves the React app shell for client-side routes such as `/login` and `/dashboard`. The service worker is built with the app and caches the static shell and hashed frontend assets. API requests are never cached by the service worker.

## Environment variables

Add these variables in the Vercel project settings. Vite embeds `VITE_*` values into the build, so redeploy after changing them.

| Variable                | Value                                                                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_URL`          | The public HTTPS backend API base, including `/api`, for example `https://api.example.com/api`                                    |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Web client ID; never place the client secret in the frontend                                                         |
| `VITE_SITE_URL`         | The production site origin, for example `https://budgetbox.vercel.app` or your custom domain; no path or trailing slash is needed |

If `VITE_SITE_URL` is omitted and Vercel does not expose `VERCEL_PROJECT_PRODUCTION_URL` to the build, the generated metadata will use `noindex` and `robots.txt` will disallow crawling. This is a safe default for preview deployments. Set the production URL and redeploy to publish canonical tags, an indexable robots file, and a sitemap for the landing page.

## Backend and Google OAuth configuration

The frontend project does not host the Express backend, MongoDB, or Redis. Deploy those services separately and expose the backend through HTTPS. Set the backend's `FRONTEND_URL` to the exact production frontend origin so CORS accepts browser requests. Configure the same origin as an authorized JavaScript origin in the Google OAuth Web client. Keep `GOOGLE_CLIENT_SECRET`, database URLs, SMTP credentials, and JWT secrets in the backend environment only.

## Post-deployment checks

1. Open `/`, `/login`, and a nested route directly in a new tab; each should load the SPA without a Vercel 404.
2. Check `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, `/favicon.svg`, and `/og-image.svg` on the deployed domain.
3. Confirm the canonical and Open Graph URLs use the production domain by viewing the page source.
4. In browser DevTools, inspect **Application → Service Workers** and verify `/sw.js` is active. Load the app once online, switch DevTools to offline, then reload and confirm the app shell opens and cached local budgets remain available.
5. Verify the frontend's API requests target the HTTPS backend and the backend CORS configuration allows the frontend origin.
6. Test registration, password login, Google sign-in, password reset, and sync against the deployed backend before sharing the production URL.

## Deployment limits to account for

BudgetBox can cache its frontend app shell and local budget data after a successful online load. First-time authentication and any server sync still require network access. Google-only users need internet to authenticate again after logout. The frontend deploy can succeed while account and sync features remain unavailable if `VITE_API_URL` does not point to a reachable backend.
