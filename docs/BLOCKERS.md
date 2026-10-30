# Blockers

## Phase 0 — moving the frontend (resolved)

`git mv src frontend/src` failed twice with `fatal: renaming 'src' failed: Permission denied`. On the resumed request, moving one tracked file with `git mv` succeeded, so all tracked frontend files were moved individually with `git mv` into `frontend/`.

`npm install` and `npm run build` both passed under `/frontend`. Phase 0 is complete. Phases 1–8 have not started yet.
