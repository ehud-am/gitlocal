// Bundles the pdfjs-dist worker script as a local static asset via Vite's `?url` import so
// PdfViewer can point `GlobalWorkerOptions.workerSrc` at a locally-served hashed asset path,
// never at pdfjs-dist's CDN default. This keeps PDF rendering fully local-first (Constitution
// Principle III) both in dev (served from disk) and in the production build (bundled into
// ui/dist with a content hash).
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

export default pdfWorkerUrl
