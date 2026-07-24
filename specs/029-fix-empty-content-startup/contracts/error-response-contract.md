# Contract: API Error Response Envelope

**Applies to**: every route registered in `src/server.ts` (`/api/*`), via a single global `app.onError` handler.
**Consumed by**: `ui/src/services/api.ts`'s `request<T>()` helper and every hook built on top of it.

## Problem this contract fixes

Today, an unhandled exception in any route handler (e.g., `readdirSync`/`realpathSync` throwing on the non-git folder path) falls through to Hono's default error response: a plain-text 500 with no machine-readable structure. `request<T>()` tries `res.json()`, fails, and produces a generic `{error: res.statusText, code:'UNKNOWN'}` — the real cause (permission denied vs. not found vs. transient I/O error) never reaches the UI, so the UI cannot show a plain-language explanation (FR-001, FR-002, FR-005).

## Response shape

On any unhandled server-side exception, the response body MUST be JSON matching:

```ts
interface ApiErrorBody {
  error: string      // human-readable summary, safe to show a non-technical user
  code: string        // stable machine-readable category, one of the values below
}
```

**Status code**: 500 for genuinely unexpected/internal failures. Handlers that already produce a deliberate 4xx (e.g., validation errors) are unaffected by this contract — it only governs the *unhandled* exception path.

**`code` values** (extend as needed, but at minimum distinguish):
- `NOT_FOUND` — the requested filesystem path does not exist
- `PERMISSION_DENIED` — the OS denied read access
- `UNAVAILABLE` — path existed but became unreachable (e.g., unmounted volume) at the moment of the operation
- `UNKNOWN` — genuinely unclassified internal error (fallback only, not the default for known failure modes)

## Client contract

`ui/src/services/api.ts`'s `request<T>()` MUST surface `error` and `code` from a well-formed `ApiErrorBody` to the calling query's thrown error, so that `useQuery`'s `isError` state carries enough information for the UI to render FR-001/FR-002/FR-004/FR-005-compliant messaging (e.g., "Permission denied" vs. "Not found" vs. a generic fallback only when `code` is `UNKNOWN`).

## Non-goals

- This contract does not change the response shape for handlers that already return a structured, deliberate error today (e.g., `StartupFolderUpdateResponse.ok === false`) — those are unaffected.
- This contract does not add authentication, rate limiting, or any cross-cutting concern beyond structured error propagation.
