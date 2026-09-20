# GitLocal

[![npm version](https://img.shields.io/npm/v/gitlocal)](https://www.npmjs.com/package/gitlocal)
[![Website](https://img.shields.io/badge/website-gitlocal.dev-34d67a)](https://gitlocal.dev)
[![Discussions](https://img.shields.io/badge/discussions-join%20in-8957e5)](https://github.com/ehud-am/gitlocal/discussions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/ehud-am/gitlocal/blob/main/LICENSE)

GitLocal is a local folder and git repository viewer that opens in your browser. It is built for browsing codebases, reading Markdown, reviewing changes, and making small local edits without needing a full IDE.

**Website:** https://gitlocal.dev

**Community:** got an idea, a question, or a rough edge? [Start a discussion](https://github.com/ehud-am/gitlocal/discussions) or [open an issue](https://github.com/ehud-am/gitlocal/issues/new/choose). GitLocal is built in the open, and [your input shapes it](#help-shape-gitlocal).

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

- GitHub-style Markdown rendering, plus built-in preview for PDF, SVG, CSV, Excel (`.xlsx`/`.xls`), and PowerPoint (`.pptx`) files alongside images — file types GitHub's web UI often can't render inline and falls back to a raw download for.
- Local print, Save as PDF, email/share, copy, and download fallback actions on rendered Markdown.
- A Refresh button, focused undo/redo while editing, and panel-scoped Select All.

## Help shape GitLocal

GitLocal is built in the open for people working with AI coding tools, and it gets better when those people tell us what they need. You don't have to write code to take part:

- **Share an idea or a wish** in [Discussions → Ideas](https://github.com/ehud-am/gitlocal/discussions/categories/ideas). Describe the job you're trying to get done, and we'll figure out the rest together.
- **Ask a question or show how you use it** in [Q&A](https://github.com/ehud-am/gitlocal/discussions/categories/q-a) and [Show and tell](https://github.com/ehud-am/gitlocal/discussions/categories/show-and-tell).
- **Report a bug** by [opening an issue](https://github.com/ehud-am/gitlocal/issues/new/choose). Plain language and a screenshot are plenty.
- **Build something.** Browse [`help wanted`](https://github.com/ehud-am/gitlocal/labels/help%20wanted) and [`good first issue`](https://github.com/ehud-am/gitlocal/labels/good%20first%20issue) issues. Using an AI coding tool to write your change is welcome. See [CONTRIBUTING.md](https://github.com/ehud-am/gitlocal/blob/main/CONTRIBUTING.md).

Taking part happens on GitHub and needs a free GitHub account. GitLocal itself still has no accounts and no telemetry.

## More documentation

- Product overview, screenshots, and full feature list: https://gitlocal.dev
- Native macOS app (beta), source builds, development setup, architecture notes, and troubleshooting: https://github.com/ehud-am/gitlocal#readme

## License

MIT
