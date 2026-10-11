import { MediaRegistry } from './fill'
import { loadMedia } from './media'
import type { PresentationModel, SlideModel } from './model'
import { EMU_PER_PX } from './model'
import { openPackage } from './package'
import { parseSlide, type DeckContext } from './slide'
import { child, children, numAttr, relAttr } from './xml'

const DEFAULT_WIDTH_EMU = 9144000
const DEFAULT_HEIGHT_EMU = 6858000

export async function parsePresentation(bytes: Uint8Array): Promise<PresentationModel> {
  const pkg = await openPackage(bytes)
  const presentationPath = pkg.relByType('', '/officeDocument')?.target ?? 'ppt/presentation.xml'
  const presentation = pkg.xml(presentationPath)
  if (!presentation) throw new Error(`Missing or unreadable ${presentationPath}`)
  if (presentation.localName !== 'presentation') throw new Error('Malformed presentation part')

  const sldSz = child(presentation, 'sldSz')
  const widthPx = (numAttr(sldSz, 'cx') || DEFAULT_WIDTH_EMU) / EMU_PER_PX
  const heightPx = (numAttr(sldSz, 'cy') || DEFAULT_HEIGHT_EMU) / EMU_PER_PX

  const presentationRels = pkg.rels(presentationPath)
  const slidePaths = children(child(presentation, 'sldIdLst'), 'sldId')
    .map((sldId) => presentationRels.get(relAttr(sldId, 'id') ?? '')?.target)
    .filter((target): target is string => typeof target === 'string')

  const tableStylesPath = pkg.relByType(presentationPath, '/tableStyles')?.target
  const deck: DeckContext = {
    pkg,
    media: new MediaRegistry(),
    defaultTextStyle: child(presentation, 'defaultTextStyle'),
    tableStyles: tableStylesPath ? pkg.xml(tableStylesPath) : null,
    layouts: new Map(),
    masters: new Map(),
    themes: new Map(),
  }

  const slides: SlideModel[] = []
  for (let index = 0; index < slidePaths.length; index += 1) {
    slides.push(parseSlide(deck, slidePaths[index], index))
    // Yield between slides so parsing a large deck doesn't freeze the page.
    if (index % 5 === 4) {
      // eslint-disable-next-line no-await-in-loop -- intentional yield point, not a data dependency
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  const objectUrls = await loadMedia(pkg, deck.media.refs)
  return { widthPx, heightPx, slides, objectUrls }
}
