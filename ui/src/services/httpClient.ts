export async function getJson<T>(url: string, buildFallback: (res: Response) => unknown): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.json().catch(() => buildFallback(res))
    throw err
  }
  return res.json() as Promise<T>
}
