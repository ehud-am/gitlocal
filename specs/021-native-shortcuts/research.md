# Research: Native App Shortcuts

## Decision: Keep Product Logic in the Web UI and Route Native Commands Through the Wrapper

**Rationale**: The constitution permits Swift only as a thin macOS wrapper around the existing Node.js-served React UI. Copy, Cut, Paste, Find, and Refresh are native app commands, but the content and app state live inside the embedded viewer. The wrapper should provide menu items and shortcut routing, while the shared web UI should retain ownership of preview content, file selection, editing state, and refresh behavior.

**Alternatives considered**:

- Reimplement preview selection and find in Swift. Rejected because it would fork product behavior and violate the thin-wrapper direction.
- Add a separate native editing layer. Rejected because the product optimizes for reading/review and lightweight intervention, not full IDE workflows.

## Decision: Scope Find to the Current Preview Panel

**Rationale**: The feature spec explicitly requires Find to search preview content only. This avoids conflicts with repository search, sidebar labels, toolbar controls, and app chrome. It also aligns with the user's reading workflow: locate text inside the currently viewed file.

**Alternatives considered**:

- Use global repository search. Rejected because it is a different product feature and would return non-preview results.
- Use unrestricted browser/WebKit find across the whole page. Rejected because it can match navigation and controls outside the preview panel.

## Decision: Preserve Existing Browser Behavior While Adding Native App Parity

**Rationale**: The browser distribution already gets several commands from browser chrome. The patch should close the native app gap without changing browser expectations or introducing regressions. Shared UI changes should be guarded by behavior tests and native-only command routing should live in the macOS wrapper.

**Alternatives considered**:

- Make browser and native app use entirely separate command implementations. Rejected because it increases maintenance burden and risks behavioral drift.
- Disable browser-native behavior and replace it everywhere. Rejected because the browser path is already functional and familiar.

## Decision: Treat Refresh as Reloading Current App State, Not Restarting the Service

**Rationale**: Users need current filesystem and git state reflected without restarting GitLocal. Refresh should preserve repository and file context when possible, and fall back gracefully if the prior target is gone. Restarting the service would be slower and could interrupt the app session unnecessarily.

**Alternatives considered**:

- Restart the managed local service on every refresh. Rejected because it is heavier, riskier, and not required by the user outcome.
- Reload only the visual WebView without refreshing app data. Rejected because it may preserve stale repository state.

## Decision: Patch Release Requires Release Documentation and Contrarian QA

**Rationale**: The constitution requires every release branch to represent one release increment, update version metadata, update `CHANGELOG.md`, review README, and run contrarian QA before release approval. This feature is explicitly a minor patch release, so planning must account for those release tasks.

**Alternatives considered**:

- Treat this as implementation-only without release artifacts. Rejected because the user explicitly requested a patch release and the constitution makes release documentation mandatory.
