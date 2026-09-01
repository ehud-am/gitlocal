# GitLocal

[![npm version](https://img.shields.io/npm/v/gitlocal)](https://www.npmjs.com/package/gitlocal)
[![Website](https://img.shields.io/badge/website-gitlocal.dev-34d67a)](https://gitlocal.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/ehud-am/gitlocal/blob/main/LICENSE)

GitLocal is a local folder and git repository viewer that opens in your browser. It is built for browsing codebases, reading Markdown, reviewing changes, and making small local edits without needing a full IDE.

**Website:** https://gitlocal.dev

Everything runs locally. There are no accounts or telemetry.

## Requirements

- Node.js 22+
- git 2.22+

## Install and run

```sh
npm install -g gitlocal
gitlocal .
```

`gitlocal .` opens the current folder; pass any path (`gitlocal ~/projects/my-app`) to open a different one, or run `gitlocal` with no argument to reopen the last used folder. GitLocal starts a local server, opens your default browser, and prints the local URL — keep that terminal window open while you use it.

Prefer not to install anything first? Run it once with:

```sh
npx gitlocal
```

## What you get

- GitHub-style Markdown rendering, plus built-in PDF and SVG preview — file types GitHub's web UI often can't render inline.
- Local print, Save as PDF, email/share, copy, and download fallback actions on rendered Markdown.
- A Refresh button, focused undo/redo while editing, and panel-scoped Select All.

## More documentation

- Product overview, screenshots, and full feature list: https://gitlocal.dev
- Native macOS app (beta), source builds, development setup, architecture notes, and troubleshooting: https://github.com/ehud-am/gitlocal#readme

## License

MIT
