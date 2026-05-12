/**
 * Parser-neutral scene graph. Both psdParser and aiParser produce this shape,
 * and the canvas + inspector + exporter all consume it. Keeps the rest of the
 * app independent of the source file format.
 */

export type SceneNodeBase = {
  id: string;
  name: string;
  visible: boolean;
  locked?: boolean;
  /** bounding box in MASTER (source) pixel space */
  x: number; y: number; width: number; height: number;
  opacity: number;          // 0..1
  rotation?: number;        // degrees
  /** Smart-resize hint: which point stays anchored when resizing the artboard. */
  anchor?: Anchor;
  /** Smart-resize hint: scale uniformly (image/shape) vs. reflow (text). */
  resize?: 'fit' | 'fill' | 'fixed';
};

export type Anchor =
  | 'center' | 'top' | 'bottom' | 'left' | 'right'
  | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type GroupNode = SceneNodeBase & {
  type: 'group';
  children: SceneNode[];
};

export type ImageNode = SceneNodeBase & {
  type: 'image';
  /** dataURL or blob URL; the canvas loader resolves to an HTMLImageElement. */
  src: string;
};

export type TextNode = SceneNodeBase & {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number | string;
  fontStyle?: 'normal' | 'italic';
  fill: string;             // hex / rgba
  align?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number;
  letterSpacing?: number;
  editable: boolean;        // CSV overrides target editable=true nodes
};

export type ShapeNode = SceneNodeBase & {
  type: 'shape';
  /** SVG path data — vector preserved end-to-end. */
  path: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
};

export type SceneNode = GroupNode | ImageNode | TextNode | ShapeNode;

export type Scene = {
  width: number;
  height: number;
  /** Background fill (Photoshop document bg / AI artboard bg). */
  background?: string;
  root: GroupNode;
};

export type ArtboardSpec = {
  id: string;
  name: string;
  width: number;
  height: number;
};
