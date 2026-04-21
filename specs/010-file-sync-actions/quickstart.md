# Quickstart: File Sync Indicators and Commit/Remote Actions

## Setup

1. Prepare a repository with a configured upstream branch.
2. Ensure at least three files exist:
   - one to modify locally without committing;
   - one to change and commit locally without pushing;
   - one to change from another clone and fetch so the local repo becomes behind.
3. Open the repository in GitLocal on the current working branch.

## Validation Flow

1. Verify the file tree and folder list mark the locally modified file as a local uncommitted change.
2. Commit one different file locally without pushing and verify GitLocal marks it as a local committed change.
3. Create and fetch an upstream-only change for another file and verify GitLocal marks it as a remote committed change.
4. If possible, create both a local-only and upstream-only change for the same file and verify GitLocal shows a diverged indicator.
5. Use the repository header commit action to commit the remaining local changes and confirm the commit succeeds with the supplied message.
6. Use the repository header sync action while the branch is ahead only and confirm GitLocal pushes successfully.
7. Make the branch behind only, use sync again, and confirm GitLocal fast-forward pulls successfully.
8. Make the branch dirty, attempt sync, and confirm GitLocal blocks the action with a clear explanation.
9. Make the branch diverged, attempt sync, and confirm GitLocal blocks the action instead of merging automatically.
