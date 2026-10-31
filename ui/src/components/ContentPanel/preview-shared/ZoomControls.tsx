// Zoom is relative to "fit"; 1 is the default. Shared by the slide and page previews.
export const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3]
export const FIT_ZOOM_INDEX = ZOOM_LEVELS.indexOf(1)

interface Props {
  zoomIndex: number
  onZoomIndexChange: (index: number) => void
}

export function ZoomControls({ zoomIndex, onZoomIndexChange }: Props) {
  const zoom = ZOOM_LEVELS[zoomIndex]
  const percent = `${Math.round(zoom * 100)}%`
  return (
    <div className="preview-zoom" role="group" aria-label="Zoom">
      <button type="button" aria-label="Zoom out" title="Zoom out" disabled={zoomIndex === 0} onClick={() => onZoomIndexChange(zoomIndex - 1)}>−</button>
      <button type="button" className="preview-zoom-level" title="Fit to width" aria-label={zoom === 1 ? 'Fit to width' : `${percent}, reset to fit width`} onClick={() => onZoomIndexChange(FIT_ZOOM_INDEX)}>
        {zoom === 1 ? 'Fit' : percent}
      </button>
      <button type="button" aria-label="Zoom in" title="Zoom in" disabled={zoomIndex === ZOOM_LEVELS.length - 1} onClick={() => onZoomIndexChange(zoomIndex + 1)}>+</button>
    </div>
  )
}
