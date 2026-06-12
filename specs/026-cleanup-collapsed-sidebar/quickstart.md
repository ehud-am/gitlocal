# Quickstart: Clean Up Collapsed Sidebar

## Implementation Checklist

1. Open the current feature plan: `specs/026-cleanup-collapsed-sidebar/plan.md`.
2. Update the main repository viewer collapsed rail so it renders only the expand/open navigation control.
3. Leave expanded sidebar behavior and existing search/repository actions available from their normal locations.
4. Update viewer tests that currently expect collapsed shortcut buttons.
5. Add or adjust assertions that the collapsed rail has exactly one button and no former shortcut controls.
6. Verify keyboard/a11y expectations for the expand/open navigation control.

## Suggested Verification

Run focused UI tests:

```sh
npm --prefix ui test -- App.test.tsx App.logic.test.tsx PickerPage.test.tsx
```

Run broader validation before merge:

```sh
npm run verify
```

Manual QA pass:

1. Start GitLocal locally.
2. Open a repository with files and changed-file state if available.
3. Collapse the left side panel.
4. Confirm the collapsed rail shows only one expand/open control.
5. Confirm no one-letter shortcut buttons appear.
6. Reopen the left side panel.
7. Confirm repository browsing and search remain reachable.
8. Repeat at a narrow desktop width.
