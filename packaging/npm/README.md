# GitLocal

[![npm version](https://img.shields.io/npm/v/gitlocal)](https://www.npmjs.com/package/gitlocal)
[![Website](https://img.shields.io/badge/website-gitlocal.dev-34d67a)](https://gitlocal.dev)
[![Discussions](https://img.shields.io/badge/discussions-join%20in-8957e5)](https://github.com/ehud-am/gitlocal/discussions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/ehud-am/gitlocal/blob/main/LICENSE)

GitLocal is a local viewer for git repositories that hold both code and documents. It is built for product managers and other builders who keep code, specs, slide decks, Word documents, spreadsheets, PDFs, and images in one repository, instead of splitting them across GitHub, Google Docs, and Atlassian tools.

GitLocal opens in your browser and shows every file in place: browse, read Markdown, preview Office files and PDFs, review what changed, and make small edits, without a full IDE.

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

- A GitHub-like file tree and folder view for any local folder or git repository, with a changed-files review panel and repository search.
- Several files open at once in editor-style tabs, with a folder tab that takes you back to the GitHub-like folder view.
- Built-in preview for Word (`.docx`), Excel (`.xlsx`/`.xls`), PowerPoint (`.pptx`), PDF, CSV, SVG, and HTML files, plus GitHub-style Markdown, JSON, and images. GitHub's web UI often can't render these file types inline and offers only a raw download.
- Local print, Save as PDF, email/share, copy, and download fallback actions on rendered Markdown.
- Small edits with conflict protection, and an integrated terminal for running an AI coding agent.

## Help shape GitLocal

GitLocal is built in the open for product managers and builders who keep their work in git, and it gets better when those people tell us what they need. You don't have to write code to take part:

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

<!-- readme-pixel:start -->
<!-- readme-pixel:end -->
