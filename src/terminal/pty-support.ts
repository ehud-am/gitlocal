const SUPPORTED_PTY_PLATFORMS = new Set<NodeJS.Platform>(['darwin', 'linux', 'win32'])

export function isPtySupported(platform: NodeJS.Platform = process.platform): boolean {
  return SUPPORTED_PTY_PLATFORMS.has(platform)
}
