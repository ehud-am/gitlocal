# Feature Specification: Fix Empty Content on Startup

**Feature Branch**: `029-fix-empty-content-startup`
**Created**: 2026-07-23
**Status**: Draft
**Input**: User description: "there is a major bug where in many cases the gitlocal app starts with an empty content. Let's do a deep analysis to find this bug (and other bugs) and build a plan on how to fix it."

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - First launch lands on an unreadable default folder (Priority: P1)

A first-time user installs GitLocal (npm package or macOS app) and launches it without pointing it at a specific folder. GitLocal picks a default starting folder on the user's behalf. When that folder cannot actually be read — because an OS permission hasn't been granted yet, the folder is empty of visible content for a reason the user can't tell, or access is otherwise blocked — the user currently sees a bare, empty-looking screen with no explanation and no next step.

**Why this priority**: This is the first impression of the product for every new user, on every fresh install, on both distributions. An unexplained blank screen at first launch is the most damaging and most frequently hit version of this bug, and it blocks all other use of the app.

**Independent Test**: Can be fully tested by launching GitLocal fresh (no prior preferences) against a starting folder that exists but cannot be enumerated (e.g., permission not yet granted, or a folder the process cannot list), and confirming the user sees a clear explanation and a way to choose a different folder rather than a blank pane.

**Acceptance Scenarios**:

1. **Given** a fresh install with no remembered folder, **When** GitLocal opens its default starting folder and that folder's contents cannot be read, **Then** the user sees a clear message explaining that access failed and is offered a way to pick a different folder — never a silent blank content area.
2. **Given** a fresh install where the default starting folder is genuinely empty (zero files, no permission issue), **When** GitLocal loads it, **Then** the user sees a "this folder has no files yet" style message that is visibly distinct from an access-failure message.
3. **Given** the default starting folder requires a one-time OS permission grant, **When** the user grants that permission after seeing the failure message, **Then** GitLocal successfully loads and displays that folder's contents on the next retry/refresh without requiring a full app restart.

---

### User Story 2 - Returning user's remembered folder is no longer available (Priority: P2)

A returning user previously had GitLocal open a particular folder or repository. Between sessions, that folder is renamed, moved, deleted, or lives on removable/network storage that isn't currently connected. On the next launch, GitLocal currently can either show a blank content area or silently substitute an unrelated folder without telling the user what happened.

**Why this priority**: This affects the app's core "remember where I left off" behavior and is highly likely to recur for any user who reorganizes files, disconnects a drive, or works across multiple machines. It's less universal than the first-launch case (P1) because it requires an established prior session, but it is still a common, recurring trigger.

**Independent Test**: Can be fully tested by setting a remembered folder, then deleting/renaming it or unmounting its volume, relaunching GitLocal, and confirming the user sees a clear explanation identifying the missing folder plus a way to pick a new one — never a blank pane or an unexplained switch to a different folder.

**Acceptance Scenarios**:

1. **Given** a previously remembered folder that has since been deleted or renamed, **When** the user relaunches GitLocal, **Then** the user sees a message identifying that the remembered folder is no longer available and is guided to select a new folder.
2. **Given** a previously remembered folder on a currently-disconnected removable or network drive, **When** the user relaunches GitLocal, **Then** the user sees a message indicating the folder is currently unreachable, distinct from "deleted" or "permission denied," with an option to choose another folder.
3. **Given** the remembered folder becomes available again after being disconnected, **When** the user retries or relaunches, **Then** GitLocal successfully loads it without requiring the user to manually re-browse to it.

---

### User Story 3 - Opening a specific file or folder that no longer exists (Priority: P3)

A user opens GitLocal against a specific target — via a command-line argument, a "recent document" shortcut, or an "Open With GitLocal" action from their operating system's file browser — and that target has since been moved, renamed, or deleted. GitLocal currently can silently redirect to an unrelated, unexpected folder (such as the process's working directory) with no indication that the originally requested target failed to open.

**Why this priority**: This scenario requires a specific launch method (explicit path, OS integration) rather than GitLocal's own default behavior, so it affects fewer sessions than P1/P2, but when it happens the resulting confusion is high because the user is looking at content they never asked for and have no way to explain.

**Independent Test**: Can be fully tested by launching GitLocal with a path argument (or an OS "Open With" / recent-document action) that points to a file or folder that no longer exists, and confirming the user sees a message naming the requested path and explaining it could not be opened, rather than being silently shown a different, unrelated folder.

**Acceptance Scenarios**:

1. **Given** a command-line launch with a path that does not exist, **When** GitLocal starts, **Then** the user sees a message stating the given path could not be found, and is offered a way to choose a valid folder.
2. **Given** an "Open With GitLocal" or recent-document action pointing at a file that has since been deleted or moved, **When** GitLocal opens, **Then** the user sees the same kind of clear, path-specific failure message rather than landing on an unrelated folder with no explanation.

---

### User Story 4 - No feedback when the browser window can't auto-open (Priority: P4)

A user runs the npm-distributed CLI in an environment where GitLocal cannot automatically open a browser tab (no default browser configured, headless environment, browser launch blocked). Today, the only indication that something didn't happen automatically is a log line printed to the terminal that the user may not notice; there is no on-screen or otherwise clear next step telling the user to open the address themselves.

**Why this priority**: Originally scoped as a related, lower-frequency "the app looks like it isn't starting" complaint distinct from the main empty-content bug, affecting only the npm/terminal distribution. **Revised during implementation**: forcing this exact failure condition (rather than only reading the code) revealed it is more severe than a missing message — a real browser-open failure crashed the entire GitLocal server process outright (an unhandled `'error'` event from a child-process spawn failure, bypassing the existing `try/catch`), which is indistinguishable from "GitLocal doesn't work at all" for an affected user. The P4 priority is kept as-is since implementation is already complete for all four stories, but this scenario's actual severity was closer to P1 than the original framing suggested.

**Independent Test**: Can be fully tested by starting GitLocal in an environment where automatic browser launch fails and confirming the terminal output clearly and prominently instructs the user to open the given local address manually.

**Acceptance Scenarios**:

1. **Given** GitLocal starts successfully but cannot auto-open a browser, **When** the auto-open attempt fails, **Then** the terminal output prominently instructs the user to manually open the displayed local address.

---

### Edge Cases

- What happens when the default or remembered starting folder exists and is listed as accessible by a basic check, but the actual attempt to read its contents fails at the moment of loading (e.g., a permission prompt appears asynchronously, or a network volume drops mid-read)?
- How does the system distinguish, in what it shows the user, between "this folder has no visible files" and "this folder's contents could not be retrieved due to an error"?
- What happens when different parts of the UI (e.g., the folder/file navigation panel and the main content area) each independently fetch the same folder's data and one succeeds while the other fails? The user must see a consistent, non-contradictory result.
- What happens when an unexpected server-side error occurs while loading startup data — does the user ever see an indefinite loading state or a blank area with no error and no way to retry?
- How does the system behave when a user grants a previously-missing OS permission and returns to GitLocal — must the user restart the whole app, or can the existing screen recover?
- What happens when a folder that used to be a valid target becomes unreadable partway through a session (e.g., permissions revoked, drive ejected) rather than at startup?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST show a clear, human-readable error message whenever the initial repository/folder information needed to start the app fails to load, instead of rendering the main content area as if the folder were empty.
- **FR-002**: The system MUST show a clear, human-readable error message whenever the file/folder listing for the currently viewed location fails to load, instead of rendering that location as if it had no files.
- **FR-003**: The system MUST present a consistent failure indication across every part of the UI that displays data for the same folder or file tree (for example, the navigation panel and the main content area must never disagree about whether a given fetch succeeded, was empty, or failed).
- **FR-004**: The system MUST distinguish, in both its internal handling and its user-facing messaging, between "this location is genuinely empty" and "this location's contents could not be retrieved."
- **FR-005**: When the app's default or remembered starting folder cannot be read (missing permission, deleted, renamed, or otherwise inaccessible), the system MUST tell the user why in plain language and offer a way to choose a different folder, instead of showing blank content.
- **FR-006**: The system MUST verify that a candidate starting folder (default or remembered) is actually readable, not merely present, before treating it as ready to browse.
- **FR-007**: When a user- or OS-provided path (command-line argument, "Open With" action, recent-document shortcut) does not exist or cannot be opened, the system MUST clearly state that the requested path could not be opened, and MUST NOT silently substitute an unrelated folder without explanation.
- **FR-008**: The system MUST allow the user to recover from any of the above failure states by choosing a new folder, without needing to fully restart the application, wherever a restart is not otherwise required by the underlying cause (e.g., a genuinely unmounted drive still requires the drive to be reconnected, but the app itself must not require relaunching to notice it).
- **FR-009**: When GitLocal (npm/terminal distribution) cannot automatically open a browser window, the terminal output MUST clearly and prominently instruct the user how to open the app manually, and this failure MUST NOT crash or otherwise terminate the running GitLocal server.
- **FR-010**: Existing correctly-functioning behavior — accurate detection of git repositories, sub-repositories, and genuinely empty folders — MUST be preserved; this feature changes only how failures are surfaced, not how successful detection works.

### Key Entities *(include if feature involves data)*

- **Startup Folder Selection**: The folder GitLocal decides to open when the app launches — either a remembered folder from a prior session, a default fallback location, or an explicitly provided path/file. Has a readability/availability state that must be confirmed, not assumed.
- **Content Load Outcome**: The result of attempting to fetch data for a given folder/location, which must be represented distinctly as one of: successful with content, successful and genuinely empty, or failed with an explanation. This outcome must be shared consistently across every UI element that reflects the same location.
- **Open Target Request**: A specific file or folder the user (or the operating system, via "Open With" or recent-document integration) asked GitLocal to open. Tracks whether that request was fulfilled, and if not, why, so the failure can be communicated back to the user.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100% of tested failure scenarios (unreadable default folder, missing/moved remembered folder, invalid explicit path, disconnected drive), the user sees an explanatory message within 2 seconds of the failure being detected — never a blank content area with no indication of what happened.
- **SC-002**: Zero observed cases, across manual and automated test coverage of the identified trigger scenarios, where the main content area renders with no data, no loading indicator, and no error message.
- **SC-003**: A first-time user encountering a folder-access problem on first launch can identify the problem and reach a working folder view (by granting permission or picking another folder) in under 30 seconds without outside help.
- **SC-004**: Reports of "blank screen" or "empty content on startup" from users drop by at least 80% in the first month after release, measured against the rate observed in the month before this fix.

## Assumptions

- The reported "empty content" symptom is not one single defect but a small set of independent trigger conditions that each currently fall through to the same silent, unexplained blank-content result: an unreadable default startup folder (most common — affects every fresh install), a stale or unavailable remembered folder, and an invalid explicit open target (CLI argument or OS file-open integration). This specification addresses all three, since each independently reproduces the reported symptom.
- "Other bugs" in scope for this feature are limited to user-facing gaps that produce a similarly confusing "nothing happened" experience — specifically, the lack of on-screen guidance when a browser window can't auto-open. Purely internal code-quality observations with no independent user-facing symptom (for example, minor documentation/code drift in an internal launch-log string, or duplicated internal helper logic that already behaves correctly for the common case) are noted for the implementation plan's consideration but are not treated as separate user-facing requirements here.
- Existing folder/repository detection logic (git vs. non-git, sub-repository detection) is assumed correct when it succeeds; this feature is scoped to what happens when a fetch or read operation fails or is denied, not to the accuracy of detection itself.
- No new persistent data store is introduced. The existing mechanisms for remembering a last-used folder and choosing a default startup folder are reused; only their failure handling and the resulting user feedback change.
- Both distributions (npm/terminal and macOS native app) share the same underlying server and UI failure paths, so a single fix addresses both. Any OS-specific permission-prompt wording is treated as an enhancement to the same generic error-messaging mechanism, not a separate feature.
- "Clear, human-readable error message" means plain language a non-technical user can act on (e.g., naming the folder and the general reason: not found, no permission, or unreachable), not a raw technical error string or stack trace.
