export type ContentPanelSelectionKind =
  | 'content-panel'
  | 'native-control'
  | 'unavailable'

function isTextInput(element: Element): element is HTMLInputElement {
  if (!(element instanceof HTMLInputElement)) return false
  const type = element.type.toLowerCase()
  return !['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit'].includes(type)
}

export function isNativeSelectionControl(element: Element | null): element is HTMLInputElement | HTMLTextAreaElement {
  if (!element) return false
  if (element instanceof HTMLTextAreaElement) return true
  if (isTextInput(element)) return true
  return element instanceof HTMLElement && element.isContentEditable
}

export function selectNativeControl(element: HTMLInputElement | HTMLTextAreaElement | HTMLElement): boolean {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    element.select()
    return true
  }

  if (!element.isContentEditable) return false
  const selection = element.ownerDocument.getSelection()
  if (!selection) return false
  const range = element.ownerDocument.createRange()
  range.selectNodeContents(element)
  selection.removeAllRanges()
  selection.addRange(range)
  return true
}

export function selectElementContents(element: HTMLElement): boolean {
  const selection = element.ownerDocument.getSelection()
  if (!selection) return false

  const editableDraft = element.querySelector('textarea')
  if (editableDraft instanceof HTMLTextAreaElement) {
    editableDraft.focus()
    editableDraft.select()
    return true
  }

  const range = element.ownerDocument.createRange()
  range.selectNodeContents(element)
  selection.removeAllRanges()
  selection.addRange(range)
  return true
}

export function selectContentPanelScope(panelRoot: HTMLElement | null, selectionRoot: HTMLElement | null): ContentPanelSelectionKind {
  const activeElement = panelRoot?.ownerDocument.activeElement ?? null
  if (isNativeSelectionControl(activeElement)) {
    return selectNativeControl(activeElement) ? 'native-control' : 'unavailable'
  }

  if (!panelRoot || !selectionRoot) return 'unavailable'
  if (activeElement && activeElement !== panelRoot.ownerDocument.body && !panelRoot.contains(activeElement)) {
    return 'unavailable'
  }

  return selectElementContents(selectionRoot) ? 'content-panel' : 'unavailable'
}

export function isSelectAllShortcut(event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey'>): boolean {
  return event.key.toLowerCase() === 'a' && (event.metaKey || event.ctrlKey) && !event.altKey
}
