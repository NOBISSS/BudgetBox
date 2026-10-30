# Blockers

## Phase 0 — moving the frontend

`git mv src frontend/src` failed twice with `fatal: renaming 'src' failed: Permission denied`. The second attempt used the explicitly approved Git write escalation and failed the same way. The directory is present and its ACL shows Modify access for the execution identity, but Git still cannot rename it. Per the project instructions, work stopped here rather than attempting an alternate move strategy.

The frontend audit and root housekeeping are recorded on `chore/monorepo-setup`. The frontend has not been moved, `npm install`/`npm run build` under `/frontend` have not been run, and Phase 0 remains incomplete. Phases 1–8 have not started.
