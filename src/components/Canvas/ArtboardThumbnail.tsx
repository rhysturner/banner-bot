import { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import type { Scene, ArtboardSpec } from '../../types';
import { resizeScene } from '../../lib/smartResize';
import { mountScene } from '../../lib/sceneToFabric';

/**
 * Renders a static PNG thumbnail for one artboard using a SHARED offscreen
 * canvas. Renders are queued and limited to 2 in-flight at a time to keep
 * memory bounded on CSVs with 50+ rows.
 */
const queue: Array<() => Promise<void>> = [];
let active = 0;
const MAX = 2;
function enqueue(task: () => Promise<void>) {
  queue.push(task);
  pump();
}
function pump() {
  while (active < MAX && queue.length) {
    const t = queue.shift()!;
    active++;
    t().finally(() => { active--; pump(); });
  }
}

let _el: HTMLCanvasElement | null = null;
function offscreen(): HTMLCanvasElement {
  if (!_el) _el = document.createElement('canvas');
  return _el;
}

type Props = {
  scene: Scene;
  artboard: ArtboardSpec;
  overrides: Record<string, string>;
  active: boolean;
  onClick: () => void;
};

export default function ArtboardThumbnail({ scene, artboard, overrides, active, onClick }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    enqueue(async () => {
      if (cancelled.current) return;
      const el = offscreen();
      const c = new fabric.StaticCanvas(el, { enableRetinaScaling: false });
      const sized = resizeScene(scene, artboard.width, artboard.height);
      await mountScene(c as unknown as fabric.Canvas, sized, overrides);
      if (cancelled.current) return;
      setSrc(c.toDataURL({ format: 'png', multiplier: 0.5 }));
      c.dispose();
    });
    return () => { cancelled.current = true; };
  }, [scene, artboard, overrides]);

  // landscape vs portrait — match BannerBot preview strip
  const portrait = artboard.height > artboard.width;
  const w = portrait ? 100 : 160;
  const h = portrait ? 160 : (artboard.height / artboard.width) * 160;

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 shrink-0 ${active ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
    >
      <span className="text-xs text-slate-400">{artboard.width}×{artboard.height}</span>
      <div
        className={`bg-slate-200 rounded-md overflow-hidden border-2 ${active ? 'border-accent-500' : 'border-transparent'}`}
        style={{ width: w, height: h }}
      >
        {src && <img src={src} alt={artboard.name} className="w-full h-full object-contain" />}
      </div>
    </button>
  );
}
