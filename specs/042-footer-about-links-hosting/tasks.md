---

description: "Task list for footer/About links & Cloudflare hosting migration"
---

# Tasks: Footer/About Links & Cloudflare Hosting Migration

**Input**: Design documents from `specs/042-footer-about-links-hosting/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: Test tasks are included for User Story 1 (web footer) because the codebase already
enforces ≥90% per-file branch coverage (Constitution Principle II) and the file being touched
(`AppFooter.tsx`) has existing test conventions to extend. User Story 2 (macOS About box) has no
automated test task, matching existing practice for `AppDelegate.swift` menu/about wiring
(manual verification only, per plan.md's Technical Context). User Story 3 (Cloudflare hosting
migration) has no code and produces no repository test — it is a manual operational activity;
its tasks are the conversation-only migration step and the verification checklist.

**Organization**: Tasks are grouped by user story to enable independent implementation and
testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths are included in each task description

## Path Conventions

Existing single-repo layout: `ui/src/` (React frontend), `native/macos/GitLocal/GitLocal/`
(Swift wrapper), `docs/` (existing GitHub Pages site source, referenced but not modified).

---

## Phase 1: Setup

No setup tasks are required. This feature touches two existing files
(`ui/src/components/AppFooter.tsx`, `native/macos/GitLocal/GitLocal/AppDelegate.swift`) plus one
manual operational activity; there is no new project scaffolding, dependency, or tooling to
initialize.

---

## Phase 2: Foundational

No foundational/blocking prerequisites exist. Each user story below is independent of the
others and can be implemented and verified on its own, in any order.

**Checkpoint**: Skip directly to user story phases — nothing blocks them.

---

## Phase 3: User Story 1 - Web footer links (Priority: P1) 🎯 MVP

**Goal**: The web app footer shows a link to `https://gitlocal.dev` in addition to the existing
GitHub project link, both opening in a new tab.

**Independent Test**: Load the app in a browser, confirm both links render in the footer with
correct hrefs/labels, and confirm `AppFooter`'s test suite passes.

### Tests for User Story 1 ⚠️

> Write this test FIRST, ensure it FAILS before implementation

- [X] T001 [P] [US1] Create `ui/src/components/AppFooter.test.tsx` asserting: (a) an anchor with
      `href="https://gitlocal.dev"` and `target="_blank"`/`rel="noreferrer"` renders and is
      labeled distinctly from the GitHub link (e.g. text content "gitlocal.dev"); (b) the
      existing anchor with `href="https://github.com/ehud-am/gitlocal"` still renders labeled
      "GitLocal" with `target="_blank"`/`rel="noreferrer"` unchanged; (c) the year and
      `v{version}` text still render as before (both when `version` is set and when empty, to
      preserve existing conditional-render coverage)

### Implementation for User Story 1

- [X] T002 [US1] In `ui/src/components/AppFooter.tsx`, add a second `<a>` element (before or
      after the existing GitHub link, inside the `<footer>`) linking to `https://gitlocal.dev`,
      using the existing `app-footer-link` class, `target="_blank"`, `rel="noreferrer"`, and
      text content "gitlocal.dev"; keep the existing GitHub `<a>` element and all other footer
      content (year, version) unchanged (depends on T001 existing as a failing test first)
- [X] T003 [US1] Run `ui`'s test suite (e.g. `npm test` from `ui/` or the repo's configured
      command) and confirm `AppFooter.test.tsx` passes and per-file branch coverage for
      `ui/src/components/AppFooter.tsx` remains ≥90%

**Checkpoint**: User Story 1 is fully functional and testable independently — the web footer
change can ship on its own.

---

## Phase 4: User Story 2 - macOS About box links (Priority: P2)

**Goal**: The native macOS app's "About GitLocal" panel shows clickable links to
`https://gitlocal.dev` and `https://github.com/ehud-am/gitlocal`, alongside the existing app
name/version/icon.

**Independent Test**: Build and launch the native macOS app, open "About GitLocal" from the app
menu, and confirm both links are visible and open the correct destination in the default browser.

### Implementation for User Story 2

- [X] T004 [US2] In `native/macos/GitLocal/GitLocal/AppDelegate.swift`, replace the bare
      `#selector(NSApplication.orderFrontStandardAboutPanel(_:))` wiring on the "About GitLocal"
      menu item's action with a small handler method (e.g. `showAbout(_:)` on `AppDelegate`)
      that calls `NSApplication.shared.orderFrontStandardAboutPanel(options:)` passing an
      `NSApplication.AboutPanelOptionKey.credits` value built from an `NSAttributedString`
      containing two link-attributed lines: "gitlocal.dev" → `https://gitlocal.dev` and
      "GitHub: ehud-am/gitlocal" → `https://github.com/ehud-am/gitlocal`; update the menu item's
      `action`/`target` to invoke this new handler instead of the bare selector
- [ ] T005 [US2] Build `native/macos/GitLocal` and manually verify per `quickstart.md`'s "User
      Story 2" section: About panel opens, shows app name/version/icon unchanged, both new links
      render as clickable text, and each opens the correct URL in the default browser

**Checkpoint**: User Story 2 is fully functional and testable independently — the macOS About
box change can ship on its own, alongside or separately from User Story 1.

---

## Phase 5: User Story 3 - Cloudflare hosting migration (Priority: P3)

**Goal**: `gitlocal.dev` and `www.gitlocal.dev` are served from a Cloudflare-hosted copy of the
existing `docs/` site, while the GitHub Pages native URL keeps serving the same site unchanged.

**Independent Test**: Follow the migration guidance, then confirm every item in
`quickstart.md`'s "User Story 3" checklist.

**IMPORTANT**: Per explicit user instruction, the actual step-by-step Cloudflare deployment/DNS
instructions MUST be delivered as a conversation-only response and MUST NOT be written into any
file in this repository (see `plan.md` Constitution Check, Principle VII exception, and
`research.md`'s corresponding decision). No task below writes such a file.

### Implementation for User Story 3

- [X] T006 [US3] Request the Cloudflare hosting migration runbook in conversation (not as a
      repo file) covering: publishing the `docs/` site content to Cloudflare Pages (or
      equivalent Cloudflare static hosting), the DNS record changes needed at the domain
      registrar/DNS provider for both `gitlocal.dev` and `www.gitlocal.dev`, HTTPS/certificate
      handling on Cloudflare, and removal of the now-conflicting custom-domain configuration on
      the GitHub Pages side for those two hostnames — receive and follow this guidance entirely
      outside of any file committed to git
- [ ] T007 [US3] Execute the received runbook against the real GitHub Pages repository settings
      and the owner's Cloudflare account (manual operational step, outside this repository)
- [ ] T008 [US3] Verify the migration using `specs/042-footer-about-links-hosting/quickstart.md`'s
      "User Story 3" checklist (HTTPS validity on both hostnames, content parity with `docs/`,
      GitHub Pages native URL still serving, and confirmation that no Cloudflare account
      identifiers/tokens/zone IDs were added to any tracked file via `git status`/`git diff`)

**Checkpoint**: All three user stories are independently functional. The hosting migration can
be performed at any time relative to User Story 1/2 — it has no code dependency on either.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T009 [P] Update `CHANGELOG.md` and `CLAUDE.md`'s "Recent Changes" section to record the
      footer/About-box link additions (User Story 1 and 2) for the next patch release, following
      the existing entry format used by prior features (e.g. `specs/041-simplify-startup-logic`'s
      entry) — do NOT mention any Cloudflare account-specific detail; a one-line, account-agnostic
      note that the public site began mirroring to Cloudflare is acceptable if desired, but is
      optional and must contain no secrets/identifiers
- [X] T010 Run `npm run lint` and `npm test` (full suite) from the repo root to confirm no
      regressions were introduced by T002/T004
- [ ] T011 Run `specs/042-footer-about-links-hosting/quickstart.md` end-to-end (all three User
      Story sections) as a final pre-release sanity check

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: None — empty phase
- **Foundational (Phase 2)**: None — empty phase
- **User Stories (Phase 3-5)**: No dependency on Setup/Foundational content (both are empty); no
  dependency on each other — all three can proceed in any order or in parallel
- **Polish (Phase 6)**: Depends on whichever of User Story 1/2 were completed (T009-T010); T011
  depends on all three stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies on US2 or US3
- **User Story 2 (P2)**: No dependencies on US1 or US3
- **User Story 3 (P3)**: No dependencies on US1 or US2 (different files/systems entirely — web
  UI, native Swift, and public static site hosting are unrelated surfaces)

### Within Each User Story

- US1: T001 (failing test) before T002 (implementation) before T003 (verify passing + coverage)
- US2: T004 (implementation) before T005 (manual verification)
- US3: T006 (obtain runbook) before T007 (execute) before T008 (verify)

### Parallel Opportunities

- T001 [US1] and T004 [US2] touch different files/languages and can be done in parallel
- T006-T008 [US3] can be run in parallel with either US1 or US2's work, since they involve no
  shared files
- T009 [P] in Polish can start as soon as its relevant user stories are done, in parallel with
  T010's lint/test run

---

## Parallel Example: Cross-story

```bash
# Once picked up, these can run in parallel by different contributors:
Task: "T001 [US1] Create ui/src/components/AppFooter.test.tsx"
Task: "T004 [US2] Update native/macos/GitLocal/GitLocal/AppDelegate.swift About wiring"
Task: "T006 [US3] Request Cloudflare migration runbook in conversation"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3 (T001-T003)
2. **STOP and VALIDATE**: Confirm the footer link works and tests pass
3. Ship as part of the next patch release; User Story 2 and 3 can follow independently

### Incremental Delivery

1. User Story 1 (web footer) → validate → ready to release
2. User Story 2 (macOS About box) → validate → ready to release
3. User Story 3 (Cloudflare migration) → validate via quickstart checklist → operational cutover
   complete
4. Each story ships value independently; none blocks another

---

## Notes

- [P] tasks touch different files with no dependencies on incomplete tasks
- User Story 3 intentionally has no file-producing task beyond the Polish-phase changelog note —
  this is by design per the explicit "conversation-only, no repo trace" instruction, not an
  omission
- Commit after each completed task or logical group
- Stop at any checkpoint to validate a story independently before moving on
