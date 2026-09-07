# Feature Specification: Simplify Startup Folder Resolution

**Feature Branch**: `041-simplify-startup-logic`
**Created**: 2026-09-07
**Status**: Draft
**Input**: User description: "the logic at the startup is too complex and with too many places it can fail. In real life i saw multiple cases (that I am not sure i can reproduce) that the startup failed. Let's simplify the logic and clean up everything that is there today. Make sure not to leave code that is prone to errors, and that have fuzzy logic. Logic should be: Use explicit path if it was provided; if showing a preview of a file, first determine if this is a file in a repo or just a file in an independent OS folder — based on that make sure to show the left side tree appropriately and maintain the state correctly; when saving last viewed save only the repo level of the OS folder path for independent folder outside of a repo, do not save the latest previewed file or the last sub-folder of a repo; keep the OS default as simple and as safe as possible, treat that as a fail over for any errors in the options above; keep this part of the code at about 30% smaller as validation that it was simplified."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Startup always reaches a working screen (Priority: P1)

Today, GitLocal's startup resolution runs through several overlapping decision paths (explicit path handling, a "last used folder" preference, a platform-default lookup, a home-directory fallback, and a final guaranteed fallback, plus a separate parallel path for files opened directly). Each path has its own edge cases, and the user has observed real, hard-to-reproduce cases where startup did not land on a usable screen. A person launching GitLocal — with no arguments, with a folder path, or by double-clicking a file — must always land on a working screen (the folder/repo browser or the folder picker) with a clear, human-readable reason shown when GitLocal had to fall back from what was requested.

**Why this priority**: This is the reliability problem the user directly reported. Every other improvement is meaningless if startup can still silently fail or land somewhere confusing.

**Independent Test**: Can be fully tested by launching GitLocal under each of the following conditions and confirming a working screen always appears with an accurate, understandable status: (a) a valid folder argument, (b) a valid repository argument, (c) no argument with a healthy remembered folder, (d) no argument with a remembered folder that has been deleted/renamed/made unreadable, (e) an argument pointing at a path that no longer exists, (f) a completely fresh install with no remembered folder and a normal OS user profile.

**Acceptance Scenarios**:

1. **Given** a valid folder or repository path is provided explicitly (as a CLI argument or as a native "open with" request), **When** GitLocal starts, **Then** GitLocal opens exactly that path and does not consult any remembered or default location.
2. **Given** no path is provided and a previously remembered folder is still valid and accessible, **When** GitLocal starts, **Then** GitLocal reopens that remembered folder.
3. **Given** no path is provided and the previously remembered folder no longer exists or is no longer accessible, **When** GitLocal starts, **Then** GitLocal falls back to a single, simple, always-available default location and clearly tells the user why it did not reopen the remembered folder.
4. **Given** an explicit path is provided but does not exist or is not accessible, **When** GitLocal starts, **Then** GitLocal falls back to the same simple default location and clearly explains that the requested path could not be opened.
5. **Given** any failure occurs anywhere in resolving the requested or remembered location, **When** GitLocal starts, **Then** the fallback location used is always the same well-known, safe location (not a different fallback per failure type).

---

### User Story 2 - The sidebar and state correctly reflect repo vs. independent folder (Priority: P2)

When GitLocal opens directly into a file preview (for example, a Markdown file opened from Finder/Explorer, or a file restored from a previous session), it must first determine whether that file lives inside a git repository or inside an independent, non-repository folder, and use that determination consistently: the file tree shown on the left must be rooted at the repository (when inside a repo) or at the relevant independent folder (when not), and the rest of the on-screen state (breadcrumbs, branch context, available git actions) must match that same determination. This decision must be made once, up front, rather than emerging piecemeal as different parts of the screen load.

**Why this priority**: This is a correctness and consistency problem distinct from pure startup reliability — it affects what the user sees and can do immediately after the file loads, but a startup that reaches *some* screen (User Story 1) is more foundational.

**Independent Test**: Can be fully tested by opening a file that lives inside a git repository and confirming the sidebar is rooted at the repository root with git-aware context, then separately opening a file that lives in a plain folder with no repository and confirming the sidebar is rooted at that folder with no git-specific context shown.

**Acceptance Scenarios**:

1. **Given** a file inside a git repository is opened directly, **When** the preview loads, **Then** the left-side tree is rooted at that repository's top level and repository context (branch, sync status, git actions) is available.
2. **Given** a file inside a folder that is not part of any git repository is opened directly, **When** the preview loads, **Then** the left-side tree is rooted at that independent folder and no repository-only context or actions are shown.
3. **Given** a file is opened directly, **When** GitLocal determines repo-vs-independent-folder status, **Then** this status is established before the tree and file-state are shown, so the user never sees an incorrect tree root that later changes.

---

### User Story 3 - "Last viewed" only remembers a top-level location (Priority: P2)

GitLocal remembers where the user was working so the next bare launch (no argument) can reopen it. That memory must only ever store a top-level location — the repository's root folder, or the root of an independent (non-repository) folder — and must never store a specific file, a sub-folder inside a repository, or any other deeper path. This keeps the "remember where I was" behavior simple, predictable, and immune to the remembered path becoming stale because a specific file or sub-folder was moved, renamed, or deleted.

**Why this priority**: This directly reduces one of the recurring startup-failure shapes the user described (a remembered deeper path silently becoming invalid) but depends on User Story 1's simplified resolution flow being in place first to be meaningful.

**Independent Test**: Can be fully tested by opening a specific file several folders deep inside a repository, or inside an independent folder, closing GitLocal, relaunching with no argument, and confirming GitLocal reopens the repository/folder root (not the specific file or sub-folder) with no file preselected.

**Acceptance Scenarios**:

1. **Given** a user is browsing a file deep inside a repository, **When** GitLocal records what to reopen next time, **Then** only the repository's root path is recorded — not the sub-folder or file path.
2. **Given** a user is browsing a file inside an independent (non-repository) folder, **When** GitLocal records what to reopen next time, **Then** only that folder's own root path is recorded — not any sub-path within it.
3. **Given** GitLocal previously recorded a top-level location as described above, **When** GitLocal is relaunched with no argument, **Then** it reopens at that top-level location with no specific file or sub-folder preselected.

---

### Edge Cases

- What happens when the remembered top-level folder still exists but a git repository that used to be there has been deleted (folder remains, but is no longer a repository)? GitLocal should treat it as an ordinary independent folder rather than failing.
- What happens when the OS default location itself is temporarily unavailable (e.g., a locked-down environment with no writable/readable home or documents folder)? GitLocal must still reach a working screen rather than crashing or hanging, even if that screen is the folder picker with no folder preselected.
- What happens when a file is opened directly (native "open with" a Markdown file) and that file's containing folder no longer exists by the time GitLocal finishes starting? GitLocal should fall back the same way as any other unavailable-path case, with a clear explanation.
- What happens when a nested repository exists (a git repository inside another git repository's working tree)? The nearest enclosing repository to the opened file/folder determines repo-vs-independent-folder status and the resulting tree root.
- What happens on a completely fresh install with no remembered folder at all? GitLocal should skip straight to the OS-default fallback path without treating the absence of a remembered folder as an error condition.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: GitLocal MUST use an explicitly provided path (CLI argument or native "open with" request) as the sole basis for startup when one is given and is valid, without consulting any remembered or default location.
- **FR-002**: When an explicitly provided path is invalid, missing, or inaccessible, GitLocal MUST treat this the same as any other resolution failure and proceed to the single OS-default fallback (FR-007), rather than following a separate failure path specific to explicit input.
- **FR-003**: When no explicit path is provided, GitLocal MUST attempt to reopen the previously remembered top-level location before considering any default location.
- **FR-004**: GitLocal MUST determine, once and up front, whether a directly opened file resides inside a git repository or inside an independent (non-repository) folder, before any part of the screen (tree, breadcrumbs, repository context) is shown.
- **FR-005**: When a directly opened file resides inside a git repository, GitLocal MUST root the file tree and all repository-aware state (branch, sync status, git actions) at that repository's top-level folder.
- **FR-006**: When a directly opened file does not reside inside any git repository, GitLocal MUST root the file tree at that file's independent folder and MUST NOT present repository-only context or actions.
- **FR-007**: GitLocal MUST define exactly one OS-default fallback location, used whenever explicit-path resolution, remembered-folder resolution, or file-open resolution fails for any reason, so that all failure cases converge on the same simple, well-known outcome.
- **FR-008**: The OS-default fallback location MUST be verified as actually accessible at the moment it is used, and MUST NOT itself be allowed to fail without a further, simpler recovery (opening the folder picker with no folder preselected).
- **FR-009**: Whenever GitLocal falls back away from an explicitly requested or previously remembered location, it MUST present a clear, human-readable reason to the user describing what was requested/remembered and why it could not be used.
- **FR-010**: GitLocal MUST persist only a top-level location as "last viewed" for the purpose of the next bare (no-argument) launch — either a repository's root folder or an independent folder's own root — and MUST NOT persist a specific file path or a sub-folder path within a repository or independent folder.
- **FR-011**: GitLocal MUST NOT update the persisted "last viewed" location as a side effect of merely browsing to a sub-folder or file within an already-open repository or folder; it MUST only update when the user opens a different top-level repository or folder.
- **FR-012**: A bare (no-argument) launch that reopens a previously remembered top-level location MUST NOT preselect any specific file or sub-folder from a prior session; the user starts at the top level of that location.
- **FR-013**: The startup resolution logic MUST NOT contain redundant or overlapping fallback paths that can produce different outcomes for what is effectively the same failure (e.g., "path does not exist" and "path is not readable" must not be handled by materially different code paths that could disagree on the resulting fallback).

### Key Entities

- **Startup Target**: The single location GitLocal decides to open when the app starts — expressed as one of: an explicit path, the remembered top-level location, or the OS-default fallback location. Carries enough information to explain to the user which of these it is and, when it is a fallback, why.
- **Repository/Folder Context**: The determination of whether a given file or path is inside a git repository (and if so, that repository's root) or inside an independent, non-repository folder. Drives what the left-side tree is rooted at and which repository-only state and actions are available.
- **Last-Viewed Location**: The single top-level path (repository root or independent folder root) persisted so the next bare launch can reopen it. Explicitly excludes any file or sub-folder depth.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In every one of the startup conditions described in User Story 1's acceptance scenarios, GitLocal reaches a usable screen (the browser/repo view or the folder picker) with an accurate on-screen explanation whenever a fallback occurred — with zero conditions producing a blank, stuck, or unexplained screen.
- **SC-002**: For a file opened directly from inside a repository versus from an independent folder, the on-screen tree root and repository-aware context match the correct case 100% of the time, and never change after the initial screen has rendered.
- **SC-003**: After browsing to any file or sub-folder and relaunching GitLocal with no argument, the app reopens at the top level of the correct repository/folder in 100% of cases, with no specific file or sub-folder preselected.
- **SC-004**: The set of distinct fallback outcomes a user can encounter during startup is reduced to exactly one shared "safe default" outcome, replacing today's multiple, differently-named fallback tiers.
- **SC-005**: The startup-resolution code path (folder/location resolution, repo-vs-folder determination for direct file opens, and last-viewed persistence) is reduced in size by approximately 30% relative to its current state, measured in lines of code across the affected modules, as a concrete signal that redundant and fuzzy logic was removed rather than merely rearranged.

## Assumptions

- "OS default" refers to a single, simple, always-available fallback location (e.g., the user's home directory or equivalent), not the multi-tier chain of alternative locations that exists today; simplicity and safety are prioritized over maximizing the chance of landing on a "nice" folder like Documents.
- The folder picker screen itself (its UI and its browse/open actions) is out of scope for this change; only the automatic startup-resolution logic that runs before any picker interaction, and the repo-vs-folder determination for directly opened files, are in scope.
- "Independent OS folder" means any accessible folder that is not itself, and is not contained within, a git repository.
- The existing behavior of showing a clear message when a remembered or requested location could not be used is retained and consolidated, not removed — only the number of distinct underlying resolution/fallback paths is reduced.
- No changes to git operations, file preview rendering, or any feature unrelated to startup path resolution, repo/folder detection for direct file opens, and last-viewed persistence are in scope.
- The approximately 30% code-size reduction is measured against the startup-resolution-specific source files/functions identified during planning (not the entire codebase), and is a validation signal rather than a hard functional requirement — correctness and simplification quality take precedence if a conflict arises.
