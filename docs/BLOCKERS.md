# Blockers

## Phase 0 - moving the frontend (resolved)

`git mv src frontend/src` failed twice with `fatal: renaming 'src' failed: Permission denied`. On the resumed request, moving one tracked file with `git mv` succeeded, so all tracked frontend files were moved individually with `git mv` into `frontend/`.

`npm install` and `npm run build` both passed under `/frontend`. Phase 0 is complete. Phases 1-6 are complete; Phase 7 is blocked as recorded below.

## Phase 7 - Backend test database binary (blocked)

`backend/npm run test` failed twice while `mongodb-memory-server` prepared MongoDB. The first attempt could not create its default binary cache directory outside the writable workspace (EPERM). A subsequent attempt could not download MongoDB 7.0.24 from `fastdl.mongodb.org` (EACCES). After network access was allowed for a retry, the download reached about 22% of the 599.7 MB binary, but the test setup exceeded Vitest's 60-second hook timeout; the API tests were skipped. The backend TypeScript build passed, and the focused frontend tests passed. Per the project blocker rule, work stops here until the MongoDB test binary is available in the cache or this environment provides a MongoDB binary. Do not treat the backend integration suite as green.
