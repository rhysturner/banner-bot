import { create } from 'zustand';
import type { Scene, SceneNode, ArtboardSpec } from '../types';

type State = {
  scene: Scene | null;
  artboards: ArtboardSpec[];
  overrides: Record<string, Record<string, string>>;
  activeArtboardId: string | null;
  selectedNodeId: string | null;
  exporting: { running: boolean; done: number; total: number };

  setScene: (s: Scene) => void;
  setArtboards: (a: ArtboardSpec[], o: Record<string, Record<string, string>>) => void;
  setActiveArtboard: (id: string | null) => void;
  selectNode: (id: string | null) => void;
  updateNode: (id: string, patch: Partial<SceneNode>) => void;
  toggleVisibility: (id: string) => void;
  setExporting: (e: State['exporting']) => void;
};

export const useEditor = create<State>((set, get) => ({
  scene: null,
  artboards: [],
  overrides: {},
  activeArtboardId: null,
  selectedNodeId: null,
  exporting: { running: false, done: 0, total: 0 },

  setScene: (scene) => set({ scene }),
  setArtboards: (artboards, overrides) =>
    set({ artboards, overrides, activeArtboardId: artboards[0]?.id ?? null }),
  setActiveArtboard: (id) => set({ activeArtboardId: id }),
  selectNode: (id) => set({ selectedNodeId: id }),
  updateNode: (id, patch) => {
    const scene = get().scene;
    if (!scene) return;
    set({ scene: { ...scene, root: patchTree(scene.root, id, patch) as any } });
  },
  toggleVisibility: (id) => {
    const scene = get().scene;
    if (!scene) return;
    set({ scene: { ...scene, root: patchTree(scene.root, id, (n) => ({ visible: !n.visible })) as any } });
  },
  setExporting: (exporting) => set({ exporting }),
}));

function patchTree(
  node: SceneNode,
  id: string,
  patch: Partial<SceneNode> | ((n: SceneNode) => Partial<SceneNode>),
): SceneNode {
  if (node.id === id) {
    const p = typeof patch === 'function' ? patch(node) : patch;
    return { ...node, ...p } as SceneNode;
  }
  if (node.type === 'group') {
    return { ...node, children: node.children.map((c) => patchTree(c, id, patch)) };
  }
  return node;
}
