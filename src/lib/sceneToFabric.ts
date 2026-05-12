import { fabric } from "fabric";
import type {
  Scene,
  SceneNode,
  TextNode,
  ImageNode,
  ShapeNode,
} from "../types";
import { ensureFont } from "./fontLoader";

/**
 * Mount a Scene onto a Fabric canvas at native dimensions.
 *
 * `isCancelled` — optional thunk; when it returns true the mount is
 * abandoned mid-flight (avoids stale concurrent mounts corrupting the canvas).
 */
export async function mountScene(
  canvas: fabric.Canvas,
  scene: Scene,
  overrides: Record<string, string> = {},
  isCancelled: () => boolean = () => false,
): Promise<Map<string, fabric.Object>> {
  canvas.clear();
  canvas.setWidth(scene.width);
  canvas.setHeight(scene.height);
  canvas.backgroundColor = scene.background ?? "#ffffff";

  const lookup = new Map<string, fabric.Object>();
  await mountChildren(
    canvas,
    scene.root.children,
    overrides,
    lookup,
    isCancelled,
  );
  if (!isCancelled()) canvas.renderAll();
  return lookup;
}

async function mountChildren(
  canvas: fabric.Canvas,
  nodes: SceneNode[],
  overrides: Record<string, string>,
  lookup: Map<string, fabric.Object>,
  isCancelled: () => boolean,
) {
  for (const node of nodes) {
    if (isCancelled()) return;
    if (!node.visible) continue;
    const obj = await toFabric(node, overrides);
    if (isCancelled()) return; // re-check after async wait
    if (!obj) continue;
    (obj as any).__nodeId = node.id;
    (obj as any).__nodeName = node.name;
    canvas.add(obj);
    lookup.set(node.id, obj);

    if (node.type === "group") {
      await mountChildren(
        canvas,
        node.children,
        overrides,
        lookup,
        isCancelled,
      );
    }
  }
}

async function toFabric(
  node: SceneNode,
  overrides: Record<string, string>,
): Promise<fabric.Object | null> {
  switch (node.type) {
    case "image":
      return makeImage(node);
    case "text":
      return makeText(node, overrides);
    case "shape":
      return makeShape(node);
    case "group":
      return null; // handled by recursion
  }
}

function makeImage(n: ImageNode): Promise<fabric.Object> {
  return new Promise((resolve) => {
    fabric.Image.fromURL(
      n.src,
      (img) => {
        img.set({
          left: n.x,
          top: n.y,
          scaleX: n.width / (img.width || n.width),
          scaleY: n.height / (img.height || n.height),
          opacity: n.opacity,
          angle: n.rotation ?? 0,
          selectable: !n.locked,
        });
        resolve(img);
      },
      { crossOrigin: "anonymous" },
    );
  });
}

async function makeText(
  n: TextNode,
  overrides: Record<string, string>,
): Promise<fabric.Textbox> {
  // n.name is always a string in practice, but guard defensively since it feeds
  // into a dynamic property lookup.
  const name = n.name ?? "";
  const text = overrides[name] ?? overrides[name.toLowerCase()] ?? n.text;
  await ensureFont(n.fontFamily ?? "Inter", (n.fontWeight as number) ?? 400);
  return new fabric.Textbox(text, {
    left: n.x,
    top: n.y,
    width: n.width,
    fontFamily: n.fontFamily ?? "Inter",
    fontSize: n.fontSize,
    fontWeight: n.fontWeight ?? 400,
    // Fabric.js 5 calls fontStyle.toLowerCase() internally during Textbox
    // initialisation — passing undefined (the TypeScript optional default)
    // bypasses the prototype default and throws "Illegal invocation" /
    // "Cannot read properties of undefined (reading 'toLowerCase')".
    fontStyle: n.fontStyle ?? "normal",
    fill: n.fill ?? "#000000",
    textAlign: n.align ?? "left",
    lineHeight: n.lineHeight ?? 1.2,
    opacity: n.opacity,
    angle: n.rotation ?? 0,
    editable: n.editable,
    selectable: !n.locked,
  });
}

function makeShape(n: ShapeNode): fabric.Object {
  return new fabric.Path(n.path, {
    left: n.x,
    top: n.y,
    width: n.width,
    height: n.height,
    fill: n.fill ?? "transparent",
    stroke: n.stroke,
    strokeWidth: n.strokeWidth ?? 0,
    opacity: n.opacity,
    angle: n.rotation ?? 0,
    rx: n.cornerRadius,
    ry: n.cornerRadius,
    selectable: !n.locked,
  } as any);
}
