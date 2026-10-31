# Blockers

## Phase 0 - moving the frontend (resolved)

`git mv src frontend/src` failed twice with `fatal: renaming 'src' failed: Permission denied`. On the resumed request, moving one tracked file with `git mv` succeeded, so all tracked frontend files were moved individually with `git mv` into `frontend/`.

`npm install` and `npm run build` both passed under `/frontend`. Phase 0 is complete. Phases 1-6 are complete; Phase 7 is blocked as recorded below.

## Phase 7 - Backend test database binary (blocked)

`backend/npm run test` failed twice while `mongodb-memory-server` prepared MongoDB. The first attempt could not create its default binary cache directory outside the writable workspace (EPERM). After configuring the cache under `backend/.cache`, the second attempt could not download MongoDB 7.0.24 from `fastdl.mongodb.org` (EACCES). The backend build passed, but the backend integration suite could not execute. Per the project blocker rule, work stops here until MongoDB binary download access is available or this environment provides a MongoDB binary.
