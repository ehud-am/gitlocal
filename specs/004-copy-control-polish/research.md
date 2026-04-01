# Research: Copy Control Polish

## Decision 1: Keep a shared copy button component and change its visual presentation to icon-first

- **Decision**: Reuse the existing shared copy-button component for both markdown code blocks and raw-file copy actions, but change it from text-rendered content to a standard copy icon with status-driven accessible text.
- **Rationale**: The feature is a refinement of an existing interaction, not a new copy system. Keeping one shared component preserves behavioral consistency, minimizes implementation risk, and makes it easier to keep clipboard success and failure feedback aligned across both surfaces.
- **Alternatives considered**:
  - Split into separate markdown and raw-view copy components. Rejected because it would duplicate clipboard logic and increase the chance of inconsistent behavior.
  - Keep the current text button and only restyle it slightly. Rejected because the specification explicitly calls for a familiar copy icon rather than a word-based control.

## Decision 2: Continue attaching copy controls at the markdown code renderer boundary

- **Decision**: Limit markdown copy affordances to the non-inline `code` renderer branch in the existing markdown renderer and do not introduce copy controls for other rendered markdown block types.
- **Rationale**: The current renderer already distinguishes inline code from fenced or block code, so it is the narrowest and most reliable place to enforce the new "code blocks only" rule. This avoids scattering copy logic across headings, paragraphs, block quotes, and other markdown node renderers.
- **Alternatives considered**:
  - Add toolbar wrappers around all rendered markdown blocks and selectively hide copy controls. Rejected because it preserves the noisy structure the feature is trying to remove.
  - Move markdown copy behavior into a page-level overlay. Rejected because it would make the copy target less obvious and harder to associate with a specific code block.

## Decision 3: Preserve accessible status messaging through labels and titles instead of visible text

- **Decision**: Use icon-only visible controls while keeping dynamic accessible naming and tooltip text for idle, success, and retry states.
- **Rationale**: The user wants a standard copy icon, but removing visible text should not make the control ambiguous for assistive technologies or mouse users who benefit from hover text. This preserves clarity without restoring visual clutter.
- **Alternatives considered**:
  - Remove status messaging entirely once the icon is introduced. Rejected because copy success and failure would become less discoverable.
  - Show visible helper text next to the icon at all times. Rejected because it undermines the goal of reducing visual weight.

## Decision 4: Treat this as a UI-only change unless testing exposes a coupling gap

- **Decision**: Plan the feature as a frontend-only refinement centered on `CopyButton`, `MarkdownRenderer`, content-panel styling, and related UI tests.
- **Rationale**: The specification changes which existing controls appear and how they look, but it does not require new API data or backend-derived state. Keeping the scope UI-only helps preserve velocity and reduces the regression surface.
- **Alternatives considered**:
  - Introduce a backend flag to instruct the UI when copy controls should appear. Rejected because the UI already knows whether content is raw or a markdown code block.
  - Expand the feature to revisit all copy flows throughout the app. Rejected because the request is specifically about markdown code copy and raw-file copy.

## Implementation Notes

- Icon-only controls still need explicit accessible names and stable test hooks so success, failure, and target-specific behavior can be validated.
- Markdown tests should include non-code blocks to prove copy controls are absent there, not only that they are present on code blocks.
- Raw-file tests should confirm that the visible control style changes without regressing full-file copy behavior.
