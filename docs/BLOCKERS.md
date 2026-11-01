# Blockers

## Phase 0 - moving the frontend (resolved)

`git mv src frontend/src` failed twice with `fatal: renaming 'src' failed: Permission denied`. On the resumed request, moving one tracked file with `git mv` succeeded, so all tracked frontend files were moved individually with `git mv` into `frontend/`.

`npm install` and `npm run build` both passed under `/frontend`. Phases 0-8 are now complete. The initial Phase 7 MongoDB test binary blocker was resolved locally as detailed below.

## Phase 7 - Backend test database binary (resolved locally)

`mongodb-memory-server` initially could not create its default cache directory and its MongoDB 7.0.24 download was denied/timed out. This was worked around on the development machine by using its installed MongoDB 6.0 binary with `MONGOMS_SYSTEM_BINARY` and `MONGOMS_SYSTEM_BINARY_VERSION_CHECK=false`; all 13 backend tests passed. The standard GitHub Actions runner still uses MongoDB Memory Server's downloaded MongoDB 7 binary. Keep its binary cache available when running integration tests offline.
