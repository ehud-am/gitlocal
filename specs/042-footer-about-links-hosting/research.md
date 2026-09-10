# Phase 0 Research: Footer/About Links & Cloudflare Hosting Migration

## Decision: Web footer link implementation

**Decision**: Add a second `<a>` element to `AppFooter.tsx`, styled with the same
`app-footer-link` class as the existing GitHub link, pointing to `https://gitlocal.dev`,
labeled distinctly (e.g. "gitlocal.dev") from the existing "GitLocal" (GitHub) link so the
two are not confused, both using `target="_blank" rel="noreferrer"`.

**Rationale**: The footer already establishes the pattern (external link, new tab, `noreferrer`)
for the GitHub link — reusing it exactly keeps the two links visually and behaviorally consistent
and requires no new CSS or component.

**Alternatives considered**:
- A single combined "GitLocal · gitlocal.dev" link merging both destinations — rejected because
  the spec requires two independently reachable destinations (FR-001/FR-002), and a merged link
  can only point to one URL.
- Icon-only links (GitHub mark + globe icon) — rejected as unnecessary visual complexity for a
  two-item text footer; out of scope per Constitution Principle V (minimal, content-focused).

## Decision: macOS About-box link implementation

**Decision**: Keep using AppKit's standard about panel (`orderFrontStandardAboutPanel(_:)`) but
pass it an explicit options dictionary containing an `NSApplication.AboutPanelOptionKey.credits`
value: an `NSAttributedString` with two lines of link text ("gitlocal.dev" → `https://gitlocal.dev`,
"GitHub: ehud-am/gitlocal" → `https://github.com/ehud-am/gitlocal`), each carrying an
`.link` attribute. The standard about panel renders `credits` as a scrollable, clickable
rich-text area below the app name/version/icon, and AppKit opens `.link`-attributed ranges in
the default browser automatically — no manual `NSWorkspace.open` handling or custom window is
required.

**Rationale**: This is the smallest change that satisfies FR-003/FR-004/FR-005 (links plus
unchanged app identity) without introducing a fully custom About window, keeping the macOS
wrapper "thin" per Constitution Principle I. It reuses an existing AppKit affordance rather than
adding new UI surface.

**Alternatives considered**:
- Building a custom About `NSWindow`/SwiftUI view with buttons — rejected as unnecessary
  complexity for two static links; conflicts with "thin wrapper" intent in Principle I and
  "minimal" design intent in Principle V.
- Adding the links as separate, always-visible menu items near "About GitLocal" instead of
  inside the panel — rejected because the spec (User Story 2) expects the links to live in the
  About box itself, matching standard macOS app conventions where About boxes commonly show a
  website/support link.

## Decision: Cloudflare hosting migration scope in repo artifacts

**Decision**: No file committed to the repository (spec, plan, research, quickstart, tasks, or
any new doc) will contain Cloudflare account identifiers, API tokens, zone IDs, nameserver
assignments, or other account-specific configuration. The actual step-by-step migration runbook
is delivered directly in conversation when requested (e.g., during `/speckit-tasks` execution or
a follow-up question), never as a repo file. `quickstart.md` (Phase 1) contains only a
generic, account-agnostic verification checklist (DNS resolves, HTTPS valid, content matches,
GitHub Pages native URL still serves) that carries no information-leak risk if committed.

**Rationale**: Explicit user instruction for this planning pass: personal information, security
tokens, secrets, and API keys must never be saved to the git repo, and the Cloudflare deployment
instructions must be conversation-only with no code traces reaching the public remote. This is
consistent with Constitution Principle VII's existing intent around not leaking
contributor/owner-specific local details into committed artifacts, extended here explicitly to
account-level infrastructure secrets.

**Alternatives considered**:
- Writing the full runbook into `specs/042-footer-about-links-hosting/quickstart.md` or a new
  `docs/hosting-migration.md` — rejected outright per explicit user instruction; this is a
  public repository and any such file would leak operational/security-adjacent detail about the
  owner's infrastructure to anyone who clones or browses the repo.
- Writing a redacted/templated version of the runbook (placeholders instead of real values) to
  the repo — considered acceptable as a *general Cloudflare setup guide* in principle, but
  explicitly out of scope for this feature since the user asked for conversation-only delivery;
  not produced here to honor that instruction precisely.

## Decision: Test coverage approach for the footer change

**Decision**: Add or extend a component test asserting `AppFooter` renders an anchor with
`href="https://gitlocal.dev"` and that the existing GitHub anchor's href/behavior is unchanged,
using the project's existing Vitest + React Testing Library setup.

**Rationale**: Constitution Principle II requires ≥90% per-file branch coverage; a component
with a conditional render (`normalizedVersion ? ... : null`) already needs coverage of both
branches, and adding a second static link doesn't introduce new branches — but a rendering
assertion for the new link is still needed so the feature itself is verified, not just coverage
percentage maintained.

**Alternatives considered**: Relying solely on manual/visual verification — rejected; the project
enforces automated coverage gates and existing tests already cover `AppFooter`, so skipping a
test here would be inconsistent with existing practice in this codebase.

## Outstanding NEEDS CLARIFICATION

None. All Technical Context fields in `plan.md` are resolved.
