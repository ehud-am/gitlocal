# Release Review: Markdown Share Actions

## Contrarian QA Notes

- Markdown sharing relies on browser and OS capabilities that vary by environment. Print and Save as PDF should remain the reliable path; Slack and system share must clearly fall back when `navigator.share` or local handlers are unavailable.
- Native macOS Print Markdown and Share Markdown commands are dispatched into the web app. They only produce visible behavior when a rendered Markdown action surface is mounted, so manual native validation should include both Markdown and non-Markdown files.
- Startup folder persistence stores a user-local path. The fallback path must tolerate removed, unreadable, or symlinked directories without blocking launch.
- Refresh preserves current UI state by invalidating query data rather than hard reloading the page. QA should verify externally edited files, deleted selected files, and branch context.
- Editor undo/redo is scoped to the focused editor. QA should explicitly try search fields and dialogs so global native commands do not mutate file drafts accidentally.
- Panel-scoped Select All depends on focus and DOM selection behavior. QA should verify rendered Markdown, raw previews, folder README panels, editable drafts, search fields, and dialog fields so Command-A never selects the full app chrome.

## Release Readiness Checklist

- Automated coverage exists for Markdown action visibility, rendered output extraction, share fallbacks, native Markdown commands, refresh visibility/context, editor undo/redo history, content-panel Select All scope, startup folder resolution, and preference updates.
- Documentation updates cover npm, native macOS, Homebrew packaging, README, CHANGELOG, and manual validation notes.
- Remaining release risk is environment-specific manual behavior: print dialogs, mail client handlers, Slack/system share availability, native wrapper menu behavior, and OS/WebKit text selection differences.
