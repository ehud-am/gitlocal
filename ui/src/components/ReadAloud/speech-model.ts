// Read aloud (#139): the "speech document" a preview is turned into. A block is one structural
// unit (heading, paragraph, table row, ...); a sentence is one spoken clip with its DOM range.

export type BlockKind = 'heading' | 'paragraph' | 'list-item' | 'table-row' | 'quote' | 'code' | 'slide' | 'notes'

export interface SpeechSentence {
  text: string
  range: Range | null
  blockIndex: number
  kind: BlockKind
  preMs: number
  postMs: number
}

// Silence around blocks, in milliseconds. Sentences inside a block get no extra pause: `say` and
// Web Speech already pause at sentence ends.
export function pauseFor(kind: BlockKind, level = 1): { preMs: number; postMs: number } {
  switch (kind) {
    case 'heading':
      return level <= 2 ? { preMs: 400, postMs: 800 } : { preMs: 300, postMs: 600 }
    case 'list-item':
      return { preMs: 0, postMs: 300 }
    case 'table-row':
      return { preMs: 0, postMs: 350 }
    case 'slide':
      return { preMs: 900, postMs: 0 }
    case 'quote':
    case 'notes':
      return { preMs: 200, postMs: 450 }
    default:
      return { preMs: 0, postMs: 450 }
  }
}
