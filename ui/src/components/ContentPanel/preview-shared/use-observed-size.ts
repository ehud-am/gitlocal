import { useCallback, useEffect, useRef, useState } from 'react'

// Tracks an element's content width or height with a ResizeObserver, returning a callback ref to
// attach and the latest size (0 until measured). A callback ref rather than useRef + useEffect,
// because a preview's measured element usually mounts only after parsing has finished, when an
// effect that ran on the first render would have seen a null ref and never observed anything.
// Without ResizeObserver, the width is read once from clientWidth; a height stays 0.
export function useObservedSize(dimension: 'width' | 'height'): [(element: HTMLElement | null) => void, number] {
  const [size, setSize] = useState(0)
  const observerRef = useRef<ResizeObserver | null>(null)

  const ref = useCallback((element: HTMLElement | null) => {
    observerRef.current?.disconnect()
    observerRef.current = null
    if (!element) return
    if (typeof ResizeObserver === 'undefined') {
      if (dimension === 'width') setSize(element.clientWidth)
      return
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setSize(entry.contentRect[dimension])
    })
    observer.observe(element)
    observerRef.current = observer
  }, [dimension])

  useEffect(() => () => observerRef.current?.disconnect(), [])

  return [ref, size]
}
