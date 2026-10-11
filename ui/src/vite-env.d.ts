/// <reference types="vite/client" />

// rtf.js ships its EMF/WMF renderers as standalone UMD bundles without type declarations for
// these deep paths; the PPTX preview's metafile.ts describes the parts it uses.
declare module 'rtf.js/dist/EMFJS.bundle.js'
declare module 'rtf.js/dist/WMFJS.bundle.js'
