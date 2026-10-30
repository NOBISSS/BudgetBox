# Frontend audit

Audit performed for Phase 0 before moving the root Vite project into `frontend/`.

## Pages

| Page | Present | Notes |
| --- | --- | --- |
| Landing | Yes | Marketing page at `/` |
| Login | Yes | Mock local auth service |
| Register | Yes | Mock local auth service |
| Forgot Password | Yes | UI confirmation only; no service call |
| Reset Password | Yes | UI toast only; no service call |
| Dashboard | Yes | Uses seeded Redux budget records |
| Budget Form | Yes | Debounced localForage save |
| History | Yes | Reads Redux records |
| Sync Center | Yes | Mock sync service |
| Insights | Yes | Rule-based anomaly thresholds |
| Settings | Yes | Profile/preferences/data UI |
| Change Password | Yes | UI toast only; no service call |
| 404 | Yes | Friendly fallback route |

## Services and persistence

- `features/auth/authService.ts`: `login` and `register` return mock users after a delay.
- `features/sync/syncService.ts`: simulated delay; no API request.
- `services/api.ts`: Axios instance and interceptors exist, but auth and sync do not use it.
- `features/budget/budgetDb.ts`: localForage CRUD exists. The slice seeds four mock months when the database is empty.
- `features/budget/budgetSlice.ts`: stores budget data globally without user-specific localForage namespaces.
- Forgot/reset/change password flows are not connected to an auth service.

## Build and dependency audit

- `npx tsc --noEmit`: passed with no TypeScript errors.
- `npm run build`: passed before the monorepo move.
- No `next` imports or `use client` / `use server` directives were found in `src/`.
- All external package imports found in the frontend are declared in `package.json`.
- TypeScript source contains no explicit `any` annotations.

## Dead or unused code candidates

- `components/layout/MobileNav.tsx` currently returns `null`.
- `features/auth/components/AuthNotice.tsx`, `features/dashboard/components/InsightsSummary.tsx`, `features/settings/components/PreferenceRow.tsx`, and `features/sync/components/SyncStatusCard.tsx` are not used by the current page implementation.
- `components/common/PasswordInput.tsx` and `ConfirmDialog.tsx` are not used by the current pages; equivalent inline/native controls are used instead.
- Several `components/ui/*` wrappers are a primitive library and are not currently used by screen code.
- The current build does not report unused imports because `noUnusedLocals` is disabled.

These items are audit findings, not Phase 0 changes; the visual interface is to remain unchanged while functionality is integrated.
