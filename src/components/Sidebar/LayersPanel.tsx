import { useEditor } from '../../store/editorStore';
import type { SceneNode } from '../../types';

export default function LayersPanel() {
  const { scene, selectedNodeId, selectNode, toggleVisibility } = useEditor();
  return (
    <aside className="w-72 bg-ink-900 border-r border-ink-700 flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-ink-700">
        <span className="font-medium text-sm tracking-wide">Layers</span>
        <button className="text-slate-400 hover:text-slate-200" title="Add layer">＋</button>
      </header>
      <div className="overflow-y-auto p-2 space-y-0.5">
        {scene ? <Tree node={scene.root} depth={0} selected={selectedNodeId} onSelect={selectNode} onToggle={toggleVisibility} />
               : <p className="text-slate-500 text-sm px-2 py-4">Drop a .psd or .ai file to begin.</p>}
      </div>
    </aside>
  );
}

function Tree({ node, depth, selected, onSelect, onToggle }: {
  node: SceneNode; depth: number; selected: string | null;
  onSelect: (id: string) => void; onToggle: (id: string) => void;
}) {
  const isSelected = node.id === selected;
  return (
    <>
      <div
        onClick={() => onSelect(node.id)}
        className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer
          ${isSelected ? 'bg-accent-500/20 text-white' : 'hover:bg-ink-800 text-slate-300'}`}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        <span className="w-4 text-center text-slate-500">{icon(node)}</span>
        <span className="flex-1 truncate">{prefix(node)}{node.name}</span>
        <button onClick={(e) => { e.stopPropagation(); onToggle(node.id); }} className="text-slate-500 hover:text-slate-200">
          {node.visible ? '👁' : '⊘'}
        </button>
      </div>
      {node.type === 'group' && node.visible && node.children.map((c) => (
        <Tree key={c.id} node={c} depth={depth + 1} selected={selected} onSelect={onSelect} onToggle={onToggle} />
      ))}
    </>
  );
}

const icon = (n: SceneNode) =>
  n.type === 'group' ? '▸' : n.type === 'text' ? 'T' : n.type === 'image' ? '▣' : '◆';

const prefix = (n: SceneNode) =>
  n.id === 'root' ? 'Ps ' : '';
