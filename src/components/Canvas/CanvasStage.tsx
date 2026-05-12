import { useEffect, useRef } from 'react';
import { fabric } from 'fabric';
import { useEditor } from '../../store/editorStore';
import { resizeScene } from '../../lib/smartResize';
import { mountScene } from '../../lib/sceneToFabric';

/**
 * Live editing canvas for the currently active artboard. Only ONE Fabric
 * canvas is alive at a time (memory safety) — thumbnails are static images.
 */
export default function CanvasStage() {
  const elRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const { scene, artboards, activeArtboardId, overrides, selectNode } = useEditor();

  // init Fabric once
  useEffect(() => {
    if (!elRef.current) return;
    const c = new fabric.Canvas(elRef.current, { backgroundColor: '#11141b', preserveObjectStacking: true });
    canvasRef.current = c;

    c.on('selection:created', (e) => selectNode((e.selected?.[0] as any)?.__nodeId ?? null));
    c.on('selection:updated', (e) => selectNode((e.selected?.[0] as any)?.__nodeId ?? null));
    c.on('selection:cleared', () => selectNode(null));

    // pan + zoom (alt-drag pans, wheel zooms — Figma muscle memory)
    c.on('mouse:wheel', (opt) => {
      const e = opt.e as WheelEvent;
      const z = c.getZoom() * (0.999 ** e.deltaY);
      c.zoomToPoint({ x: e.offsetX, y: e.offsetY }, Math.min(8, Math.max(0.1, z)));
      e.preventDefault(); e.stopPropagation();
    });

    return () => { c.dispose(); canvasRef.current = null; };
  }, [selectNode]);

  // mount the active artboard's resized scene
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !scene) return;
    const ab = artboards.find((a) => a.id === activeArtboardId);
    if (!ab) return;
    const sized = resizeScene(scene, ab.width, ab.height);
    mountScene(c, sized, overrides[ab.id] ?? {});
  }, [scene, artboards, activeArtboardId, overrides]);

  return (
    <div className="flex-1 overflow-hidden bg-ink-950">
      <canvas ref={elRef} />
    </div>
  );
}
