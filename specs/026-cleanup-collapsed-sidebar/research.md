# Research: Clean Up Collapsed Sidebar

## Decision: Use the picker collapsed rail as the intended one-button pattern

**Rationale**: The repository picker already renders a collapsed navigation rail with one `Expand navigation` control. This matches the requested behavior and avoids introducing a new interaction model. Aligning the main viewer with this pattern makes the product more consistent and reduces user confusion.

**Alternatives considered**:

- Keep direct collapsed shortcuts but replace one-letter labels with icons. Rejected because the user explicitly asked to remove direct function buttons and return to one button to open the left side.
- Keep search as the only collapsed shortcut. Rejected because the user called out search as reachable from the main page and not needed in the collapsed rail.
- Hide the rail entirely when collapsed. Rejected because users still need a visible, discoverable way to reopen the left side panel.

## Decision: Remove collapsed-only shortcuts from the main viewer

**Rationale**: The current main viewer collapsed rail exposes shortcut buttons for repository search, changed files, recent files, key documents, and current folder. In the narrow rail these appear as one-letter or symbolic controls, which looks like a rendering bug and does not add enough value to justify the clutter.

**Alternatives considered**:

- Move shortcut buttons to a tooltip-only icon rail. Rejected because the collapsed state should be simple and not require users to learn a secondary shortcut system.
- Keep shortcut behavior for power users behind a preference. Rejected as unnecessary complexity for a cleanup whose goal is removing confusing controls.

## Decision: Preserve existing panel state behavior and functional access

**Rationale**: The cleanup should not remove product capabilities. Search and repository actions remain available through the expanded side panel, main page controls, or existing content surfaces. The collapsed state only needs to reopen the side panel.

**Alternatives considered**:

- Reset the sidebar to expanded on navigation. Rejected because it would change the user's remembered layout preference.
- Remove collapsed preference persistence. Rejected because the feature request is about collapsed presentation, not preference behavior.

## Decision: Use automated UI tests as the primary regression guard

**Rationale**: The risk is visible UI regression: extra controls returning, one-letter labels reappearing, or the reopen control becoming inaccessible. Existing React Testing Library coverage can verify the collapsed rail structure and expand behavior without introducing new test tooling.

**Alternatives considered**:

- Rely on manual QA only. Rejected because the previous issue was visible and should be guarded by automated tests.
- Add a separate visual snapshot tool. Rejected because this narrow behavior can be verified with existing test infrastructure.
