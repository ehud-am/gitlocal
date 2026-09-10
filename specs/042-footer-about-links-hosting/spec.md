# Feature Specification: Footer/About Links & Cloudflare Hosting Migration

**Feature Branch**: `042-footer-about-links-hosting`
**Created**: 2026-09-09
**Status**: Draft
**Input**: User description: "few minor changes into a next patch release. 1. change the footer to include a link to gitlocal.dev and a link to the github project. 2. add the same links to the about box in the mac native app (both the web site at gitlocal.dev and the github project at ehud-am/gitlocal. 3. let's do a hosting change for the web site - i want to keep the github pages with the github native url, and also host the same web page in my cloudflare and move the gitlocal.dev and www.gitlocal.dev to the cloudflare hosted version. I will need detailed instructions on how to do that."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover the project website and source from the app footer (Priority: P1)

A person browsing a repository or Markdown file in GitLocal (npm/browser distribution) notices the footer and wants to learn more about GitLocal or check the source code. They can click a link to the public website (gitlocal.dev) and a separate link to the GitHub project, each opening in a new browser tab.

**Why this priority**: The footer is the only persistent, always-visible branding surface in the web UI. Today it links only to the GitHub project; without a website link, users have no easy path from the running app to gitlocal.dev's marketing/FAQ content. This is the smallest, highest-visibility change in the release.

**Independent Test**: Load the app in a browser, look at the footer, and confirm both a "gitlocal.dev" (or equivalent label) link and a GitHub project link are present, each opening the correct destination in a new tab without navigating away from the app.

**Acceptance Scenarios**:

1. **Given** the app is loaded in a browser, **When** the user looks at the footer, **Then** they see a link labeled to identify gitlocal.dev and a separate link labeled to identify the GitHub project (`ehud-am/gitlocal`).
2. **Given** the footer is visible, **When** the user clicks the gitlocal.dev link, **Then** a new browser tab opens to `https://gitlocal.dev` and the GitLocal app tab remains unchanged.
3. **Given** the footer is visible, **When** the user clicks the GitHub project link, **Then** a new browser tab opens to `https://github.com/ehud-am/gitlocal` and the GitLocal app tab remains unchanged.

---

### User Story 2 - Discover the project website and source from the macOS app's About box (Priority: P2)

A person using the native macOS GitLocal app opens "About GitLocal" from the app menu (as they would for any Mac app) and wants the same way to reach the website and source repository that the web footer offers.

**Why this priority**: This mirrors User Story 1 for the second distribution channel so both surfaces stay consistent, but it depends on the macOS-specific About presentation and is lower-traffic than the always-visible web footer.

**Independent Test**: Launch the native macOS app, open "About GitLocal" from the app menu, and confirm the same two links (gitlocal.dev, GitHub project) are present and open correctly.

**Acceptance Scenarios**:

1. **Given** the native macOS app is running, **When** the user opens the app menu and selects "About GitLocal", **Then** the About box shows a link to `https://gitlocal.dev` and a link to `https://github.com/ehud-am/gitlocal`, alongside the existing app name/version/icon.
2. **Given** the About box is open, **When** the user clicks the website link, **Then** their default browser opens to `https://gitlocal.dev`.
3. **Given** the About box is open, **When** the user clicks the GitHub project link, **Then** their default browser opens to `https://github.com/ehud-am/gitlocal`.

---

### User Story 3 - Move the public website to Cloudflare while keeping the GitHub Pages URL alive (Priority: P3)

The project owner wants `gitlocal.dev` and `www.gitlocal.dev` to be served from Cloudflare (their own hosting) instead of GitHub Pages, while the existing GitHub Pages native URL (e.g., `ehud-am.github.io/gitlocal`) continues to serve the identical site as a secondary, always-available mirror. This is an operational/infrastructure change, not an app code change, so the deliverable is a precise, step-by-step runbook the owner can execute themselves.

**Why this priority**: This is a one-time hosting/DNS migration independent of app behavior. It carries real risk (site downtime, broken custom domain, lost HTTPS) if done incorrectly, so it is scoped as documentation/instructions rather than an automated change, and is sequenced last since it doesn't block or depend on the two link changes above.

**Independent Test**: Follow the produced runbook against the actual GitHub Pages repository and Cloudflare account; confirm `gitlocal.dev` and `www.gitlocal.dev` resolve to the Cloudflare-hosted copy of the site over HTTPS, and the GitHub Pages native URL still serves the same site content, with no broken links or certificate warnings at any point.

**Acceptance Scenarios**:

1. **Given** the current setup (GitHub Pages serving the site at both the GitHub native URL and the custom domains `gitlocal.dev`/`www.gitlocal.dev`), **When** the owner follows the runbook, **Then** the GitHub Pages native URL keeps serving the site unchanged throughout and after the migration.
2. **Given** the runbook has been fully executed, **When** a visitor requests `https://gitlocal.dev` or `https://www.gitlocal.dev`, **Then** they receive the site served from Cloudflare over valid HTTPS, with content identical to what GitHub Pages serves.
3. **Given** the migration is complete, **When** the owner (or anyone) checks DNS records for `gitlocal.dev`, **Then** the records point at the Cloudflare-hosted destination rather than GitHub Pages' IPs/CNAME, and the previous GitHub Pages custom-domain configuration for those two hostnames has been cleanly removed to avoid conflicting ownership/verification records.
4. **Given** the runbook, **When** the owner reaches a step that requires an irreversible or externally-visible action (e.g., changing DNS at the registrar, removing the custom domain from GitHub Pages settings), **Then** the runbook calls out that this is the point of no return / where a mistake causes visitor-facing downtime, and what to verify before proceeding.

### Edge Cases

- What happens if the Cloudflare-hosted copy of the site drifts out of sync with the GitHub Pages copy after this migration (e.g., someone updates one but not the other)? The runbook must state how the two copies are kept in sync going forward, or explicitly document that keeping them in sync is the owner's manual responsibility going forward.
- What happens during the DNS cutover window when some visitors' resolvers still have the old GitHub Pages records cached (TTL expiry)? The runbook should address expected propagation delay and how to verify success safely before removing the old configuration.
- What happens if the About box's website/GitHub links are clicked while the machine has no network connection? The browser/OS handles the failed navigation the same way it would for any broken link; no special in-app error handling is required.
- What happens to the footer/About links when the app is used fully offline (npm distribution with no internet, or macOS app with no internet)? Links remain visible and clickable; they simply fail to load in the browser, which is expected and requires no special handling.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The web app footer MUST display a link to `https://gitlocal.dev`, opening in a new browser tab/window, distinguishable from the existing GitHub project link.
- **FR-002**: The web app footer MUST continue to provide a link to the GitHub project at `https://github.com/ehud-am/gitlocal`, opening in a new browser tab/window.
- **FR-003**: The macOS native app's About box MUST present a link to `https://gitlocal.dev` that opens in the user's default browser.
- **FR-004**: The macOS native app's About box MUST present a link to `https://github.com/ehud-am/gitlocal` that opens in the user's default browser.
- **FR-005**: The About box MUST continue to show the existing app identity information (name, version, icon) alongside the two new links.
- **FR-006**: The project MUST produce a written, step-by-step runbook for migrating `gitlocal.dev` and `www.gitlocal.dev` from GitHub Pages to a Cloudflare-hosted copy of the same site, while leaving the GitHub Pages native URL serving the site unchanged.
- **FR-007**: The runbook MUST cover, at minimum: publishing/hosting the site content on Cloudflare, the DNS record changes required at the domain registrar/DNS provider for both the apex domain (`gitlocal.dev`) and the `www` subdomain, HTTPS/certificate handling on the Cloudflare side, removing the now-conflicting custom-domain configuration from the GitHub Pages side for those two hostnames, and a verification checklist to run before and after cutover.
- **FR-008**: The runbook MUST explicitly flag which steps are destructive or hard to reverse (DNS changes, removing GitHub Pages' custom domain config) and what to check before performing them.
- **FR-009**: The runbook MUST NOT require any changes to application code; it is operational documentation only.

### Key Entities

- **Footer link**: A user-facing hyperlink in the web app footer; has a destination URL and a visible label, opens in a new tab.
- **About box link**: A user-facing hyperlink in the native macOS About panel; has a destination URL and a visible label, opens in the default browser.
- **Hosting runbook**: A documentation artifact (ordered steps, prerequisites, verification checks, rollback notes) describing the GitHub Pages → Cloudflare hosting migration for the two custom domains.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user viewing the app footer can identify and reach both the gitlocal.dev website and the GitHub project within one click each, 100% of the time the footer is visible.
- **SC-002**: A user opening "About GitLocal" on macOS can identify and reach both the gitlocal.dev website and the GitHub project within one click each, 100% of the time the About box is shown.
- **SC-003**: The next patch release ships both link changes with zero regressions to existing footer/About functionality (version display, app identity, existing GitHub link behavior).
- **SC-004**: Following the hosting runbook, `gitlocal.dev` and `www.gitlocal.dev` serve the site from Cloudflare with valid HTTPS and zero visitor-facing downtime, while the GitHub Pages native URL continues to serve the same site without interruption at any point during the migration.

## Assumptions

- "The github project" refers to `https://github.com/ehud-am/gitlocal`, matching the link already present in the web footer today and the project's own repository.
- "gitlocal.dev" refers to `https://gitlocal.dev`; the footer/About links use the apex domain rather than the `www` subdomain (both will resolve to the same Cloudflare-hosted site after the migration in User Story 3).
- The GitHub Pages "native URL" means the default `github.io` URL GitHub Pages provides for this repository, independent of any custom domain configuration.
- The Cloudflare-hosted copy of the site is a duplicate of the same static site currently published via GitHub Pages (per `gitlocal.dev`'s existing site under `CLAUDE.md`'s 0.11.0 entry), not a redesign; keeping content in sync between the two hosting locations going forward is the owner's operational responsibility, called out explicitly in the runbook.
- Links open in a new tab/window (web) or the OS default browser (macOS About box) rather than navigating within the app, consistent with the existing footer GitHub link's behavior.
- This is scoped as a patch release: no other footer/About/UI changes are in scope beyond adding these links.
