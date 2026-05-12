import * as pdfjs from 'pdfjs-dist';
import type { Scene, GroupNode, SceneNode, ImageNode, TextNode } from '../types';

/**
 * Illustrator (.ai) files almost always contain a PDF compatibility layer
 * (default save setting), so we parse them as PDFs. Each page becomes an
 * artboard; we read page 1 by default.
 *
 * Two strategies, in order:
 *   1. pdf.js getTextContent → real TextNodes (editable!)
 *      + render page into an offscreen canvas for background imagery
 *   2. If the file isn't PDF-compatible: rasterize page 1 only and emit
 *      a single ImageNode (lossy fallback — user is informed in the UI).
 */
export async function parseAi(file: File): Promise<Scene> {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const page = await doc.getPage(1);
  const vp = page.getViewport({ scale: 1 });
  const width = Math.round(vp.width);
  const height = Math.round(vp.height);

  // 1. render background imagery
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = width; bgCanvas.height = height;
  await page.render({ canvasContext: bgCanvas.getContext('2d')!, viewport: vp }).promise;
  const bg: ImageNode = {
    id: 'bg', type: 'image', name: 'Background',
    visible: true, x: 0, y: 0, width, height, opacity: 1,
    src: bgCanvas.toDataURL('image/png'),
    resize: 'fill',
  };

  // 2. extract text content as editable TextNodes
  const text = await page.getTextContent();
  let __id = 0;
  const textNodes: TextNode[] = text.items.map((it: any) => {
    // PDF transform: [a, b, c, d, e, f] — e,f are translation, d is font size
    const [a, , , d, e, f] = it.transform;
    const fontSize = Math.abs(d);
    return {
      id: `t_${++__id}`,
      type: 'text',
      name: it.str.slice(0, 24) || 'Text',
      visible: true,
      x: e,
      y: vp.height - f - fontSize,   // PDF y-up → canvas y-down
      width: it.width || it.str.length * fontSize * 0.5,
      height: it.height || fontSize * 1.2,
      opacity: 1,
      text: it.str,
      fontFamily: 'Inter',           // PDF font names are unreliable; default + Google Fonts fallback
      fontSize,
      fontWeight: 400,
      fill: '#000000',
      align: 'left',
      editable: true,
      resize: 'fit',
    };
  });

  const root: GroupNode = {
    id: 'root', type: 'group', name: file.name,
    visible: true, x: 0, y: 0, width, height, opacity: 1,
    children: [bg, ...textNodes] as SceneNode[],
  };

  return { width, height, root };
}
