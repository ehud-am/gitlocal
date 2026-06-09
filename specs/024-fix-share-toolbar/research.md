# Research: README Logo and Markdown Toolbar Polish

## Decision: Restore README Logo With Repository-Tracked Asset Path

**Rationale**: The README currently references `ui/public/gitlocal-logo.svg`. The asset exists in the repository, but hosted README renderers and npm package README contexts can fail when the referenced path is absent from the published documentation context or when generated assets differ. The logo should point to an asset that is committed and stable for repository rendering, and implementation should verify that the referenced path exists before considering the regression fixed.

**Alternatives considered**:

- Keep the current path and rely on renderer behavior: rejected because the user reported a visible regression.
- Reference generated `ui/dist/gitlocal-logo.svg`: rejected because generated build output is not a stable source documentation dependency.
- Remove the logo: rejected because the regression is specifically that the logo should show.

## Decision: Place Share Actions in the Existing File Action Row

**Rationale**: The current Markdown share component renders as a dedicated section below the file-level toolbar. Moving those actions into the same row as Find in File directly restores vertical reading space while preserving the actions users already have. Keeping the action logic in the existing share component limits the behavioral blast radius.

**Alternatives considered**:

- Keep a separate share row: rejected because it wastes reading space and conflicts with the user's requested cleanup.
- Hide share actions behind a menu: rejected for this patch because the user said the buttons are clear enough as-is and asked for same-line placement, not reduced visibility.
- Build a new toolbar abstraction: rejected because this is a small polish change and existing components are sufficient.

## Decision: Remove the Saved-Content Helper Sentence

**Rationale**: "Sharing uses the saved Markdown content." adds visual clutter and is not needed when the buttons have clear labels and accessible names. Existing status messages and button labels can continue to communicate action outcomes.

**Alternatives considered**:

- Reword the sentence: rejected because the user explicitly requested removing it.
- Move the sentence to a tooltip: rejected unless implementation discovers an accessibility gap, because the primary concern is reducing clutter.
- Keep the unsaved-edits warning only: deferred to implementation review; if unsaved preview-specific messaging exists and prevents user confusion, it may remain only where it communicates a materially different state.

## Decision: Preserve Existing Share Outcomes

**Rationale**: The feature request is layout polish, not a sharing behavior change. Print/PDF/share/copy/download outcomes should remain available where they already worked.

**Alternatives considered**:

- Remove lesser-used actions while moving the toolbar: rejected because it changes feature scope.
- Add new destinations: rejected because this patch must stay local-first and focused.

## Decision: Test Layout Behavior Through Component Assertions and Targeted Visual Checks

**Rationale**: Unit/component tests can verify that controls coexist in one toolbar row and redundant text is gone. Targeted visual/manual checks at representative widths catch overlap and wrapping issues that semantic tests may miss.

**Alternatives considered**:

- Full application screenshot automation only: rejected because it is heavier than needed for this focused patch.
- Manual-only verification: rejected because the toolbar regression should be protected by repeatable component tests.
