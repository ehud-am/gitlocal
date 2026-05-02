# Folder View Actions Contract

## Scope

This contract covers the user-visible placement and behavior of folder delete actions and left-navigation status tags. It does not change the existing recursive delete preview or typed confirmation contract.

## Main Folder Delete Action

- The delete-folder entry point appears in the main folder view action area.
- The action is positioned with existing folder/file creation actions so users can find folder-level commands in one place.
- The action uses destructive outline styling:
  - red text;
  - red border;
  - no filled red background in the normal state.
- Activating the action starts the existing delete preview and typed-name confirmation flow.
- The action is hidden or unavailable when:
  - the current view is the repository root;
  - the current view is a file;
  - the current view is not in a context where folder deletion is valid.
- The action must not bypass preview impact, exact typed-name confirmation, or stale impact validation.

## Left Navigation Delete Removal

- Folder rows in the left navigation panel no longer expose the delete-folder x icon.
- Removing the left-panel delete icon must not remove normal folder navigation behavior.
- Existing non-delete row actions may remain if they are not destructive folder deletion controls.

## Compact Status Tags

- Left navigation status tags use shorter labels where meaning remains clear.
- The local-only status label displays as `local`.
- Tag presentation is smaller than the current left-panel tag treatment.
- Tags remain readable and do not overlap item names at common sidebar widths.
- Compacting tags must preserve visible status meaning for local-only, modified, ignored, and other existing item states.

## Test Coverage Contract

- UI tests must cover:
  - no delete-folder x icon in left-panel folder rows;
  - delete-folder action visible in the main folder view for a deletable folder;
  - delete-folder action absent for repository root and file views;
  - delete-folder action starts the existing preview/confirmation flow;
  - destructive outline styling is applied to the main delete-folder action;
  - local-only tag text displays as `local`;
  - compact tags remain present and associated with the correct row status.
