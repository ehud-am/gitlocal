# GitLocal

GitLocal is a local folder and git repository viewer that opens in your browser. It is built for browsing codebases, reading Markdown, reviewing changes, and making small local edits without needing a full IDE.

Everything runs locally. There are no accounts or telemetry.

## Requirements

- Node.js 22+
- git 2.22+

## Install

```sh
npm install -g gitlocal
```

## Run

Open the current folder or repository:

```sh
gitlocal .
```

Open a specific folder or repository:

```sh
gitlocal ~/projects/my-app
```

Run without installing:

```sh
npx gitlocal
```

GitLocal starts a local server, opens your browser, and prints the local URL. Keep the terminal process open while using the npm version.

## More Documentation

For native macOS app instructions, source builds, development setup, architecture notes, and troubleshooting, see the GitHub README:

https://github.com/ehud-am/gitlocal#readme

## License

MIT
