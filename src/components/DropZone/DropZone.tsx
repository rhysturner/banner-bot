import { useRef } from 'react';
import { parsePsd } from '../../lib/psdParser';
import { parseAi }  from '../../lib/aiParser';
import { parseCsv } from '../../lib/csvParser';
import { useEditor } from '../../store/editorStore';

export default function DropZone() {
  const ref = useRef<HTMLInputElement | null>(null);
  const { setScene, setArtboards } = useEditor();

  const handle = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'psd') setScene(await parsePsd(file));
      else if (ext === 'ai' || ext === 'pdf') setScene(await parseAi(file));
      else if (ext === 'csv') {
        const { artboards, overrides } = await parseCsv(file);
        setArtboards(artboards, overrides);
      }
    }
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); handle(e.dataTransfer.files); }}
      onClick={() => ref.current?.click()}
      className="cursor-pointer rounded-md border border-dashed border-ink-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-ink-800"
    >
      Drop .psd / .ai / .csv
      <input ref={ref} type="file" multiple accept=".psd,.ai,.pdf,.csv" className="hidden"
             onChange={(e) => handle(e.target.files)} />
    </div>
  );
}
