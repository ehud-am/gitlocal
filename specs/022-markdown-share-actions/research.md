# Research: Markdown Share Actions

## Decision: Provide Markdown output actions from the rendered Markdown view

**Rationale**: The feature's primary value is polished rendered Markdown output, not raw Markdown source export. `ContentPanel` already knows file type and renders Markdown through `MarkdownRenderer`, making it the natural location to expose a Markdown-only action cluster without changing non-Markdown workflows.

**Alternatives considered**:

- Put sharing in a global toolbar: rejected because it would either appear for unsupported files or require extra disabled states in common non-Markdown workflows.
- Add a separate document-export page: rejected as more navigation than users need for print/share tasks.

## Decision: Use browser-native print for rendered Markdown printing

**Rationale**: Browser print is available in the npm distribution and native WebKit wrapper, respects user printer settings, and can save to PDF on most desktop environments. A print-specific rendered container can preserve headings, lists, tables, links, code blocks, and title context without introducing a new rendering stack.

**Alternatives considered**:

- Server-side PDF rendering: rejected for v1 because it adds dependency weight and platform packaging risk.
- Raw Markdown print: rejected because the spec requires rendered content.

## Decision: Treat Save as PDF as a first-class Markdown action with print fallback

**Rationale**: Users asked for Save as PDF explicitly. The UI should expose it directly even if the underlying path uses browser print/save-to-PDF in the npm distribution. Native macOS can route this through WebKit/print behavior or a thin native save panel if implementation proves straightforward.

**Alternatives considered**:

- Hide PDF under Print only: rejected because it weakens the release's main Markdown enhancement.
- Generate PDF on every share action: rejected because email/Slack/system share may support rendered text or files differently and should not always force artifact creation.

## Decision: Prefer local system/browser share capabilities, then practical fallbacks

**Rationale**: The constitution forbids arbitrary hosted services and telemetry. Email, Slack, and Other Share Options should use local OS/browser capabilities where available, and fall back to Save as PDF, copy rendered content, or download/export when a destination is unavailable.

**Alternatives considered**:

- Direct Slack API integration: rejected because it would require network, accounts/tokens, and service-specific behavior.
- `mailto:` only for all sharing: rejected because it does not cover Slack or system share destinations and may lose formatting.

## Decision: Include visible unsaved Markdown edits or disclose saved-content behavior before sharing

**Rationale**: The spec says unsaved edits must not be silently omitted. The least surprising user experience is to share what the user sees when the rendered preview reflects current edits; where that is not possible, GitLocal must clearly tell the user it will share saved content or ask the user to save first.

**Alternatives considered**:

- Always require save before share: lower implementation risk but adds friction to lightweight review.
- Always share saved content silently: rejected because it can send stale information.

## Decision: Use the existing query invalidation path for the visible Refresh button

**Rationale**: `App.tsx` already has `refreshCurrentView()` for native refresh commands. A top-right button should call the same behavior so keyboard/native/menu refresh and visible refresh stay consistent.

**Alternatives considered**:

- Force full page reload: rejected because it loses app state and can be slower.
- Add a new server refresh endpoint: unnecessary because current data is derived from local filesystem/git at request time.

## Decision: Implement editor undo/redo using the focused editor context

**Rationale**: The current `InlineFileEditor` uses a controlled `textarea`, so default browser undo can be disrupted by React state changes. The editor should preserve predictable history for the focused file and expose standard command handling without affecting other fields or files.

**Alternatives considered**:

- Adopt a full code editor dependency: rejected for this feature because raw editing is lightweight and dependency bloat is discouraged.
- Leave browser default behavior only: rejected because the spec calls out dependable Command undo/redo.

## Decision: Scope platform select-all to the active content panel

**Rationale**: Command-A should help users collect the current file, README, rendered Markdown output, raw preview, or editable draft without selecting the entire GitLocal shell. The UI can handle platform select-all at the content-panel boundary, select the rendered/readable content container when appropriate, and defer to native input/textarea behavior when focus is already inside an input that owns selection.

**Alternatives considered**:

- Let browser Command-A select the whole page: rejected because it includes header, sidebar, footer, and controls instead of just the viewed panel content.
- Override Command-A globally everywhere: rejected because it would break expected select-all behavior in search fields, dialogs, textareas, and other controls.
- Add a separate copy-all button only: useful later, but rejected as the only path because the clarification asks for platform shortcut behavior.

## Decision: Resolve startup folders in the server/CLI layer and persist last used folder locally

**Rationale**: Startup path selection happens before the UI can browse a folder. `src/cli.ts` and `src/server.ts` currently default empty launches to the current working directory/picker mode. A small startup preference helper can resolve explicit path > saved last folder > Documents > home, while repository/folder classification remains in existing server logic.

**Alternatives considered**:

- Store last used folder only in URL state: rejected because startup with no explicit folder may happen before a browser URL exists and native app relaunch needs a local preference.
- Always use current working directory: rejected by the clarification and less useful for non-technical users.

## Decision: Documents defaults are platform-specific and local-only

**Rationale**: The clarified requirement defines macOS and Windows user Documents and Linux configured Documents, then `~/Documents`, then home. This should be resolved without network access and should tolerate missing, localized, redirected, or unreadable folders.

**Alternatives considered**:

- Hard-code `~/Documents` everywhere: rejected because Windows and Linux user directories vary.
- Ask every user on first launch: rejected because the requirement asks for sensible defaults.
