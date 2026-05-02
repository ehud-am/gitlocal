# Research: Folder Delete Action And Compact Tags

## Decision: Move Delete Folder To The Main Folder Action Area

**Rationale**: The delete-folder command is destructive and benefits from the broader context of the selected folder's main view. Placing it near existing create actions makes it discoverable without presenting destructive controls as compact row icons in the navigation panel.

**Alternatives considered**:

- Keep the left-panel x icon and add a tooltip. Rejected because a small row icon remains easy to misread or activate out of context.
- Show delete in both the left panel and main view. Rejected because duplicate destructive entry points increase visual noise and make acceptance criteria harder to reason about.
- Move delete into an overflow menu only. Rejected because the user explicitly asked for a main-view button similar to the new-file action.

## Decision: Use Destructive Outline Styling For The Main Action

**Rationale**: Red text and a red border communicate danger while remaining visually lighter than a filled destructive button. This matches the user's request and keeps the action distinct from create actions before the stronger typed confirmation dialog opens.

**Alternatives considered**:

- Filled red button. Rejected because the delete command is available in a routine folder action area and should not dominate the entire toolbar.
- Neutral button with icon only. Rejected because the command must be unmistakably destructive and understandable without relying only on icon recognition.
- Warning banner. Rejected because no destructive action has occurred until the user chooses delete and completes confirmation.

## Decision: Preserve The Existing Folder Delete Confirmation Flow

**Rationale**: The previous feature already established strong safety requirements: preview impact, typed folder-name confirmation, stale impact validation, and root deletion blocking. This feature changes the entry point only; changing delete behavior would expand scope and risk.

**Alternatives considered**:

- Simplify confirmation because the action is now more contextual. Rejected because recursive deletion remains destructive.
- Add a second confirmation step. Rejected because the existing typed-name flow already satisfies the safety goal without adding unnecessary friction.

## Decision: Shorten Left-Panel Tags Conservatively

**Rationale**: The left panel is dense, and status labels should support scanning rather than dominate rows. "Local only" can become "local" while preserving meaning in context. Other labels should be shortened only when the shorter term remains understandable.

**Alternatives considered**:

- Replace tags with icons only. Rejected because status meaning would become less clear for non-technical users.
- Remove tags entirely. Rejected because local/sync status is still useful while browsing.
- Shorten every tag aggressively. Rejected because some statuses may need their existing words to remain understandable.
