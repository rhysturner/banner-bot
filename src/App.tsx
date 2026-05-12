import Toolbar       from './components/Toolbar/Toolbar';
import DropZone      from './components/DropZone/DropZone';
import LayersPanel   from './components/Sidebar/LayersPanel';
import Inspector     from './components/Inspector/Inspector';
import CanvasStage   from './components/Canvas/CanvasStage';
import PreviewStrip  from './components/PreviewStrip/PreviewStrip';
import { useEditor } from './store/editorStore';

export default function App() {
  const { scene } = useEditor();

  return (
    <div className="h-screen flex flex-col">
      {/* top bar — title + tools + drop zone */}
      <header className="h-14 border-b border-ink-700 bg-ink-900 flex items-center px-4 gap-4 shrink-0">
        <h1 className="text-sm font-semibold tracking-wide">BannerBot — Automated Ad Resizer</h1>
        <div className="ml-4"><Toolbar /></div>
        <div className="ml-auto flex items-center gap-3">
          <DropZone />
          <span className="text-xs text-slate-400">
            {scene ? `${scene.width}×${scene.height} master` : 'No template loaded'}
          </span>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <LayersPanel />
        <div className="flex-1 flex flex-col min-w-0">
          <CanvasStage />
          <PreviewStrip />
        </div>
        <Inspector />
      </div>
    </div>
  );
}
