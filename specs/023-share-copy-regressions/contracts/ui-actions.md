# UI Action Contract: Share and Copy Regression Patch

## Copy Action

**Availability**

- Visible for every currently supported readable text file.
- Visible in raw/source text views.
- Visible in rendered text views when rendered text exists.
- Hidden or disabled for binary, image-only, missing, or unsupported file content.

**Presentation**

- Must be a button, not a link.
- Must include a recognizable copy icon and the visible label `Copy`.
- Must expose an accessible name equivalent to `Copy`.

**Behavior**

```ts
type CopyRepresentation = 'raw' | 'rendered'

interface CopyTextAction {
  action: 'copy-text'
  path: string
  representation: CopyRepresentation
}
```

- `representation: "raw"` copies source text.
- `representation: "rendered"` copies useful text from the visible rendered output.
- Success and failure produce visible or announced feedback.
- The active file, scroll position, and view mode are preserved.

## Share Action

**Availability**

- Visible only where the current content has a supported local share/export path.

**Presentation**

- Must include a recognizable share icon.
- Must retain an accessible name equivalent to `Share`.

**Removed Destinations**

The following visible actions must not appear in this patch:

- `Email`
- `Slack`
- `Print`

## Save PDF Action

**Availability**

- Visible for rendered text output that can be prepared as a clean document.
- Hidden or disabled when no rendered output exists.

**Behavior**

```ts
interface SavePdfAction {
  action: 'save-pdf'
  sourcePath: string
  output: 'rendered-text'
}
```

- Prepares a document containing rendered content and title context.
- Excludes app chrome, navigation, buttons, editor controls, dialogs, and sidebars.
- Starts the local browser/OS save-to-PDF flow where available.
- If the flow cannot start or complete, reports a clear failure and leaves the current view intact.
- Does not expose a separate visible Print action.

## Toolbar Icon Actions

The following existing controls must include recognizable icons:

```ts
type IconRequiredToolbarAction =
  | 'find-in-file'
  | 'refresh'
  | 'theme-toggle'
```

**Rules**

- Icons supplement the current action, they do not change the action's behavior.
- Existing labels, tooltips, aria labels, and keyboard behavior are preserved or improved.
- Loading/disabled states remain visually clear and accessible.

## Accessibility Requirements

- Icon-only controls must have accessible names.
- Icon-and-label controls must not duplicate noisy screen-reader text.
- Button text must fit in the toolbar at supported desktop and mobile widths.
- Removed actions must not remain reachable through hidden menus in the affected action surface.
