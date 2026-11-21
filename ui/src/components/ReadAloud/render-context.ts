import { createContext } from 'react'

// True while read aloud is active. Previews that render lazily (PPTX slides render only near the
// viewport) render everything so the whole document can be read.
export const ReadAloudRenderAllContext = createContext(false)
