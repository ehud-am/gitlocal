# Contract: Branch content search and changed-file review — response fixes

No new endpoints and no response *shape* changes are introduced by the bug fixes in this feature. This documents the existing contracts whose *field values* are corrected.

## `GET /api/search` (branch content search)

Unchanged request/response shape:

```ts
interface SearchResult {
  path: string
  line: number
  snippet: string
}
```

**Fix (FR-005..007)**: For a match in a file whose name contains one or more colon characters, `path` MUST equal the file's real repository-relative path (no truncation, no residual treeish prefix), and `line` MUST be the correct 1-based line number (never `null`/omitted due to a parsing failure). Previously, colon characters in the filename could cause `path` to be truncated and `line` to be lost. No other field or case changes.

## `GET /api/changes` (or equivalent changed-file review endpoint)

Unchanged request/response shape:

```ts
interface ChangedFileEntry {
  path: string
  oldPath?: string        // present for renames
  type: 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked'
  canOpen: boolean
}
```

**Fix (FR-008..010)**: For a renamed file whose new and/or old path contains a space, non-ASCII character, or other character Git C-quotes in porcelain output, `path`/`oldPath` MUST be the fully decoded real filename (no surrounding quote characters, no backslash escape sequences remaining), `type` MUST correctly report `'renamed'`, and `canOpen` MUST correctly reflect that the (real, decoded) file exists and can be opened. Previously, the raw quoted string could leak through, `type` could be misreported, and `canOpen` could be incorrectly `false` for a file that does exist. No other field or case changes.

## Backward compatibility

- Both endpoints' response shapes are unchanged; only previously-incorrect field *values* for a narrow set of inputs (colon-containing filenames; quoted rename paths) are corrected.
- Existing correct results (filenames without colons; renames without special characters) are unaffected — covered by existing regression tests plus new targeted tests for the fixed cases.
