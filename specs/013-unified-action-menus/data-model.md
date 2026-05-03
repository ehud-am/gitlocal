# Data Model: Unified Action Menus

## Action Menu

Represents the three-dots control and command list for one current target.

**Fields**

- `targetType`: `file`, `git-folder`, or `non-git-folder`
- `targetName`: Display name used in labels and delete confirmation
- `targetLocation`: Repository-relative or picker-visible containing location
- `items`: Ordered list of available menu items
- `accessibleLabel`: Label that identifies the target and purpose of the menu

**Validation Rules**

- Must not render when `items` is empty.
- Must use the same three-dots affordance across all supported target types.
- Must expose keyboard and screen-reader semantics through the shared dropdown primitive.

## Menu Item

Represents one optional command inside an action menu.

**Fields**

- `label`: Visible command text
- `intent`: `normal` or `destructive`
- `command`: Action identifier for setup, create, edit, view, navigation, or delete behavior
- `available`: Whether the command can currently run
- `disabledReason`: Optional user-facing reason when the command is visible but temporarily disabled

**Validation Rules**

- Destructive delete items must use red text.
- Non-destructive items must keep normal menu styling.
- Existing optional commands must remain reachable after being moved into menus.
- Delete folder must not be available for the repository root.

## Delete Confirmation

Represents the confirmation state for deleting a file or folder.

**Fields**

- `targetType`: `file` or `folder`
- `targetName`: Exact displayed name the user must type
- `targetLocation`: Containing location displayed for disambiguation
- `typedValue`: Current confirmation input value
- `canConfirm`: Derived boolean that is true only when `typedValue === targetName`
- `busy`: Whether deletion is in progress
- `error`: Failure text, including stale target or filesystem errors

**Validation Rules**

- Final delete action remains disabled until `typedValue` exactly matches `targetName`.
- Matching is case-sensitive and includes spaces and punctuation.
- Cancel leaves the target unchanged and returns the user to the previous usable view.
- Folder deletion must continue to show recursive impact information and block stale confirmations.

## Action Target

Identifies the file or folder affected by a selected menu item.

**Fields**

- `path`: Repository-relative path or picker path for the target
- `displayName`: Name shown to the user
- `locationLabel`: Human-readable parent location
- `isRepositoryRoot`: Whether the target is the repository root
- `capabilities`: Available optional commands for the current context

**Validation Rules**

- Duplicate `displayName` values in different locations must be disambiguated by `locationLabel`.
- Repository root targets must not expose folder delete.
- Capability evaluation must be based on current file, folder, git, and setup state.

## State Transitions

```text
Menu closed -> menu opened -> command selected
command selected -> non-destructive action runs -> menu closed
command selected -> delete confirmation opened
delete confirmation opened -> typed mismatch -> final delete disabled
delete confirmation opened -> typed exact match -> final delete enabled
final delete enabled -> confirm -> delete pending -> success or error
delete confirmation opened -> cancel -> previous view restored
```
