# Release Review: Share and Copy Regression Patch

## Scope

- Copy as an icon-and-label button for supported text views.
- Focused share/export actions with Email, Slack, and visible Print removed.
- Save PDF rendered-output flow.
- Git folder recognition regression diagnosis and fix.
- Find in File, Refresh, and Light/Dark Theme icon polish.

## Git Folder Recognition Diagnosis

The regression risk is path canonicalization drift between the path a user opens and the repository root that GitLocal later reports through `/api/info`. If a repository is opened through an alias such as a symlink, the UI can persist one path while the server reports the canonical git root, which makes the app appear to have opened a different folder and can disable repository-aware state during refresh.

Implemented fix:

- `src/server.ts` now stores `classification.repositoryRootPath` when startup classification identifies a repository root.
- `src/handlers/repo.ts` now returns and stores the canonical `repositoryRootPath` for repository-root opens.
- Regression tests cover symlinked repository roots through startup/info and `/api/repo/open`.

## Manual Quickstart Results

- Automated UI action coverage passed for Copy, Share, Save PDF, removed Email/Slack/Print actions, and toolbar icon behavior.
- Automated server coverage passed for repository classification/opening, including symlinked repository roots, startup detection, nested folders, files inside repositories, and non-git folders.
- Full `npm test` passed with coverage.
- Full `npm run lint` passed.
- Full `npm run build` passed.
- Browser-plugin visual/manual validation was not available in this session, so Save PDF was validated through component tests that assert printable document creation and through production build validation.

## Contrarian QA

- Checked for lingering visible Email, Slack, and Print actions in the content-panel action surface; only negative assertions and unrelated git identity email fields remain.
- Found and fixed a Save PDF issue where `window.open` used `noopener,noreferrer` while the code needed to write the generated printable document.
- Re-ran affected Markdown share tests after the fix.
- Re-ran full test, lint, and build validation after the fix.
