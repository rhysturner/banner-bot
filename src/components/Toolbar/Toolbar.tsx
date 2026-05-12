const tools = [
  { id: 'move',  label: 'Move',      icon: '✥', active: true },
  { id: 'frame', label: 'Frame',     icon: '▭' },
  { id: 'rect',  label: 'Rectangle', icon: '◻' },
  { id: 'text',  label: 'Text',      icon: 'T' },
  { id: 'pen',   label: 'Pen',       icon: '✎' },
  { id: 'zoom',  label: 'Zoom',      icon: '⌕' },
];

export default function Toolbar() {
  return (
    <div className="flex items-center gap-1 px-2">
      {tools.map((t) => (
        <button
          key={t.id}
          title={t.label}
          className={`flex flex-col items-center justify-center w-14 h-12 rounded-md text-xs gap-0.5
            ${t.active ? 'bg-accent-500 text-white' : 'text-slate-300 hover:bg-ink-700'}`}
        >
          <span className="text-base leading-none">{t.icon}</span>
          <span className="text-[10px] leading-none">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
