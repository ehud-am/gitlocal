# Clipboard and Picker Contract: Viewer Usability and Search

## Purpose

Defines the required user-facing behavior for one-click copy actions and double-click activation in folder-selection mode.

## Copy Interaction Contract

- Rendered markdown code blocks expose a visible copy control in the top-right corner of the block container.
- Activating a code-block copy control copies only that block's content.
- Raw file view exposes a visible copy control in the top-right area of the raw content container or toolbar.
- Activating the raw-view copy control copies the entire raw file content currently displayed.
- Copy feedback must make it clear whether the action succeeded or failed without shifting the user away from the current content.

## Picker Activation Contract

- Single-click on a picker row continues to select that row without immediately changing folders.
- Double-click on a non-repository folder row opens that folder's contents in picker mode.
- Double-click on a repository row opens the repository viewer directly.
- Keyboard and pointer users must still have a clear primary action available even if they do not use double-click.
- Activation failure must keep the user oriented in the picker and explain what went wrong.

## Non-Goals

- This contract does not require bulk copy across multiple code blocks.
- This contract does not replace the existing explicit picker action buttons; it adds a faster activation path.
