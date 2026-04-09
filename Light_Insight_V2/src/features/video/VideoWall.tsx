import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Maximize2, Search, Video, CameraOff, Play, LayoutGrid, Square, Grid3X3 } from 'lucide-react';
import { MOCK_DEVICES } from '@/lib/mock-data';

type LayoutType = '1x1' | '2x2' | '4x3';

export function VideoWall() {
  const [layout, setLayout] = useState<LayoutType>('4x3');
  const [isAlarmPopupOn, setIsAlarmPopupOn] = useState(true);

  const cameras = MOCK_DEVICES.filter(d => d.type === 'camera');

  const getGridLayout = () => {
    switch (layout) {
      case '1x1': return 'grid-cols-1 grid-rows-1';
      case '2x2': return 'grid-cols-2 grid-rows-2';
      case '4x3': return 'grid-cols-4 grid-rows-3';
      default: return 'grid-cols-4 grid-rows-3';
    }
  };

  const visibleCameras = cameras.slice(0, layout === '1x1' ? 1 : layout === '2x2' ? 4 : 12);

  return (
    <div className="flex flex-col h-full overflow-hidden font-sans">
      {/* Header Toolbar */}
      <header className="h-12 border-b border-white/5 bg-bg1 flex items-center px-4 gap-4 shrink-0">
        <h1 className="text-[15px] font-semibold text-t-0 tracking-tight">
          Video Wall
        </h1>
        
        <div className="flex gap-1 bg-bg2 p-1 rounded-md border border-border-dim ml-4">
          <button 
            onClick={() => setLayout('4x3')}
            className={cn(
              "p-1.5 rounded transition-colors",
              layout === '4x3' ? "bg-bg4 text-psim-accent shadow-sm" : "text-t2 hover:text-t1"
            )}
            title="4x3 Grid"
          >
            <Grid3X3 size={16} />
          </button>
          <button 
            onClick={() => setLayout('2x2')}
            className={cn(
              "p-1.5 rounded transition-colors",
              layout === '2x2' ? "bg-bg4 text-psim-accent shadow-sm" : "text-t2 hover:text-t1"
            )}
            title="2x2 Grid"
          >
            <LayoutGrid size={16} />
          </button>
          <button 
            onClick={() => setLayout('1x1')}
            className={cn(
              "p-1.5 rounded transition-colors",
              layout === '1x1' ? "bg-bg4 text-psim-accent shadow-sm" : "text-t2 hover:text-t1"
            )}
            title="Fullscreen"
          >
            <Square size={16} />
          </button>
        </div>

        <div className="text-[10px] text-t2 font-mono ml-4 uppercase tracking-wider">
          {cameras.length} cameras · <span className="text-psim-green">47 online</span> · <span className="text-psim-red">5 offline</span>
        </div>

        <button 
          onClick={() => setIsAlarmPopupOn(!isAlarmPopupOn)}
          className={cn(
            "ml-auto px-3 py-1.5 rounded-md text-[11px] font-medium border transition-all flex items-center gap-2",
            isAlarmPopupOn 
              ? "bg-psim-accent/15 text-psim-accent border-psim-accent/30" 
              : "bg-bg3 text-t2 border-border-dim opacity-60"
          )}
        >
          🗺 {isAlarmPopupOn ? 'Alarm Popup ON' : 'Alarm Popup OFF'}
        </button>
      </header>

      {/* Grid Area */}
      <div className={cn("flex-1 grid gap-0.5 p-0.5", getGridLayout())}>
        {visibleCameras.map((cam) => (
          <div 
            key={cam.id} 
            className={cn(
              "relative group overflow-hidden bg-bg1 flex items-center justify-center border border-white/5",
              cam.status === 'offline' && "bg-bg0"
            )}
          >
            {/* Status indicators */}
            <div className="absolute top-2 left-2 z-10 flex flex-col gap-1.5 pointer-events-none">
              <div className="bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-mono font-bold text-white flex items-center gap-1.5 border border-white/10">
                <span className={cn("w-1.5 h-1.5 rounded-full", cam.status === 'offline' ? "bg-psim-red" : "bg-psim-green")} />
                {cam.id}
              </div>
              {cam.status === 'alarm' && (
                <div className="bg-psim-red text-white px-2 py-0.5 rounded text-[9px] font-bold animate-pulse shadow-lg shadow-psim-red/20">
                  ALARM
                </div>
              )}
            </div>

            <div className="absolute top-2 right-2 z-10 flex gap-1 pointer-events-none">
              <div className="bg-psim-red/20 text-psim-red border border-psim-red/30 px-1.5 py-0.5 rounded text-[8px] font-bold flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-psim-red animate-pulse" />
                REC
              </div>
            </div>

            {/* Video Placeholder Content */}
            {cam.status === 'offline' ? (
              <div className="flex flex-col items-center gap-2 opacity-30">
                <CameraOff size={32} className="text-psim-red" />
                <span className="text-[10px] font-mono text-psim-red uppercase font-bold tracking-widest text-center">
                  Signal Lost<br/>Connection Timeout
                </span>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 pointer-events-none" />
                 <Video size={48} className="text-white/5" />
                 
                 {/* Metadata info at bottom */}
                 <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between z-10">
                    <div className="flex flex-col">
                      <div className="text-[10px] font-semibold text-white/90 truncate max-w-[150px] drop-shadow-md">
                        {cam.name}
                      </div>
                      <div className="text-[8px] font-mono text-t1 uppercase drop-shadow-md">
                        {cam.loc} · {cam.fps || 25} FPS · {cam.res || '1080p'}
                      </div>
                    </div>
                 </div>
              </div>
            )}

            {/* Hover Controls */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-4 z-20">
              <button className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-psim-accent hover:text-bg0 transition-all hover:scale-110">
                <Maximize2 size={18} />
              </button>
              <button className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-psim-accent hover:text-bg0 transition-all hover:scale-110">
                <Search size={18} />
              </button>
              <button className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-psim-accent hover:text-bg0 transition-all hover:scale-110">
                <Play size={18} />
              </button>
            </div>
          </div>
        ))}

        {/* Fill empty slots if necessary */}
        {visibleCameras.length < (layout === '4x3' ? 12 : layout === '2x2' ? 4 : 1) && 
          Array.from({ length: (layout === '4x3' ? 12 : layout === '2x2' ? 4 : 1) - visibleCameras.length }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-bg0/50 border border-white/5 flex items-center justify-center">
               <span className="text-[10px] text-t2 font-mono uppercase tracking-widest opacity-20">No Source</span>
            </div>
          ))
        }
      </div>
    </div>
  );
}
