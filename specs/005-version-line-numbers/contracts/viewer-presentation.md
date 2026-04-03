# Viewer Presentation Contract

## Running Version Display

- The application footer receives a single resolved version string for the currently running build.
- The footer displays that string in `v{version}` format.
- Repository view and picker view must use the same resolved version source.
- Placeholder display such as `v0.0.0` is only acceptable when the running build itself truly resolves to that version, not as a UI fallback.

## Numbered Code Presentation

- Code-oriented content surfaces render a left-side line number gutter.
- The gutter numbers begin at `1` for the opened file content and increment sequentially by visible line.
- The gutter remains visually aligned with the displayed code lines during reading and scrolling.
- Line numbers are presentation-only and must not be merged into copied code content.
- Non-code content surfaces do not show the line number gutter.
