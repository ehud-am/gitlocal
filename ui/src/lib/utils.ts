import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function parentPathOf(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  const boundary = normalized.lastIndexOf('/')
  return boundary >= 0 ? normalized.slice(0, boundary) : ''
}

export function basenameOf(path: string): string {
  if (!path) return ''
  const normalized = path.replace(/\/+$/, '')
  const boundary = normalized.lastIndexOf('/')
  return boundary >= 0 ? normalized.slice(boundary + 1) : normalized
}
