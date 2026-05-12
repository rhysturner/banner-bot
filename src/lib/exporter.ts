import { fabric } from 'fabric';
import JSZip from 'jszip';
import type { Scene, ArtboardSpec } from '../types';
import { resizeScene } from './smartResize';
import { mountScene } from './sceneToFabric';

/**
 * Memory-safe export.
 * We render ONE artboard at a time on a shared offscreen canvas, push the
 * PNG/SVG buffer to JSZip, then dispose. Works for 50+ sizes without
 * crashing the tab.
 */
export async function exportZip(
  scene: Scene,
  artboards: ArtboardSpec[],
  overrides: Record<string, Record<string, string>>,
  format: 'png' | 'svg' = 'png',
  onProgress?: (done: number, total: number) => void,
): Promise<Blob> {
  const zip = new JSZip();
  const el = document.createElement('canvas');
  const offscreen = new fabric.StaticCanvas(el, { enableRetinaScaling: false });

  for (let i = 0; i < artboards.length; i++) {
    const ab = artboards[i];
    const sized = resizeScene(scene, ab.width, ab.height);
    await mountScene(offscreen as unknown as fabric.Canvas, sized, overrides[ab.id] ?? {});

    if (format === 'png') {
      const dataUrl = offscreen.toDataURL({ format: 'png', multiplier: 1 });
      zip.file(`${ab.name}.png`, dataUrlToBlob(dataUrl));
    } else {
      const svg = offscreen.toSVG();
      zip.file(`${ab.name}.svg`, svg);
    }
    onProgress?.(i + 1, artboards.length);
    offscreen.clear();
  }

  return zip.generateAsync({ type: 'blob' });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(',');
  const mime = meta.match(/data:(.+?);base64/)![1];
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
