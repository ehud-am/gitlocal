# Quickstart: Shadcn GitHub-Style Browser Refresh

## Prerequisites

- Install dependencies with `npm ci` and `npm --prefix ui ci`.
- Start the UI and server locally with `npm run dev:ui` and `npm run dev:server`.
- Prepare the following validation workspaces:
  - A git repository with local user config, at least one remote, and multiple nested folders with a README at the root and in a subfolder.
  - The same repository with at least one additional local branch and one remote-tracking branch that is not yet checked out locally.
  - Dirty working-tree states for that repository:
    - tracked edits and/or staged changes;
    - an untracked file that would block a checkout.
  - A plain filesystem folder that is not yet a git repository for setup-modal validation.
  - A clone source. Prefer both a local bare repository or local path and a remote Git URL so the local-only and remote-git paths can both be validated.

## Validation Flow

1. Launch GitLocal and open the prepared repository.
2. Confirm the app loads in the GitHub-like light theme and that the theme toggle can switch the whole UI into dark mode without layout regressions.
3. Open a file and confirm the right-panel header shows the last path segment as the title and the full repository-relative path as secondary text.
4. In the same header, verify git-repository indication, resolved user name/email, selected remote name, converted remote web link when possible, and the current branch selector.
5. Open a folder view and confirm a `..` row appears whenever a parent folder exists within the current browse context.
6. Open a git-backed folder that has both child entries and a README, then confirm the file/folder list renders before the README preview.
7. Switch to another clean local branch and confirm the server checks out the branch locally and refreshes the tree/content state.
8. Switch to a remote-tracking branch that does not yet have a local checkout and confirm GitLocal creates or checks out the local tracking branch.
9. Make tracked working-tree edits, switch branches, choose the commit path, supply or edit the commit message, and confirm all changes are staged, committed, and followed by the branch switch.
10. Repeat with tracked changes and choose the discard path, confirming the tracked changes are removed only after explicit confirmation.
11. Repeat with an untracked blocker and confirm GitLocal requires a second, more explicit confirmation before removing untracked files.
12. Open the setup modal by launching without a repository or by moving to the parent-folder chooser from an open repository.
13. Use the setup modal to create a child folder beneath the selected location and confirm the list refreshes.
14. Use the setup modal to initialize a regular non-git folder with `git init`, then open it in GitLocal.
15. Use the setup modal to clone into a child folder, then open the cloned repository in GitLocal.
16. Validate that setup failures such as invalid clone URLs, conflicting child folder names, or non-empty clone targets keep the modal open with actionable errors.

## Automated Checks

- Run `npm test`.
- Run `npm run lint`.
- Run `npm run build`.

## Validation Notes

- Automated implementation verification was not executed during this planning-only session.
- Manual validation should still cover a local bare-repo clone source first, because that proves the setup flow remains fully functional without network.
- An additional manual pass should validate SSH-to-HTTPS remote-link conversion and remote-clone error handling with a real remote URL.
