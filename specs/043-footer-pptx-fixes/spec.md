# Feature Specification: Footer Link Pattern & PPTX Preview Fidelity

**Feature Branch**: `043-footer-pptx-fixes`
**Created**: 2026-09-11
**Status**: Draft
**Input**: User description: "this will be another patch release. Two things to fix: 1. The console footer looks bad and does not follow the links. Use some sort of a well established / developer centric pattern. We need to list the gitlocal.dev and the github project at ehud-am/gitlocal. 2. the pptx preview is not cgreat. more than trivial presentations that include master slides are not rendered correctly, the navigation between slides is not great. i would prefere endless scroll vs. buttons at the top"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Footer links reliably open in both distributions (Priority: P1)

A user running GitLocal — whether the npm/browser distribution or the native macOS app — clicks the "GitHub" or "gitlocal.dev" link in the app footer and expects it to open that site.

**Why this priority**: The footer's only job is to be a trustworthy way to reach the project's home and site. If clicking silently does nothing in one distribution, the footer is actively misleading, and this is the concrete complaint ("does not follow the links").

**Independent Test**: Open the app in a standard browser (npm distribution) and in the native macOS app; click each footer link in both; confirm each opens the correct destination in a new tab/window in both environments.

**Acceptance Scenarios**:

1. **Given** the app running in a browser tab (npm distribution), **When** the user clicks the GitHub footer link, **Then** `https://github.com/ehud-am/gitlocal` opens in a new browser tab and the GitLocal tab remains open and unaffected.
2. **Given** the app running in a browser tab (npm distribution), **When** the user clicks the gitlocal.dev footer link, **Then** `https://gitlocal.dev` opens in a new browser tab.
3. **Given** the app running inside the native macOS app's embedded browser, **When** the user clicks the GitHub footer link, **Then** `https://github.com/ehud-am/gitlocal` opens in the user's default system browser, and the native app window remains on the current repository view.
4. **Given** the app running inside the native macOS app's embedded browser, **When** the user clicks the gitlocal.dev footer link, **Then** `https://gitlocal.dev` opens in the user's default system browser.

---

### User Story 2 - Footer follows a familiar, low-noise developer-tool pattern (Priority: P2)

A user glances at the footer of a developer tool and expects it to look and read like footers they already know from similar tools (GitHub CLI, VS Code, other local dev servers) — compact, muted, unobtrusive, with recognizable link treatment (icon or underline-on-hover) rather than looking broken or like an afterthought.

**Why this priority**: This is the "looks bad" half of the complaint. It's a polish issue, secondary to the links actually working, but it's the visible, ongoing impression every session leaves.

**Independent Test**: Show the footer to someone familiar with common developer tools and confirm they recognize the GitHub and website links at a glance, without being told what they are, and that the footer doesn't visually compete with the main content.

**Acceptance Scenarios**:

1. **Given** the app is loaded, **When** the user looks at the footer, **Then** the GitHub link is presented with a recognizable GitHub mark/label (not a bare unstyled hyperlink) and the gitlocal.dev link is presented with a recognizable site/globe treatment, consistent with common developer-tool footer conventions.
2. **Given** the user hovers or focuses a footer link with keyboard navigation, **Then** the link shows a clear, accessible hover/focus state.
3. **Given** the footer is rendered at narrow (mobile-width) and wide (desktop-width) viewports, **Then** the footer layout remains legible and does not overlap or truncate its contents at either width.

---

### User Story 3 - PPTX slides render correctly for presentations built from master/layout slides (Priority: P1)

A user opens a `.pptx` file that was built using PowerPoint's slide master and layout system (placeholders for title/body/background inherited from a master rather than defined directly on each slide) — the common case for anything beyond a trivial, from-scratch deck. Today these render incorrectly (missing text, missing backgrounds, or misplaced content) because the preview only reads each slide's own XML and ignores its layout/master.

**Why this priority**: This is the functional core of the complaint — "more than trivial presentations... are not rendered correctly." A preview that only works for slides with no inherited formatting fails on the majority of real-world decks, which defeats the purpose of having a PPTX preview at all.

**Independent Test**: Open a `.pptx` file whose slides use a non-default master/layout (e.g., placeholder text, themed background, positioned elements inherited from the layout) and confirm the rendered preview shows the same text, background, and approximate layout that PowerPoint or another standard viewer shows for that slide.

**Acceptance Scenarios**:

1. **Given** a slide whose title/body text boxes are defined only as placeholders inherited from its layout (no direct text-box geometry on the slide itself), **When** the slide is previewed, **Then** the placeholder text and its inherited position/size are shown, not omitted.
2. **Given** a slide whose background is set on the slide master or layout rather than the slide itself, **When** the slide is previewed, **Then** the inherited background is shown.
3. **Given** a deck where different slides use different layouts from the same master, **When** each slide is previewed, **Then** each slide reflects its own layout's inherited formatting rather than a single hardcoded default.
4. **Given** a slide that overrides a placeholder's position/formatting from its layout, **When** the slide is previewed, **Then** the slide's own override takes precedence over the inherited value.

---

### User Story 4 - Slide-to-slide navigation is continuous scroll, not paged buttons (Priority: P2)

A user reviewing a `.pptx` file wants to move through slides the way they'd skim a long document — by scrolling — rather than clicking "Next"/"Previous" controls at the top of the viewer one slide at a time.

**Why this priority**: This is a UX preference explicitly called out by the user ("i would prefer endless scroll vs. buttons at the top"). It's independent of the rendering-fidelity fix (Story 3) and can be judged and shipped on its own, but it's rated P2 because a correctly-rendered deck with clunky navigation is still usable, whereas an incorrectly-rendered deck (Story 3) is not.

**Independent Test**: Open a multi-slide `.pptx` file and confirm all slides are reachable by scrolling through the preview panel in order, with no separate "Next"/"Previous" click required, and that the current slide position is clear while scrolling.

**Acceptance Scenarios**:

1. **Given** a `.pptx` file with multiple slides, **When** the preview opens, **Then** slides are laid out in one continuously scrollable view in slide order, without requiring a click to advance.
2. **Given** the user is scrolling through the slide sequence, **When** they pause, **Then** the preview indicates which slide number they're currently viewing (e.g., a position indicator), so orientation isn't lost in a long deck.
3. **Given** a deck with speaker notes on some slides, **When** the user scrolls to a slide with notes, **Then** the notes for that specific slide remain reachable in the scrolling view (equivalent access to what the previous per-slide notes toggle provided).
4. **Given** a very large deck (e.g., 50+ slides), **When** the user scrolls through it, **Then** scrolling stays responsive (no long freeze or unresponsive scroll while off-screen slides render).

---

### Edge Cases

- What happens when a `.pptx` slide's layout or master part is missing, malformed, or unreadable (already-covered failure fixtures exist for slide-level and presentation-level malformed XML)? The slide should still render using whatever it defines directly, falling back gracefully rather than failing the whole preview.
- What happens when a slide references a layout that itself references a master, and an inherited property is overridden at more than one level (slide overrides layout overrides master)? The most specific (slide) value must win, then layout, then master.
- What happens when the user's OS has no default browser configured (native macOS app case)? The link click should not silently fail; the system's own "no default browser" handling applies.
- What happens when the footer is rendered in a context with no version string available? Existing behavior (omit the version segment) is preserved.
- What happens when a scrolled deck is closed and reopened, or the user switches to a different file and back? Reasonable default: the scroll position resets to the first slide (deep-linking to a specific slide position is out of scope for this fix).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The footer MUST present a link to the GitHub project (`https://github.com/ehud-am/gitlocal`) and a link to `https://gitlocal.dev`, each recognizable at a glance (icon and/or label) per common developer-tool footer conventions.
- **FR-002**: In the npm/browser distribution, footer links MUST open their destination in a new browser tab without navigating away from or closing the running app tab.
- **FR-003**: In the native macOS distribution, footer links MUST open their destination in the user's default system browser, not attempt to navigate the embedded app view (which has no visible browser chrome to show an external site in).
- **FR-004**: Footer links MUST have a visible, accessible hover and keyboard-focus state.
- **FR-005**: The footer MUST remain legible (no overlap or truncation of its links/text) across the range of viewport widths the app already supports.
- **FR-006**: PPTX preview rendering MUST resolve each slide's inherited formatting from its associated slide layout and, in turn, the layout's slide master, for any property not directly overridden on the slide (text placeholders, background fill, and positioned shape geometry, at minimum).
- **FR-007**: When a slide directly defines a property that would otherwise be inherited, the slide's own value MUST take precedence over the layout's, and the layout's over the master's.
- **FR-008**: If a slide's layout or master part cannot be read (missing/malformed), the affected slide MUST still render whatever it defines directly rather than failing the entire preview, consistent with existing per-slide error handling.
- **FR-009**: The PPTX preview MUST present all slides of a deck in a single continuously scrollable view, in slide order, replacing the current "Next"/"Previous" button pagination.
- **FR-010**: While scrolling the deck, the preview MUST indicate the current slide's position (e.g., "Slide N of M") so the user retains orientation in longer decks.
- **FR-011**: Speaker notes, where present on a slide, MUST remain accessible per-slide within the scrolling view.
- **FR-012**: The PPTX preview MUST remain a read-only preview (no editing) and MUST NOT attempt pixel-faithful rendering beyond what was already scoped out in the original PPTX preview feature — this fix addresses layout-inheritance correctness and navigation, not a rendering-engine rewrite.
- **FR-013**: Scrolling through a large deck MUST NOT block the UI thread or freeze scrolling; off-screen slide rendering may be deferred/virtualized as needed to keep scrolling responsive.

### Key Entities

- **Slide Master**: The top-level template for a presentation's theme (fonts, colors, default placeholder positions) that layouts inherit from.
- **Slide Layout**: An intermediate template, associated with one master, defining a specific placeholder arrangement (e.g., "Title and Content") that individual slides inherit from.
- **Slide**: The actual per-slide content; may override any property inherited from its layout/master, or omit it entirely to inherit unchanged.
- **Placeholder**: A shape on a slide (title, body, etc.) whose position/size/formatting may be defined on the slide itself or inherited from its layout/master.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Clicking either footer link succeeds in opening the correct destination in 100% of manual trials across both distributions (npm/browser and native macOS).
- **SC-002**: A representative sample of real-world `.pptx` decks (built with slide masters/layouts, not just trivial from-scratch slides) render their placeholder text and backgrounds correctly in preview, matching what a standard PowerPoint-compatible viewer shows, for at least 95% of slides in each sample deck.
- **SC-003**: Users can view every slide in an open deck by scrolling alone, with zero required button clicks to advance between slides.
- **SC-004**: Opening and scrolling through a 50-slide deck remains responsive (scrolling does not visibly stall) on a typical development machine.
- **SC-005**: The footer's visual pattern is judged recognizable as "GitHub link + project website link" by a developer unfamiliar with GitLocal, without needing to read link text closely.

## Assumptions

- "Well established / developer centric pattern" is interpreted as: small icon (GitHub mark, globe/site icon) paired with a short label, muted/secondary styling, consistent with footers seen in tools like GitHub CLI docs sites, VS Code's status area, or similar local dev-server UIs — not a literal named design system, since none was specified.
- The footer's existing content (copyright year, version string) is retained; only the link presentation and interaction behavior change.
- "Does not follow the links" is interpreted as primarily a native-macOS-app defect: the embedded browser view has no handler for `target="_blank"`/external navigation, so links silently do nothing there, while they already work in the plain browser (npm) distribution. Both distributions are in scope to confirm/fix.
- Master/layout inheritance resolution is scoped to the properties the existing PPTX preview already attempts to render (positioned text runs, background fill, embedded images) — this fix makes those properties inheritance-aware, it does not add new renderable property types.
- "Endless scroll" means one continuous scrollable list of all slides in order; it does not require lazy/incremental loading of slide data from disk (the whole deck is already parsed up front), only that on-screen rendering stays responsive — virtualization of the rendered DOM is an acceptable implementation choice but not a hard requirement beyond meeting SC-004.
- This ships as a patch release alongside other pending patch-level fixes, consistent with the project's recent release pattern (see `CLAUDE.md` Recent Changes for prior patch releases like 0.13.1, 0.13.0).
- Per-slide notes remain available while scrolling via an equivalent per-slide affordance (e.g., an inline expandable notes section per slide) rather than a single global notes panel, since the previous "current slide" concept no longer exists once slides are all visible at once.
