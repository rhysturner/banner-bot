import * as pdfjs from "pdfjs-dist";
import type {
  Scene,
  GroupNode,
  SceneNode,
  ImageNode,
  TextNode,
} from "../types";

/**
 * Illustrator (.ai) files almost always contain a PDF compatibility layer
 * (default save setting), so we parse them as PDFs.
 *
 * Strategy:
 *   1. Extract text colours by replaying the page operator list and tracking
 *      the current fill colour at every showText-type call.
 *   2. Render the page to an offscreen canvas using a context proxy that
 *      suppresses fillText / strokeText — so the Background image contains
 *      only the artwork, not baked-in text glyphs.
 *   3. Emit editable TextNodes (from getTextContent) with the extracted
 *      colours so they look correct as independent Fabric layers.
 */

// ── helpers ─────────────────────────────────────────────────────────────────

function toHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) =>
        Math.round(Math.min(1, Math.max(0, v)) * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

/**
 * Wraps a 2D context so that text-drawing calls (fillText, strokeText) are
 * no-ops. pdf.js renders glyphs via these APIs, so the resulting canvas
 * contains only vector/image artwork.
 */
function noTextCtx(ctx: CanvasRenderingContext2D): CanvasRenderingContext2D {
  return new Proxy(ctx, {
    get(target, prop: string | symbol) {
      if (prop === "fillText" || prop === "strokeText") return () => {};
      const v = Reflect.get(target, prop);
      return typeof v === "function"
        ? (v as (...a: unknown[]) => unknown).bind(target)
        : v;
    },
    // Without this trap, assigning canvas state (fillStyle, font, etc.) calls
    // the native setter with `this = proxy` instead of the real context,
    // which throws "Illegal invocation" inside pdf.js.
    set(target, prop: string | symbol, value: unknown) {
      (target as any)[prop] = value;
      return true;
    },
  });
}

/**
 * Walk the page operator list and record the active fill colour each time
 * a showText-type operator is encountered.  Returns one hex colour per
 * text-drawing call (aligns 1-to-1 with getTextContent items in practice).
 */
async function extractTextColors(page: any): Promise<string[]> {
  const colors: string[] = [];
  try {
    const ops = await page.getOperatorList();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const OPS: Record<string, number> = (pdfjs as any).OPS;
    if (!OPS) return colors;

    let r = 0,
      g = 0,
      b = 0; // default: black

    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i] as number;
      const args = ops.argsArray[i] as number[] | undefined;

      if (fn === OPS["setFillRGBColor"] && args && args.length >= 3) {
        [r, g, b] = args;
      } else if (fn === OPS["setFillGray"] && args && args.length >= 1) {
        r = g = b = args[0];
      } else if (
        (fn === OPS["setFillColorN"] || fn === OPS["setFillColor"]) &&
        args
      ) {
        if (args.length >= 3) [r, g, b] = args;
        else if (args.length === 1) r = g = b = args[0];
      } else if (
        fn === OPS["showText"] ||
        fn === OPS["showSpacedText"] ||
        fn === OPS["nextLineShowText"] ||
        fn === OPS["nextLineSetSpacingShowText"]
      ) {
        colors.push(toHex(r, g, b));
      }
    }
  } catch (e) {
    console.warn(
      "[aiParser] Could not extract text colours from operator list:",
      e,
    );
  }
  return colors;
}

// ── main export ──────────────────────────────────────────────────────────────

export async function parseAi(file: File): Promise<Scene> {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const page = await doc.getPage(1);
  const vp = page.getViewport({ scale: 1 });
  const width = Math.round(vp.width);
  const height = Math.round(vp.height);

  // 1. Extract text colours before rendering (reads operator list)
  const textColors = await extractTextColors(page);

  // 2. Render background WITHOUT text so artwork and text are separate layers
  const bgCanvas = document.createElement("canvas");
  bgCanvas.width = width;
  bgCanvas.height = height;
  const ctx2d = bgCanvas.getContext("2d")!;
  await page.render({ canvasContext: noTextCtx(ctx2d), viewport: vp }).promise;

  const bg: ImageNode = {
    id: "bg",
    type: "image",
    name: "Background",
    visible: true,
    x: 0,
    y: 0,
    width,
    height,
    opacity: 1,
    src: bgCanvas.toDataURL("image/png"),
    resize: "fill",
  };

  // 3. Extract text as independent, editable TextNodes with real fill colours
  const textContent = await page.getTextContent();
  let __id = 0;
  const textNodes: TextNode[] = (textContent.items as any[])
    .filter((it) => typeof it.str === "string") // skip MarkedContent markers
    .map((it) => {
      const [, , , d, e, f] = it.transform as number[];
      const fontSize = Math.abs(d) || 12;
      const fill = textColors[__id] ?? "#000000";
      return {
        id: `t_${++__id}`,
        type: "text" as const,
        name: it.str.trim().slice(0, 24) || "Text",
        visible: true,
        x: e,
        y: vp.height - f - fontSize, // PDF y-up → canvas y-down
        width: it.width > 0 ? it.width : it.str.length * fontSize * 0.55,
        height: it.height > 0 ? it.height : fontSize * 1.4,
        opacity: 1,
        text: it.str,
        fontFamily: "Inter",
        fontSize,
        fontWeight: 400,
        fill,
        align: "left" as const,
        editable: true,
        resize: "fit" as const,
      };
    });

  const root: GroupNode = {
    id: "root",
    type: "group",
    name: file.name,
    visible: true,
    x: 0,
    y: 0,
    width,
    height,
    opacity: 1,
    children: [bg, ...textNodes] as SceneNode[],
  };

  return { width, height, root };
}
