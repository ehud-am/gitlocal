# Research: Accurate Version Display and Code Line Numbers

## Decision 1: Keep the footer version tied to a single server-provided runtime source

- **Decision**: Continue using the existing server-provided app version as the only footer version source, and remove UI-side hardcoded fallback values that can drift from the actual release.
- **Rationale**: `src/git/repo.ts` already reads the package version once and exposes it through repository info. The bug is therefore not a missing source but a presentation path that still contains static version literals. Keeping one metadata source avoids version skew between server, UI, and tests.
- **Alternatives considered**:
  - Read `package.json` separately in the UI build: rejected because it would introduce a second version source and risk build/runtime mismatch.
  - Hardcode the version in footer components: rejected because it recreates the same drift problem the feature is meant to fix.

## Decision 2: Apply line numbers through the existing code-oriented rendering surfaces only

- **Decision**: Add line numbering in the existing code viewer treatment used for syntax-highlighted and raw code presentations, while leaving non-code content surfaces unchanged.
- **Rationale**: The feature request is about code presentation, not all text rendering. Constraining numbering to code-oriented surfaces preserves readability, avoids clutter in prose-heavy markdown, and fits the current viewer model.
- **Alternatives considered**:
  - Add line numbers to every text-like content panel: rejected because it would add unnecessary UI to non-code content.
  - Introduce a separate code-rendering component tree for numbered content: rejected because the existing content-panel layer already centralizes code presentation and can be extended more safely.

## Decision 3: Use a visual gutter that stays aligned with displayed lines

- **Decision**: Render line numbers as a dedicated left gutter within the code surface so numbering stays visually associated with the code as users scroll or scan.
- **Rationale**: A gutter-style treatment best matches the user's request and standard source-reading expectations. It also allows the code body to remain copyable and highlighted without embedding numbers into the copied text itself.
- **Alternatives considered**:
  - Prefix numbers into the rendered text stream: rejected because it would contaminate copied content and interfere with syntax formatting.
  - Overlay numbers outside the code surface: rejected because alignment would be more fragile and visually disconnected.
