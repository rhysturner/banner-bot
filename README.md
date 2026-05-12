# BannerBot — Automated Ad Resizer

Figma-inspired vector canvas. Import PSD/AI → preserve editable layers → CSV drives N artboards → export ZIP.

## Architecture

```
src/
├── types/index.ts              SceneNode (parser-neutral scene graph)
├── lib/
│   ├── psdParser.ts            psd.js → SceneNode tree
│   ├── aiParser.ts             .ai → PDF.js → SVG → SceneNode
│   ├── csvParser.ts            CSV → ArtboardSpec[]
│   ├── sceneToFabric.ts        SceneNode → fabric.Object (per-artboard clone)
│   ├── smartResize.ts          aspect-aware layout engine
│   ├── fontLoader.ts           Google Fonts auto-fallback
│   └── exporter.ts             ZIP of PNG/SVG via jszip
├── store/editorStore.ts        Zustand: scene, artboards, selection
├── components/
│   ├── Canvas/                 Main Fabric stage + ArtboardThumbnail (virtualized)
│   ├── Sidebar/                Layer tree (visibility, hierarchy)
│   ├── Inspector/              Right panel — Text / Shape / Frame properties
│   ├── Toolbar/                Move / Frame / Text / Rectangle / Pen / Zoom
│   ├── DropZone/               PSD / AI / CSV drag-and-drop
│   └── PreviewStrip/           Bottom artboard strip (virtualized — one canvas at a time)
└── App.tsx
```

### Key decisions
- **Parser-neutral SceneNode** — PSD and AI both normalize to the same tree, so canvas/inspector/export are file-format-agnostic.
- **Fabric.js** — better text editing primitives than Konva for an inspector-driven app.
- **AI = PDF** — Illustrator files almost always carry a PDF compatibility layer; we parse via `pdfjs-dist` → SVG.
- **Smart resize** — anchor-based (each node tags its target anchor: center/top-left/edge); see `smartResize.ts`.
- **Virtualization** — only the focused artboard mounts a live Fabric canvas. Thumbnails are static PNGs rendered on-demand via an offscreen canvas pool (max 2 in flight).
- **Fonts** — every text node attempts `document.fonts.load`; missing fonts auto-fetch from Google Fonts (`fontLoader.ts`). User can upload `.woff/.ttf` to override.

## Run
```bash
npm i && npm run dev
```
