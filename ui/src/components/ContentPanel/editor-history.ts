export interface EditorHistoryState {
  past: string[]
  present: string
  future: string[]
}

export function createEditorHistory(content: string): EditorHistoryState {
  return { past: [], present: content, future: [] }
}

export function pushEditorChange(state: EditorHistoryState, nextContent: string): EditorHistoryState {
  if (nextContent === state.present) return state
  return {
    past: [...state.past, state.present].slice(-100),
    present: nextContent,
    future: [],
  }
}

export function undoEditorChange(state: EditorHistoryState): EditorHistoryState {
  const previous = state.past[state.past.length - 1]
  if (previous === undefined) return state
  return {
    past: state.past.slice(0, -1),
    present: previous,
    future: [state.present, ...state.future],
  }
}

export function redoEditorChange(state: EditorHistoryState): EditorHistoryState {
  const next = state.future[0]
  if (next === undefined) return state
  return {
    past: [...state.past, state.present].slice(-100),
    present: next,
    future: state.future.slice(1),
  }
}
