# Feature Specification: Repo Safety, Search & Review Fixes + PPTX Preview

**Feature Branch**: `039-bugfix-pptx-preview`
**Created**: 2026-09-02
**Status**: Draft
**Input**: User description: "Fix four security/correctness/reliability bugs found during review (repo symlink write escape, branch search colon parsing, quoted rename paths, hanging non-terminal websocket upgrades), and add a new PowerPoint (.pptx) file preview capability to the existing preview framework."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Writes stay inside the opened repository (Priority: P1)

A user opens a repository folder in GitLocal and creates or edits files and folders through the app. Even if the repository contains a symlink (created by any means — accidentally, by a build tool, or by a malicious contributor) pointing outside the opened folder, GitLocal must never let a file or folder write escape the opened repository root.

**Why this priority**: This is a security boundary violation — the app currently allows writes to arbitrary locations on the user's filesystem outside the folder the user explicitly opened. This is the highest-impact issue in scope.

**Independent Test**: Open a repository containing a symlink that points to a directory outside the repo. Attempt to create a file or folder through a path that traverses that symlink. Verify the operation is rejected and no file/folder is created outside the opened repository root.

**Acceptance Scenarios**:

1. **Given** a repository containing a symlink that points to a location outside the opened folder, **When** a user creates a file at a path that traverses that symlink, **Then** the operation is rejected and no file is created outside the opened repository root.
2. **Given** a repository containing a symlink that points to a location outside the opened folder, **When** a user creates a folder at a path that traverses that symlink, **Then** the operation is rejected and no folder is created outside the opened repository root.
3. **Given** a repository with no symlinks, **When** a user creates a file or folder at a normal in-repository path, **Then** the operation succeeds exactly as before.

---

### User Story 2 - Branch search returns correct, openable results for colon-containing filenames (Priority: P2)

A user searches file contents on a branch other than the currently checked-out one. Some tracked files have colons in their names. The search must return the correct file path and line number for every match, so the user can open the result and land on the right line.

**Why this priority**: Search results that silently point to the wrong (truncated) path or lose their line number make a core discovery feature unreliable in a way users won't understand — they'll think the match doesn't exist or the tool is broken.

**Independent Test**: In a repository, create and commit a tracked file whose name contains a colon, with distinctive content. Search branch content for that text. Verify the result reports the exact original file path and correct line number, and that opening the result opens that exact file at that line.

**Acceptance Scenarios**:

1. **Given** a tracked file with a colon in its name and filename, **When** a user searches branch content for text in that file, **Then** the result shows the full, correct file path and the correct line number.
2. **Given** a search result for a colon-named file, **When** a user opens that result, **Then** the correct file opens at the correct line.
3. **Given** files without colons in their names, **When** a user searches branch content, **Then** results are unaffected and continue to work as before.

---

### User Story 3 - Changed-file review shows correct paths for renames with special characters (Priority: P2)

A user reviews changed files (e.g., staged or working-tree changes) that include a renamed file whose new or old path contains a space or other character that Git quotes in its porcelain output. The review must show the real, unquoted path, correctly identify the change type, and allow the file to be opened.

**Why this priority**: Misreported renamed paths block a user from reviewing or opening a file that clearly exists, undermining trust in the change-review feature and blocking a common workflow (reviewing renames before commit).

**Independent Test**: Stage a rename where the resulting filename contains a space (or another character Git quotes, such as a non-ASCII character). Request the changed-file list via the review feature. Verify the reported path exactly matches the real filename (no residual quoting/escaping), the change type is correctly reported, and the file can be opened.

**Acceptance Scenarios**:

1. **Given** a staged rename to a filename containing a space, **When** a user requests the list of changed files, **Then** the reported path exactly matches the real filename, with no quote characters or escape sequences remaining.
2. **Given** a staged rename to a filename containing a space, **When** a user requests the list of changed files, **Then** the change type is correctly identified as a rename and the file is reported as able to be opened.
3. **Given** changed files with plain (unquoted) names, **When** a user requests the changed-file list, **Then** results are unaffected and continue to work as before.

---

### User Story 4 - Non-terminal connection attempts fail fast (Priority: P3)

A client (or any process) attempts to open a realtime connection to a GitLocal server endpoint that is not the terminal endpoint. The server must promptly reject the attempt instead of leaving it open indefinitely.

**Why this priority**: This is a resource-leak / hygiene issue rather than a user-facing feature gap — it does not block any user workflow today, but left unfixed it allows connections and their underlying network resources to accumulate indefinitely.

**Independent Test**: Attempt to open a realtime connection to a non-terminal server path. Verify the connection is actively closed within a short, bounded time rather than remaining open/pending.

**Acceptance Scenarios**:

1. **Given** a running GitLocal server, **When** a client attempts a realtime connection to a path other than the terminal endpoint, **Then** the connection is actively closed and does not remain pending.
2. **Given** a running GitLocal server, **When** a client attempts a realtime connection to the actual terminal endpoint, **Then** the connection is accepted and behaves exactly as before.

---

### User Story 5 - Preview a PowerPoint presentation slide by slide (Priority: P2)

A user browsing a repository opens a `.pptx` file. Instead of seeing a generic "binary file" placeholder or a raw download, they see a formatted, read-only preview of the presentation: one slide at a time, with controls to move to the next or previous slide, and — when the slide has them — the speaker notes shown alongside it.

**Why this priority**: This is net-new value (not a bug fix) that extends GitLocal's core "browse and review any file type" promise to a common document format used heavily in less-technical, AI-assisted workflows (e.g., reviewing AI-generated pitch decks or reports). It's independent of the bug fixes above and independently valuable and testable.

**Independent Test**: Open a repository containing a `.pptx` file with multiple slides, at least one of which has speaker notes. Open that file in GitLocal. Verify the first slide renders as a formatted view, next/previous controls step through all slides in order, and speaker notes appear for the slide(s) that have them and are absent (not shown as empty/error) for slides that don't.

**Acceptance Scenarios**:

1. **Given** a `.pptx` file with multiple slides, **When** a user opens it in GitLocal, **Then** the first slide is rendered as a single formatted view (not raw markup, not a download prompt).
2. **Given** a `.pptx` preview is open, **When** the user navigates to the next or previous slide, **Then** the corresponding slide's content renders correctly and navigation is disabled or no-ops appropriately at the first/last slide.
3. **Given** a slide that has speaker notes, **When** that slide is displayed, **Then** the speaker notes are shown alongside the slide content.
4. **Given** a slide that has no speaker notes, **When** that slide is displayed, **Then** no notes area is shown as empty or broken — it is simply omitted or clearly indicated as having none.
5. **Given** a `.pptx` file, **When** a user views it, **Then** no edit controls are presented and no action in the preview can modify the underlying file.
6. **Given** a `.pptx` file that is corrupted or unreadable, **When** a user opens it, **Then** GitLocal shows a clear "cannot preview this file" state rather than a crash or blank screen.

---

### Edge Cases

- Symlink chains (a symlink pointing to another symlink) that eventually resolve outside the repository root must also be rejected, not just single-hop symlinks.
- A path that is lexically inside the repo but whose real (resolved) location is outside it — via any combination of symlinked intermediate directories — must be rejected for both file writes and folder creation.
- A branch-search match on the very last line of a file with no trailing newline, in a colon-named file, must still parse correctly.
- A filename containing multiple colons (e.g., `a:b:c.txt`) must still resolve to the correct full path and line number.
- A renamed path where both the old and new names require quoting (spaces, non-ASCII characters, or embedded quote/backslash characters) must be fully decoded.
- Rapid, repeated connection attempts to non-terminal endpoints must each be rejected promptly rather than accumulating.
- A `.pptx` file with zero slides, or with only a single slide, must still render without navigation errors.
- A `.pptx` file containing embedded media (images, video/audio placeholders) should render available static content (e.g., images) reasonably rather than failing the whole preview; unsupported embedded content may be omitted.
- A very large `.pptx` (many slides and/or large embedded media) should not block or freeze the UI while loading.

## Requirements *(mandatory)*

### Functional Requirements

**Symlink write containment (Bug 1)**

- **FR-001**: The system MUST resolve the real (symlink-following) filesystem location of any target path before performing a file write, and MUST reject the write if that resolved location falls outside the opened repository root.
- **FR-002**: The system MUST resolve the real (symlink-following) filesystem location of any target path before creating a directory, and MUST reject the creation if that resolved location falls outside the opened repository root.
- **FR-003**: The system MUST apply the same real-path containment check to every intermediate path segment, not only the final path component, so that a symlink anywhere in the path is caught.
- **FR-004**: The system MUST continue to allow file and folder creation at ordinary in-repository paths with no change in behavior or performance characteristics.

**Branch search parsing (Bug 2)**

- **FR-005**: The system MUST parse branch content search output such that the reported file path exactly matches the real path, including any colon characters the filename contains.
- **FR-006**: The system MUST report the correct line number for every branch search match, regardless of colons in the filename.
- **FR-007**: Search results MUST remain openable at the correct file and line after this fix, for both colon-containing and ordinary filenames.

**Changed-file path decoding (Bug 3)**

- **FR-008**: The system MUST decode Git's quoted-path notation (used for filenames containing spaces, non-ASCII characters, or special characters) before returning changed-file paths through the API.
- **FR-009**: The system MUST correctly report the change type (e.g., rename) for changed files whose paths required decoding.
- **FR-010**: The system MUST correctly report whether a changed file can be opened, based on its real (decoded) path, for files whose paths required decoding.

**Non-terminal connection rejection (Bug 6)**

- **FR-011**: The system MUST actively close/destroy any realtime connection upgrade attempt directed at a path other than the recognized terminal endpoint, rather than leaving it pending indefinitely.
- **FR-012**: The system MUST NOT change behavior for connection attempts to the recognized terminal endpoint.

**PPTX preview (new capability)**

- **FR-013**: The system MUST detect `.pptx` files and offer a dedicated preview instead of a generic binary/download fallback.
- **FR-014**: The system MUST render each slide of a `.pptx` file as a single formatted view.
- **FR-015**: The system MUST let users navigate sequentially forward and backward through a `.pptx` file's slides.
- **FR-016**: The system MUST display a slide's speaker notes alongside the slide when the slide has notes, and MUST NOT display an empty or broken notes area when a slide has no notes.
- **FR-017**: The `.pptx` preview MUST be strictly read-only — it MUST NOT expose any control that edits the underlying file.
- **FR-018**: The system MUST show a clear, non-crashing "cannot preview this file" state when a `.pptx` file is corrupted or cannot be parsed.
- **FR-019**: The `.pptx` preview capability MUST be integrated as a new entry in the existing preview framework's registry, consistent with how other read-only preview types (PDF, CSV, Excel) are integrated, so that adding it does not require changes to the framework's core dispatch logic.

### Key Entities

- **Repository root**: The filesystem location of the folder the user has opened in GitLocal; the containment boundary that all write and creation operations must resolve within.
- **Search result**: A single content match returned by branch search, consisting of a file path, a line number, and matched content.
- **Changed file entry**: A single entry in a changed-file review listing, consisting of a path, a change type (e.g., added/modified/deleted/renamed), and whether it can currently be opened.
- **Presentation (.pptx)**: A previewable document consisting of an ordered sequence of slides; each slide has renderable visual content and, optionally, speaker notes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero file or folder writes land outside the opened repository root when a symlink is present anywhere in the target path, across all tested symlink configurations (single-hop and chained).
- **SC-002**: 100% of branch content search matches in files with colons in their names return the correct full path and correct line number, and can be opened successfully.
- **SC-003**: 100% of reviewed changed-file entries for renames involving spaces or other quoted characters show the exact real filename, correct change type, and correct openability.
- **SC-004**: Connection attempts to non-terminal endpoints are closed within a short, bounded time (on the order of milliseconds) in 100% of observed cases, with no connections left indefinitely pending.
- **SC-005**: A user can open any well-formed `.pptx` file in the repository and view every slide, including notes where present, without encountering a raw/binary fallback.
- **SC-006**: Adding the `.pptx` preview required no changes to the preview framework's core dispatch logic, matching the integration pattern of prior preview types.
- **SC-007**: None of the four bug fixes introduces a regression in existing file-write, search, changed-file-review, or terminal-connection behavior, as verified by the existing automated test suite plus new tests for each fixed scenario.

## Assumptions

- "Repository root" means the folder the user has explicitly opened in GitLocal, matching the existing path-containment concept already used elsewhere in the codebase.
- Symlinks that point to locations *inside* the opened repository root remain permitted; only escapes to outside the root are blocked.
- The branch search and changed-file review fixes apply to the existing search and review endpoints/features as they exist today; no new search or review capabilities are introduced.
- "Realtime connection" in FR-011/FR-012 refers to the existing WebSocket upgrade handling already used for the terminal feature; no new endpoint types are introduced.
- Bugs 4 (Excel Find/Copy operating on base64) and 5 (malformed CSV silently rendered as valid) are explicitly out of scope for this spec and are deferred to a future spec.
- `.pptx` preview covers the modern Office Open XML PowerPoint format; support for the legacy binary `.ppt` format is out of scope unless found to be low-effort during planning, since it uses a wholly different, older file format.
- Consistent with the existing PDF/CSV/Excel previews, the `.pptx` preview is read-only in this spec; in-preview editing of slides is out of scope.
- Consistent with the existing Excel preview, unsupported or unrenderable embedded content within a slide (e.g., embedded video/audio, complex chart types) may be omitted or shown as a simple placeholder rather than fully reproduced.
- Large `.pptx` files are handled by the same lazy-loading pattern already used for PDF and Excel preview libraries, avoiding a main-bundle size regression.
