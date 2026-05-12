import { useEditor } from '../../store/editorStore';
import { exportZip } from '../../lib/exporter';
import ArtboardThumbnail from '../Canvas/ArtboardThumbnail';

export default function PreviewStrip() {
  const { scene, artboards, overrides, activeArtboardId, setActiveArtboard, exporting, setExporting } = useEditor();
  if (!scene || !artboards.length) return null;

  const onExport = async () => {
    setExporting({ running: true, done: 0, total: artboards.length });
    const blob = await exportZip(scene, artboards, overrides, 'png', (done, total) =>
      setExporting({ running: true, done, total })
    );
    setExporting({ running: false, done: 0, total: 0 });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'banners.zip'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-ink-900 border-t border-ink-700 px-6 py-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">Generated Banners (Preview)</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            {exporting.running ? `Processing ${exporting.done}/${exporting.total} banners…` : `${artboards.length} artboards`}
          </span>
          <button onClick={onExport} disabled={exporting.running}
            className="bg-accent-500 text-white text-xs px-3 py-1.5 rounded-md font-medium disabled:opacity-50">
            Export All (.zip)
          </button>
        </div>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {artboards.map((ab) => (
          <ArtboardThumbnail
            key={ab.id} scene={scene} artboard={ab}
            overrides={overrides[ab.id] ?? {}}
            active={ab.id === activeArtboardId}
            onClick={() => setActiveArtboard(ab.id)}
          />
        ))}
      </div>
    </div>
  );
}
