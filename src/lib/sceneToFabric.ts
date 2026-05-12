import { fabric } from 'fabric';
import type { Scene, SceneNode, TextNode, ImageNode, ShapeNode, GroupNode } from '../types';
import { ensureFont } from './fontLoader';

/**
 * Mount a Scene onto a Fabric canvas at native dimensions.
 * Returns a map from SceneNode.id → fabric.Object so the inspector
 * and layer panel can drive selection/edits.
 *
 * Apply text overrides (from CSV column → text node name) by passing
 * the optional overrides map.
 */
export async function mountScene(
  canvas: fabric.Canvas,
  scene: Scene,
  overrides: Record<string, string> = {},
): Promise<Map<string, fabric.Object>> {
  canvas.clear();
  canvas.setWidth(scene.width);
  canvas.setHeight(scene.height);
  canvas.backgroundColor = scene.background || '#ffffff';

  const lookup = new Map<string, fabric.Object>();
  await mountChildren(canvas, scene.root.children, overrides, lookup);
  canvas.renderAll();
  return lookup;
}

async function mountChildren(
  canvas: fabric.Canvas,
  nodes: SceneNode[],
  overrides: Record<string, string>,
  lookup: Map<string, fabric.Object>,
) {
  for (const node of nodes) {
    if (!node.visible) continue;
    const obj = await toFabric(node, overrides);
    if (!obj) continue;
    (obj as any).__nodeId = node.id;
    (obj as any).__nodeName = node.name;
    canvas.add(obj);
    lookup.set(node.id, obj);

    if (node.type === 'group') {
      // Fabric Groups are heavyweight for editing; we keep children as siblings
      // and rely on a logical hierarchy in the Layers panel.
      await mountChildren(canvas, node.children, overrides, lookup);
    }
  }
}

async function toFabric(node: SceneNode, overrides: Record<string, string>): Promise<fabric.Object | null> {
  switch (node.type) {
    case 'image':  return makeImage(node);
    case 'text':   return makeText(node, overrides);
    case 'shape':  return makeShape(node);
    case 'group':  return null; // handled by recursion
  }
}

function makeImage(n: ImageNode): Promise<fabric.Object> {
  return new Promise((resolve) => {
    fabric.Image.fromURL(n.src, (img) => {
      img.set({
        left: n.x, top: n.y,
        scaleX: n.width / (img.width || n.width),
        scaleY: n.height / (img.height || n.height),
        opacity: n.opacity,
        angle: n.rotation ?? 0,
        selectable: !n.locked,
      });
      resolve(img);
    }, { crossOrigin: 'anonymous' });
  });
}

async function makeText(n: TextNode, overrides: Record<string, string>): Promise<fabric.Textbox> {
  const text = overrides[n.name] ?? overrides[n.name.toLowerCase()] ?? n.text;
  await ensureFont(n.fontFamily, n.fontWeight as number);
  const box = new fabric.Textbox(text, {
    left: n.x, top: n.y,
    width: n.width,
    fontFamily: n.fontFamily,
    fontSize: n.fontSize,
    fontWeight: n.fontWeight,
    fontStyle: n.fontStyle,
    fill: n.fill,
    textAlign: n.align ?? 'left',
    lineHeight: n.lineHeight ?? 1.2,
    opacity: n.opacity,
    angle: n.rotation ?? 0,
    editable: n.editable,
    selectable: !n.locked,
  });
  return box;
}

function makeShape(n: ShapeNode): fabric.Object {
  const path = new fabric.Path(n.path, {
    left: n.x, top: n.y,
    width: n.width, height: n.height,
    fill: n.fill ?? 'transparent',
    stroke: n.stroke,
    strokeWidth: n.strokeWidth ?? 0,
    opacity: n.opacity,
    angle: n.rotation ?? 0,
    rx: n.cornerRadius,
    ry: n.cornerRadius,
    selectable: !n.locked,
  } as any);
  return path;
}
