import { readPsd, type Layer, type Psd } from 'ag-psd';
import type { Scene, SceneNode, GroupNode, TextNode, ImageNode, Anchor } from '../types';

/**
 * Parse a PSD into our parser-neutral Scene graph.
 *
 * Conventions for layer naming → hints (matches what most designers already do):
 *   - "[center] Logo"       → anchor = center
 *   - "[fit] Hero"          → resize = fit  (default for images/shapes)
 *   - "[fixed] Disclaimer"  → resize = fixed (does not scale)
 *   - layers ending with "(Editable)" → text override target
 */
export async function parsePsd(file: File): Promise<Scene> {
  const buf = await file.arrayBuffer();
  const psd = readPsd(buf, { skipLayerImageData: false, useImageData: false });

  const root: GroupNode = {
    id: 'root',
    type: 'group',
    name: file.name,
    visible: true,
    x: 0, y: 0,
    width: psd.width,
    height: psd.height,
    opacity: 1,
    children: (psd.children ?? []).map(toNode).filter(Boolean) as SceneNode[],
  };

  return {
    width: psd.width,
    height: psd.height,
    background: rgba(psd.canvas?.getContext('2d')?.getImageData(0, 0, 1, 1).data),
    root,
  };
}

let __id = 0;
const nextId = () => `n_${++__id}`;

function toNode(layer: Layer): SceneNode | null {
  if (layer.hidden && !layer.children) {/* still include — visibility flag drives render */}
  const left = layer.left ?? 0;
  const top = layer.top ?? 0;
  const right = layer.right ?? 0;
  const bottom = layer.bottom ?? 0;
  const base = {
    id: nextId(),
    name: stripHints(layer.name ?? 'Layer'),
    visible: !layer.hidden,
    x: left,
    y: top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
    opacity: (layer.opacity ?? 255) / 255,
    anchor: parseAnchor(layer.name),
    resize: parseResize(layer.name),
  };

  // ── group / folder ─────────────────────────────────────────────────────
  if (layer.children) {
    const group: GroupNode = { ...base, type: 'group', children: layer.children.map(toNode).filter(Boolean) as SceneNode[] };
    return group;
  }

  // ── text ───────────────────────────────────────────────────────────────
  if (layer.text) {
    const style = layer.text.style ?? {};
    const node: TextNode = {
      ...base,
      type: 'text',
      text: layer.text.text ?? '',
      fontFamily: style.font?.name ?? 'Inter',
      fontSize: style.fontSize ?? 24,
      fontWeight: style.fauxBold ? 700 : (style.font?.name?.toLowerCase().includes('bold') ? 700 : 400),
      fontStyle: style.fauxItalic ? 'italic' : 'normal',
      fill: rgbaFromColor(style.fillColor) ?? '#ffffff',
      align: (style.justification as TextNode['align']) ?? 'left',
      editable: /\(editable\)/i.test(layer.name ?? '') || true, // default editable
    };
    return node;
  }

  // ── raster (image / smart object / pixel layer) ────────────────────────
  if (layer.canvas) {
    const node: ImageNode = {
      ...base,
      type: 'image',
      src: layer.canvas.toDataURL('image/png'),
    };
    return node;
  }

  return null;
}

// ── name-hint parsing ──────────────────────────────────────────────────────

function stripHints(name: string) {
  return name.replace(/\[[^\]]+\]/g, '').replace(/\(editable\)/gi, '').trim() || name;
}

function parseAnchor(name?: string): Anchor | undefined {
  if (!name) return;
  const m = name.match(/\[(center|top|bottom|left|right|top-left|top-right|bottom-left|bottom-right)\]/i);
  return m ? (m[1].toLowerCase() as Anchor) : undefined;
}

function parseResize(name?: string): 'fit' | 'fill' | 'fixed' | undefined {
  if (!name) return;
  const m = name.match(/\[(fit|fill|fixed)\]/i);
  return m ? (m[1].toLowerCase() as 'fit' | 'fill' | 'fixed') : undefined;
}

// ── color helpers ──────────────────────────────────────────────────────────

function rgbaFromColor(c: any): string | undefined {
  if (!c) return;
  const { r = 0, g = 0, b = 0, a = 255 } = c;
  return `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`;
}
function rgba(d?: Uint8ClampedArray) {
  if (!d) return undefined;
  return `rgba(${d[0]},${d[1]},${d[2]},${(d[3] / 255).toFixed(3)})`;
}
