import { useState } from 'react';
import { MOCK_DEVICES } from '@/lib/mock-data';
import type { Device } from '@/types';
import { cn } from '@/lib/utils';
import { Camera, ShieldAlert, Monitor, DoorClosed, Power } from 'lucide-react';

export function MapView() {
  const [activeFloor, setActiveFloor] = useState('B1');
  const [selectedDevice, setSelectedAlarm] = useState<Device | null>(null);

  const floors = ['Roof', 'L3', 'L2', 'L1', 'B1'];

  const getStatusColor = (status: Device['status']) => {
    switch (status) {
      case 'online': return 'text-psim-green bg-psim-green/10 border-psim-green/30';
      case 'alarm': return 'text-psim-red bg-psim-red/10 border-psim-red/30 animate-pulse';
      case 'offline': return 'text-t2 bg-bg3 border-border-dim';
      case 'warn': return 'text-psim-orange bg-psim-orange/10 border-psim-orange/30';
      default: return 'text-psim-accent bg-psim-accent/10 border-psim-accent/30';
    }
  };

  const getDeviceIcon = (type: Device['type']) => {
    switch (type) {
      case 'camera': return <Camera size={14} />;
      case 'barrier': return <ShieldAlert size={14} />;
      case 'door': return <DoorClosed size={14} />;
      default: return <Monitor size={14} />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg0">
      {/* Map Header */}
      <div className="p-3.5 flex items-center gap-2.5 border-b border-border-dim shrink-0">
        <div className="font-heading text-[15px] font-semibold text-t0">Situational Map</div>
        <div className="flex gap-0.5 bg-bg2 rounded-md p-0.5 ml-4">
          {floors.map(floor => (
            <button
              key={floor}
              className={cn(
                "px-4 py-1 text-[11px] font-bold rounded-md cursor-pointer transition-colors",
                activeFloor === floor ? 'bg-psim-accent text-bg0 shadow-[0_0_10px_var(--accent)]' : 'text-t2 hover:bg-bg3 hover:text-t1'
              )}
              onClick={() => setActiveFloor(floor)}
            >
              {floor}
            </button>
          ))}
        </div>
        <div className="text-[10px] text-t-2 font-mono ml-auto">
          Active Devices: {MOCK_DEVICES.filter(d => d.status === 'online').length}/{MOCK_DEVICES.length}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Map Area */}
        <div className="flex-1 bg-bg1 relative overflow-hidden flex items-center justify-center">
          {/* Mock Map Background (SVG Drawing) */}
          <div className="relative w-[800px] h-[500px] border-2 border-border-dim rounded-xl bg-bg0/50 overflow-hidden shadow-inner">
            <svg width="100%" height="100%" viewBox="0 0 800 500" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="800" height="500" fill="url(#grid)" />
              <path d="M100 50H700V450H100V50Z" stroke="var(--border-dim)" strokeWidth="2" strokeDasharray="4 4" />
              <path d="M250 50V200H100" stroke="var(--border-dim)" strokeWidth="1" />
              <path d="M550 50V200H700" stroke="var(--border-dim)" strokeWidth="1" />
              <path d="M100 350H300V450" stroke="var(--border-dim)" strokeWidth="1" />
              <circle cx="400" cy="250" r="40" stroke="var(--border-dim)" strokeWidth="1" />
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                </pattern>
              </defs>
            </svg>

            {/* Device Markers */}
            <div 
              className="absolute top-[120px] left-[180px] cursor-pointer group"
              onClick={() => setSelectedAlarm(MOCK_DEVICES[0])}
            >
              <div className="w-8 h-8 rounded-full bg-psim-green/20 border border-psim-green flex items-center justify-center text-psim-green shadow-[0_0_10px_rgba(0,214,143,0.4)] transition-transform hover:scale-110">
                <Camera size={16} />
              </div>
              <div className="absolute top-9 left-1/2 -translate-x-1/2 bg-bg2 text-[9px] px-1.5 py-0.5 rounded border border-border-dim whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">CAM-B1-01</div>
            </div>

            <div 
              className="absolute top-[380px] left-[250px] cursor-pointer group"
              onClick={() => setSelectedAlarm(MOCK_DEVICES[1])}
            >
              <div className="w-8 h-8 rounded-full bg-psim-red/20 border border-psim-red flex items-center justify-center text-psim-red shadow-[0_0_15px_rgba(255,59,92,0.6)] animate-pulse transition-transform hover:scale-110">
                <Camera size={16} />
              </div>
              <div className="absolute top-9 left-1/2 -translate-x-1/2 bg-bg2 text-[9px] px-1.5 py-0.5 rounded border border-border-dim whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity font-bold text-psim-red">ALARM · CAM-B1-04</div>
            </div>

            <div 
              className="absolute top-[220px] left-[450px] cursor-pointer group"
              onClick={() => setSelectedAlarm(MOCK_DEVICES[5])}
            >
              <div className="w-8 h-8 rounded-full bg-psim-accent/20 border border-psim-accent flex items-center justify-center text-psim-accent shadow-[0_0_10px_rgba(0,194,255,0.4)] transition-transform hover:scale-110">
                <ShieldAlert size={16} />
              </div>
              <div className="absolute top-9 left-1/2 -translate-x-1/2 bg-bg2 text-[9px] px-1.5 py-0.5 rounded border border-border-dim whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">BAR-B1-01</div>
            </div>
          </div>

          {/* Map Controls */}
          <div className="absolute bottom-6 right-6 flex flex-col gap-2">
            <button className="w-10 h-10 bg-bg2 border border-border-dim rounded-lg flex items-center justify-center text-t1 hover:bg-bg3 transition-colors shadow-lg">+</button>
            <button className="w-10 h-10 bg-bg2 border border-border-dim rounded-lg flex items-center justify-center text-t1 hover:bg-bg3 transition-colors shadow-lg">-</button>
            <button className="w-10 h-10 bg-bg2 border border-border-dim rounded-lg flex items-center justify-center text-psim-accent hover:bg-bg3 transition-colors shadow-lg">🎯</button>
          </div>
        </div>

        {/* Right Detail Panel */}
        <div className="w-[320px] bg-bg0 border-l border-border-dim flex flex-col overflow-y-auto">
          {!selectedDevice ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-bg2 flex items-center justify-center text-t2">
                <Monitor size={32} />
              </div>
              <div>
                <div className="text-t1 font-medium">No Device Selected</div>
                <div className="text-t2 text-[11px] mt-1">Select a marker on the map to view real-time data</div>
              </div>
            </div>
          ) : (
            <div className="p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-psim-accent">{selectedDevice.id}</div>
                  <h3 className="text-t0 font-bold">{selectedDevice.name}</h3>
                </div>
                <div className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border", getStatusColor(selectedDevice.status))}>
                  {selectedDevice.status.toUpperCase()}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-bg2 p-2.5 rounded-lg border border-border-dim">
                  <div className="text-[9px] text-t2 uppercase font-mono mb-1">Type</div>
                  <div className="text-[12px] flex items-center gap-1.5 text-t1">
                    {getDeviceIcon(selectedDevice.type)}
                    {selectedDevice.type.toUpperCase()}
                  </div>
                </div>
                <div className="bg-bg2 p-2.5 rounded-lg border border-border-dim">
                  <div className="text-[9px] text-t2 uppercase font-mono mb-1">Location</div>
                  <div className="text-[12px] text-t1">{selectedDevice.loc}</div>
                </div>
              </div>

              <div className="bg-bg2 p-3 rounded-lg border border-border-dim">
                <div className="text-[10px] text-psim-accent font-mono mb-3 flex items-center gap-2">
                  <Power size={12} />
                  LIVE TELEMETRY
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-t2">Framerate</span>
                    <span className="text-t1 font-mono">{selectedDevice.fps || 0} FPS</span>
                  </div>
                  <div className="w-full h-1 bg-bg3 rounded-full overflow-hidden">
                    <div className="h-full bg-psim-green" style={{ width: '85%' }}></div>
                  </div>
                  <div className="flex justify-between items-center text-[11px] mt-3">
                    <span className="text-t2">Resolution</span>
                    <span className="text-t1 font-mono">{selectedDevice.res || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-t2">Connectivity</span>
                    <span className="text-psim-green font-mono">99.2%</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <button className="w-full py-2 bg-psim-accent2 text-white text-[12px] font-bold rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2">
                  <Monitor size={14} />
                  VIEW LIVE STREAM
                </button>
                <button className="w-full py-2 bg-bg3 border border-border-dim text-t1 text-[12px] font-medium rounded-lg hover:bg-bg4 transition-all">
                  DEVICE CONFIGURATION
                </button>
              </div>

              {/* Maintenance Log */}
              <div className="mt-2">
                <div className="text-[10px] text-t2 font-mono uppercase mb-2">Maintenance History</div>
                <div className="space-y-2">
                  <div className="flex gap-2 border-l-2 border-border-dim pl-3 py-1">
                    <div className="text-[11px]">
                      <div className="text-t1">Routine Inspection</div>
                      <div className="text-t2 text-[10px]">24 Mar 2026 · Operator 02</div>
                    </div>
                  </div>
                  <div className="flex gap-2 border-l-2 border-border-dim pl-3 py-1">
                    <div className="text-[11px]">
                      <div className="text-t1">Firmware Updated</div>
                      <div className="text-t2 text-[10px]">10 Feb 2026 · System</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
