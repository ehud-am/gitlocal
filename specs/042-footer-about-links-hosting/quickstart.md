# Quickstart: Footer/About Links & Cloudflare Hosting Migration

## Prerequisites

- Repo checked out on branch `042-footer-about-links-hosting`
- Node.js 22+, npm dependencies installed (`npm install`)
- For the macOS About-box check: Xcode installed, able to build `native/macos/GitLocal`

## User Story 1 — Web footer links

1. Run the app in dev mode (see project README/`npm run dev` equivalent) or `npm run build && npm start`.
2. Open the app in a browser and scroll/look at the footer.
3. **Expected**: footer shows a link to `https://gitlocal.dev` and a link to
   `https://github.com/ehud-am/gitlocal`, each opening in a new tab, plus the existing
   year/version display unchanged.
4. Run `npm test` (or the `ui` package's test command) and confirm `AppFooter`'s tests pass,
   including the new assertion covering the `gitlocal.dev` link.

## User Story 2 — macOS About box links

1. Build and launch the native macOS app (`native/macos/GitLocal`).
2. Open the app menu → "About GitLocal".
3. **Expected**: the panel shows the app name/version/icon as before, plus clickable text
   linking to `gitlocal.dev` and to the `ehud-am/gitlocal` GitHub project; clicking either
   opens the default browser to the correct destination.
4. No automated test suite covers this Swift menu wiring today; verification here is manual,
   consistent with the rest of `AppDelegate.swift`.

## User Story 3 — Cloudflare hosting migration (verification only)

This story's actual migration steps are delivered as conversation-only guidance (see
`plan.md`'s Constitution Check, Principle VII exception, and `research.md`'s "Cloudflare
hosting migration scope in repo artifacts" decision) and are intentionally **not** documented
here or in any other committed file, to avoid leaking account-specific infrastructure details
into the public repository. This checklist is the account-agnostic acceptance check to run
after following that guidance:

1. `https://gitlocal.dev` resolves and serves the site over valid HTTPS with no certificate
   warnings.
2. `https://www.gitlocal.dev` resolves and serves the same site over valid HTTPS with no
   certificate warnings.
3. Content served at both hostnames matches the content currently in `docs/` (the GitHub
   Pages source) at the time of cutover.
4. The GitHub Pages native URL (the project's default `github.io` URL) still serves the same
   site, unaffected by the DNS/custom-domain changes made for `gitlocal.dev`/`www.gitlocal.dev`.
5. No new files were added to this repository containing Cloudflare account identifiers, API
   tokens, zone IDs, or nameserver assignments (`git diff`/`git status` show no such additions).
