import type { Scene, SceneNode, Anchor } from '../types';

/**
 * SMART RESIZE ENGINE
 * ---------------------------------------------------------------
 * Given a master Scene (e.g. 1080×1080) and a target artboard (e.g. 300×250),
 * produce a transformed copy of the tree where every node is positioned
 * for the new dimensions, respecting:
 *
 *   - anchor: which point of the node stays "fixed" (e.g. CTA pinned bottom-right)
 *   - resize: 'fit' (uniform scale, default for images/shapes),
 *             'fill' (cover — for backgrounds),
 *             'fixed' (do not scale — typography, disclaimers).
 *
 * For 'fit' we pick the smaller axis ratio (aspect-preserved letterbox).
 * For 'fill' we pick the larger axis ratio (cover the artboard).
 * Anchor maps determine where the scaled node lands after scaling.
 *
 * The function is pure: no canvas/Fabric dependencies. Output feeds
 * sceneToFabric for rendering each artboard.
 */
export function resizeScene(scene: Scene, targetW: number, targetH: number): Scene {
  const sx = targetW / scene.width;
  const sy = targetH / scene.height;
  const uniform = Math.min(sx, sy);   // default: fit (letterbox)

  const transform = (node: SceneNode): SceneNode => {
    const mode = node.resize ?? defaultResize(node);
    const anchor = node.anchor ?? defaultAnchor(node);

    let scale: { x: number; y: number };
    switch (mode) {
      case 'fill':  { const k = Math.max(sx, sy); scale = { x: k, y: k }; break; }
      case 'fixed': scale = { x: 1, y: 1 }; break;
      case 'fit':
      default:      scale = { x: uniform, y: uniform };
    }

    const newW = node.width * scale.x;
    const newH = node.height * scale.y;
    const newPos = positionForAnchor(node, anchor, sx, sy, scene.width, scene.height, targetW, targetH, newW, newH, scale);

    const next: SceneNode = { ...node, ...newPos, width: newW, height: newH };

    // text font-size scales with the uniform factor so kerning stays coherent
    if (next.type === 'text' && mode !== 'fixed') {
      next.fontSize = node.type === 'text' ? node.fontSize * scale.x : (next as any).fontSize;
    }

    if (next.type === 'group') {
      next.children = node.type === 'group' ? node.children.map(transform) : [];
    }
    return next;
  };

  return {
    ...scene,
    width: targetW,
    height: targetH,
    root: transform(scene.root) as Scene['root'],
  };
}

// ── defaults ───────────────────────────────────────────────────────────────

function defaultResize(node: SceneNode): 'fit' | 'fill' | 'fixed' {
  if (node.type === 'image' && (node.name.toLowerCase().includes('bg') || node.name.toLowerCase().includes('background'))) return 'fill';
  if (node.type === 'text') return 'fit';   // scale font with uniform factor
  return 'fit';
}

function defaultAnchor(node: SceneNode): Anchor {
  const n = node.name.toLowerCase();
  if (n.includes('cta') || n.includes('button')) return 'bottom';
  if (n.includes('logo')) return 'top-left';
  if (n.includes('headline') || n.includes('title')) return 'top';
  return 'center';
}

// ── anchor math ────────────────────────────────────────────────────────────

function positionForAnchor(
  node: SceneNode,
  anchor: Anchor,
  sx: number, sy: number,
  srcW: number, srcH: number,
  dstW: number, dstH: number,
  newW: number, newH: number,
  scale: { x: number; y: number },
) {
  // node's anchor point in source space
  const a = anchorPoint(node, anchor);
  // where that anchor lives in the destination based on its relative location in source
  const relX = a.x / srcW;
  const relY = a.y / srcH;
  const targetX = relX * dstW;
  const targetY = relY * dstH;

  // local offset from node origin to anchor (in scaled space)
  const localOffsetX = (a.x - node.x) * scale.x;
  const localOffsetY = (a.y - node.y) * scale.y;

  return {
    x: clamp(targetX - localOffsetX, -newW, dstW),
    y: clamp(targetY - localOffsetY, -newH, dstH),
  };
}

function anchorPoint(node: SceneNode, anchor: Anchor) {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  switch (anchor) {
    case 'center':       return { x: cx,             y: cy };
    case 'top':          return { x: cx,             y: node.y };
    case 'bottom':       return { x: cx,             y: node.y + node.height };
    case 'left':         return { x: node.x,         y: cy };
    case 'right':        return { x: node.x + node.width, y: cy };
    case 'top-left':     return { x: node.x,         y: node.y };
    case 'top-right':    return { x: node.x + node.width, y: node.y };
    case 'bottom-left':  return { x: node.x,         y: node.y + node.height };
    case 'bottom-right': return { x: node.x + node.width, y: node.y + node.height };
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
