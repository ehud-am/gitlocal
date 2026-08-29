# Quickstart: File Preview Framework

## Verify PDF preview

1. `npm run dev` (or the project's existing dev script) and open a repo containing a `.pdf` file (or copy any small PDF into a test repo).
2. Select the `.pdf` file in the file tree.
3. Expected: the content panel renders the PDF's first page inline (not the "Binary file — preview not available" message). Scroll to see additional pages if the file has more than one.
4. Open browser DevTools → Network tab, confirm no request is made to any PDF.js CDN or external host while the file is open (only the local `/api/file` request) — confirms the worker is bundled locally (Principle III / research.md §1).

## Verify SVG preview

1. Select a `.svg` file in the file tree.
2. Expected: renders as a scaled graphic, not distorted, not the old generic-image treatment.
3. Use the existing raw/pretty toggle control (same one used on Markdown/JSON files) → confirm the raw XML source appears with syntax highlighting.
4. Toggle back to rendered view.
5. Security check: open/create an `.svg` file containing `<script>alert(1)</script>` — expected: no alert fires, graphic still renders (or falls back cleanly if the file is otherwise malformed).

## Verify zero regression on existing types

1. Open a `.md` file → pretty/raw toggle, edit-in-place, relative links, heading anchors, and find-highlighting all behave as before.
2. Open a `.json` file → pretty tree/raw toggle/edit-in-place behave as before.
3. Open a `.png`/`.jpg` file → renders exactly as before.
4. Open a `.ts`/`.py`/etc. code file → syntax-highlighted `CodeViewer` as before.
5. Open a genuinely unsupported binary (e.g. `.zip`) → "Binary file — preview not available" fallback, unchanged.

## Run automated checks

```sh
npm test       # full suite incl. new PdfViewer/SvgViewer/preview-registry tests; existing suites must pass unmodified
npm run lint   # tsc --noEmit
npm run build  # server + UI bundle, confirms pdfjs-dist worker asset resolves at build time
```
