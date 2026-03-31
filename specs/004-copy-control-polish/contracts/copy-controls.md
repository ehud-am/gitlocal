# Copy Controls Contract: Copy Control Polish

## Purpose

Defines the user-facing behavior for copy controls in rendered markdown and raw-file view.

## Shared Copy Control Contract

- The visible copy affordance uses a standard copy icon rather than a text-only button label.
- Markdown code-block copy and raw-file copy use the same recognizable icon language so users can identify the action consistently.
- The control continues to expose clear accessible labeling and status text for success and failure states even though the visible treatment is icon-first.
- Copy success or failure feedback must not move the user away from the current content.

## Rendered Markdown Contract

- A copy control appears for each rendered markdown code block.
- No copy control appears for non-code markdown blocks such as paragraphs, headings, lists, block quotes, or tables.
- Activating a markdown code-block copy control copies only the content of the associated code block.
- Inline code styling does not gain a copy control through this feature.

## Raw File Contract

- The raw-file view continues to expose one full-file copy action.
- The raw-file copy action uses the same standard copy icon treatment instead of a visible text button.
- Activating the raw-file copy control copies the entire raw file content currently displayed.

## Non-Goals

- This contract does not introduce bulk copy across multiple markdown code blocks.
- This contract does not add copy controls to rendered markdown elements beyond code blocks.
- This contract does not change server APIs or introduce new backend clipboard behavior.
