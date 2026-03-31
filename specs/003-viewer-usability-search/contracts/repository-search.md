# Repository Search Contract: Viewer Usability and Search

## Purpose

Defines the search behaviors, result expectations, and matching controls for repository path and content search.

## Search Modes

- **Name search** returns matching folder names and file names within the open repository.
- **Content search** returns files whose contents match the current query, along with enough surrounding context to explain each match.

## Matching Controls

- The interface exposes the active search mode clearly.
- The interface exposes at least two matching options: case-insensitive and case-sensitive.
- Changing the search mode or matching option reruns the current search against the same query.

## Result Contract

- Every result must support direct navigation to the matched repository location.
- Name-search results must identify whether the match is a file or a folder.
- Content-search results must identify the file path and provide a readable snippet or match summary.
- Empty results must render a clear no-match state without resetting the current repository view.
- Result presentation must stay understandable when the result set is large.

## Backend Interface Expectations

- The backend provides a search endpoint that accepts repository-relative search input, active branch context, search mode, and matching options.
- The backend validates unsupported or malformed search requests and returns a clear error response.
- The backend does not depend on remote indexing services or external search infrastructure.

## Non-Goals

- This contract does not require regular-expression search in the first iteration.
- This contract does not require cross-repository search.
