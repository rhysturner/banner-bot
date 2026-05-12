import { useEditor } from '../../store/editorStore';
import type { SceneNode } from '../../types';

export default function Inspector() {
  const { scene, selectedNodeId, updateNode } = useEditor();
  const node = scene ? find(scene.root, selectedNodeId) : null;

  return (
    <aside className="w-72 bg-ink-900 border-l border-ink-700 p-4 space-y-4 overflow-y-auto">
      {!node && <p className="text-slate-500 text-sm">Select a layer to edit its properties.</p>}
      {node?.type === 'text'  && <TextProps  node={node} update={(p) => updateNode(node.id, p)} />}
      {node?.type === 'shape' && <ShapeProps node={node} update={(p) => updateNode(node.id, p)} />}
      {node?.type === 'image' && <FrameProps node={node} update={(p) => updateNode(node.id, p)} />}
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg bg-ink-800 border border-ink-700">
      <header className="px-3 py-2 text-xs uppercase tracking-wider text-slate-400 border-b border-ink-700">{title}</header>
      <div className="p-3 space-y-2 text-sm">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[80px_1fr] items-center gap-2">
      <span className="text-slate-400">{label}</span>
      <div>{children}</div>
    </div>
  );
}

const input = 'w-full bg-ink-700 border border-ink-600 rounded px-2 py-1 text-slate-100 focus:outline-none focus:border-accent-500';

function TextProps({ node, update }: { node: any; update: (p: any) => void }) {
  return (
    <Section title="Text Properties">
      <Row label="Content"><input className={input} value={node.text} onChange={(e) => update({ text: e.target.value })} /></Row>
      <Row label="Font"><input className={input} value={node.fontFamily} onChange={(e) => update({ fontFamily: e.target.value })} /></Row>
      <Row label="Style">
        <select className={input} value={String(node.fontWeight)} onChange={(e) => update({ fontWeight: Number(e.target.value) })}>
          <option value="400">Regular</option><option value="500">Medium</option>
          <option value="700">Bold</option><option value="900">Black</option>
        </select>
      </Row>
      <Row label="Size"><input className={input} type="number" value={node.fontSize} onChange={(e) => update({ fontSize: Number(e.target.value) })} /></Row>
      <Row label="Color"><input className="h-8 w-full rounded bg-ink-700" type="color" value={toHex(node.fill)} onChange={(e) => update({ fill: e.target.value })} /></Row>
      <Row label="Align">
        <div className="flex gap-1">
          {(['left','center','right'] as const).map((a) => (
            <button key={a} onClick={() => update({ align: a })}
              className={`flex-1 py-1 rounded text-xs ${node.align === a ? 'bg-accent-500 text-white' : 'bg-ink-700 text-slate-300'}`}>{a}</button>
          ))}
        </div>
      </Row>
    </Section>
  );
}

function ShapeProps({ node, update }: { node: any; update: (p: any) => void }) {
  return (
    <Section title="Shape Properties">
      <Row label="Fill"><input className="h-8 w-full rounded bg-ink-700" type="color" value={toHex(node.fill)} onChange={(e) => update({ fill: e.target.value })} /></Row>
      <Row label="Stroke"><input className={input} value={node.stroke ?? ''} onChange={(e) => update({ stroke: e.target.value })} /></Row>
      <Row label="Radius"><input className={input} type="number" value={node.cornerRadius ?? 0} onChange={(e) => update({ cornerRadius: Number(e.target.value) })} /></Row>
    </Section>
  );
}

function FrameProps({ node, update }: { node: any; update: (p: any) => void }) {
  return (
    <Section title="Frame">
      <Row label="X"><input className={input} type="number" value={Math.round(node.x)} onChange={(e) => update({ x: Number(e.target.value) })} /></Row>
      <Row label="Y"><input className={input} type="number" value={Math.round(node.y)} onChange={(e) => update({ y: Number(e.target.value) })} /></Row>
      <Row label="W"><input className={input} type="number" value={Math.round(node.width)} onChange={(e) => update({ width: Number(e.target.value) })} /></Row>
      <Row label="H"><input className={input} type="number" value={Math.round(node.height)} onChange={(e) => update({ height: Number(e.target.value) })} /></Row>
    </Section>
  );
}

function find(node: SceneNode, id: string | null): SceneNode | null {
  if (!id) return null;
  if (node.id === id) return node;
  if (node.type === 'group') for (const c of node.children) { const r = find(c, id); if (r) return r; }
  return null;
}

function toHex(c?: string) {
  if (!c) return '#000000';
  if (c.startsWith('#')) return c.length === 7 ? c : '#000000';
  const m = c.match(/rgba?\((\d+),(\d+),(\d+)/);
  if (!m) return '#000000';
  return '#' + [m[1], m[2], m[3]].map((v) => Number(v).toString(16).padStart(2, '0')).join('');
}
