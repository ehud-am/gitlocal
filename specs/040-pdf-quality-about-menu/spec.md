# Feature Specification: PDF Preview Sharpness & macOS About Menu

**Feature Branch**: `040-pdf-quality-about-menu`
**Created**: 2026-09-05
**Status**: Draft
**Input**: User description: "let's start to build version0.13.1. It will first try to fix the following: Preview of pdf files has low resulotion resulting in fuzzy look for the document. Let's improve the quality of the preview for pdf files. The secon thing - in native app, let's add a "about gitlocal" mac menu option. It will show the icon and the version number, like many native apps do."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sharp PDF previews (Priority: P1)

A user browsing their repository opens a PDF file to review it inside GitLocal. Today the rendered page looks fuzzy/blurry compared to opening the same file in a dedicated PDF viewer, especially on high-density (Retina) displays or when the user zooms in. The user needs the preview to look crisp so they can actually read fine print, diagrams, and small text without leaving GitLocal.

**Why this priority**: This is the explicit, named bug the user wants fixed first, and it affects every user who previews a PDF regardless of distribution (npm or macOS app).

**Independent Test**: Open any PDF file in the file preview panel on a high-density display and visually confirm text and line art render sharply (no visible blur/softness), including after zooming in; can be verified and shipped independent of the About menu change.

**Acceptance Scenarios**:

1. **Given** a PDF file is opened in the preview panel on a high-density (Retina/HiDPI) display, **When** the page renders, **Then** text and vector line art appear sharp with no visible blur at the panel's default zoom level.
2. **Given** a PDF preview is open, **When** the user zooms in on the page, **Then** the rendered content remains sharp rather than appearing pixelated or blurry.
3. **Given** a PDF file is opened on a standard-density (non-Retina) display, **When** the page renders, **Then** quality is at least as good as before this change and page load remains responsive.

---

### User Story 2 - About GitLocal menu item (Priority: P2)

A user of the native macOS app wants to quickly check which version of GitLocal they're running, the way they can with any other native Mac app. They open the app's menu bar, choose "About GitLocal", and see a small window with the app icon and version number.

**Why this priority**: Useful and explicitly requested, but purely additive, macOS-app-only, and does not affect the core browsing/review workflow — safe to ship after or alongside the PDF fix without blocking it.

**Independent Test**: Launch the native macOS app, open the app menu, choose "About GitLocal", and confirm a window/panel appears showing the GitLocal icon and the current version number; testable independently of the PDF preview change.

**Acceptance Scenarios**:

1. **Given** the native macOS app is running, **When** the user opens the application menu (the menu bearing the app's name), **Then** an "About GitLocal" item is present.
2. **Given** the user selects "About GitLocal", **When** the about panel opens, **Then** it displays the GitLocal app icon and the current app version number.
3. **Given** the about panel is open, **When** the user dismisses it (close button or standard dismissal), **Then** it closes without affecting the running app or open repository session.

### Edge Cases

- What happens when a PDF page contains very large/high-resolution embedded images — does sharper rendering introduce a noticeable slowdown or excessive memory use on large documents?
- How does the sharper rendering behave on multi-monitor setups where the preview window moves between a Retina and a non-Retina display?
- What version string does "About GitLocal" show when running a development/unreleased build versus an installed release build?
- Is "About GitLocal" also expected/available in the npm/browser-based distribution, or is it exclusively a native macOS menu item (this spec treats it as macOS-only, matching the request)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The PDF preview MUST render page content at a resolution sufficient to appear sharp on high-density (Retina/HiDPI) displays, not just at standard display density.
- **FR-002**: The PDF preview MUST remain sharp (not pixelated) when the user zooms in within the preview panel, up to the preview's supported zoom range.
- **FR-003**: The PDF preview quality improvement MUST NOT regress preview load time or responsiveness to a degree noticeable by users on typical documents.
- **FR-004**: The PDF preview MUST continue to be read-only, matching existing preview behavior (no new editing capability introduced).
- **FR-005**: The native macOS app MUST provide an "About GitLocal" item in its application menu.
- **FR-006**: Selecting "About GitLocal" MUST display the GitLocal application icon and the current application version number.
- **FR-007**: The About panel MUST be dismissible without affecting the running app, open repository, or terminal sessions.
- **FR-008**: The About menu item is a macOS-native-app-only feature; the npm/browser distribution's UI is unaffected by this requirement.

### Key Entities

- **PDF preview render surface**: The canvas/output GitLocal draws a PDF page onto; its effective pixel resolution relative to the display and current zoom level determines perceived sharpness.
- **About panel**: A native macOS panel/window showing static app metadata (icon, version number) with no interactive state beyond dismissal.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a Retina/HiDPI display, users visually confirm PDF preview text and line art are as sharp as the same PDF opened in the OS's native Preview app, at equivalent zoom.
- **SC-002**: PDF preview initial render time for a typical document (under 20 pages) stays within the same perceptible range as before the change (no user-noticeable added delay).
- **SC-003**: 100% of native macOS app launches expose a working "About GitLocal" menu item that correctly displays the running app's version number.
- **SC-004**: Users can find and dismiss the About panel without needing external help or documentation (self-evident, standard macOS interaction pattern).

## Assumptions

- "PDF preview" refers to the existing read-only PDF preview capability introduced in spec 036 (`PdfViewer.tsx` via `pdfjs-dist`); this feature improves its rendering quality rather than replacing the underlying library.
- The blur/fuzziness is caused by rendering the PDF page bitmap at a fixed or low pixel density rather than accounting for the display's device pixel ratio and/or current zoom level; the fix scales the render target accordingly.
- "About GitLocal" applies only to the native macOS app (`native/macos/`) using standard macOS `NSApplication`/menu APIs; the npm/browser distribution has no equivalent native "menu bar" and is out of scope for this requirement, consistent with the user's phrasing ("in native app").
- The version number shown is the same version string GitLocal already tracks/displays elsewhere (e.g., app/package version), not a newly introduced version scheme.
- No new build, packaging, or licensing dependency is required for either fix; both are implementable within the existing `pdfjs-dist` (PDF) and native Swift macOS wrapper (About menu) technology already in use.
