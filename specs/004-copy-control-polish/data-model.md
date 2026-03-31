# Data Model: Copy Control Polish

## Overview

This feature adds no persistent storage and no new server-side data structures. Its model is a small UI interaction model that governs where a copy control appears, what content it targets, and what feedback state it exposes after activation.

## Entities

### Copy Control

- **Purpose**: Represents the visible copy affordance shown to the user for an eligible content target.
- **Fields**:
  - `surface`: Whether the control belongs to a markdown code block or a raw-file view.
  - `presentation`: Icon-only visible treatment with accessible label text.
  - `status`: Idle, copied, or failed.
  - `tooltipText`: User-facing hover or title text derived from the current status.
  - `accessibleName`: Screen-reader label derived from the current status and target type.
- **Validation rules**:
  - The visible treatment must remain icon-based on both supported surfaces.
  - The accessible name must still identify the action even when no visible text is shown.
  - Status text must correspond to the most recent copy attempt for that control.
- **State transitions**:
  - `idle -> copied -> idle`
  - `idle -> failed -> idle`

### Copy Target

- **Purpose**: Represents the exact text scope associated with one copy action.
- **Fields**:
  - `targetType`: Markdown code block or raw file.
  - `sourcePath`: File currently being viewed.
  - `text`: Exact clipboard text to write.
  - `eligibility`: Whether the current rendered element may show a copy control.
- **Validation rules**:
  - Markdown code-block targets may copy only their own block content.
  - Raw-file targets must copy the full raw content currently displayed.
  - Non-code markdown blocks are always ineligible for copy-control rendering.
- **State transitions**:
  - `ineligible -> eligible` when a rendered element is identified as a code block
  - `eligible -> copied` when the control succeeds
  - `eligible -> failed` when clipboard access fails

### Markdown Block Classification

- **Purpose**: Represents the renderer's decision about whether a markdown node should receive a copy control.
- **Fields**:
  - `blockKind`: Inline code, fenced code block, paragraph, heading, list item, table cell, block quote, or other rendered node kind.
  - `isCopyable`: Whether the node is eligible for a copy control.
- **Validation rules**:
  - Only block code nodes are copyable.
  - Inline code and other non-code block elements are not copyable through this feature.
- **State transitions**:
  - `unclassified -> copyable`
  - `unclassified -> non-copyable`

## Relationships Summary

- One raw-file view exposes one copy control for one raw-file copy target.
- One rendered markdown document can expose zero or more copy controls, but only for code-block copy targets.
- Each copy control maps to exactly one copy target and one current feedback state.
- Markdown block classification determines whether a copy target and copy control exist at all for a rendered node.
