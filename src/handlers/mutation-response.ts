// Every failed-mutation handler response (file create/update/delete, folder create/delete/etc.)
// is the same shape: a discriminated `ok: false` body JSON-encoded with an HTTP status. This is
// the one shared builder both handlers/file.ts and handlers/folder.ts wrap with their own
// operation-specific field defaults.
export function blockedMutationResponse<T extends { ok: false }>(body: T, status: number): Response {
  return Response.json(body, { status })
}
