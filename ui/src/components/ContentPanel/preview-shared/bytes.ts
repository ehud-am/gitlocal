// Helpers for previews of binary files, which the server sends base64-encoded.

export function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let index = 0; index < binaryString.length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index)
  }
  return bytes
}

export function revokeObjectUrls(urls: string[]): void {
  for (const url of urls) URL.revokeObjectURL(url)
}
