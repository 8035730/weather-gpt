
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getPointForecast } from '../services/weatherService';
import { Settings } from '../types';

// Declare L as any to access the global Leaflet variable
declare const L: any;

interface MapViewProps {
  latitude: number;
  longitude: number;
  onClose: () => void;
  openWeatherApiKey?: string;
  tomorrowIoApiKey?: string;
  locationName?: string;
  settings: Settings; 
}

type Provider = 'rainviewer' | 'owm' | 'tomorrow';

interface RainViewerFrame {
    time: number;
    path: string;
}

const MapView: React.FC<MapViewProps> = ({ latitude, longitude, onClose, openWeatherApiKey, tomorrowIoApiKey, locationName, settings }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const baseLayerRef = useRef<any>(null);
  const overlayLayerRef = useRef<any>(null);
  const clickMarkerRef = useRef<any>(null);

  // Map State
  const [activeBase, setActiveBase] = useState<'dark' | 'satellite' | 'light'>('dark');
  const [activeProvider, setActiveProvider] = useState<Provider>('rainviewer');
  const [activeLayer, setActiveLayer] = useState<string>('radar');
  const [layerOpacity, setLayerOpacity] = useState(0.8);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Timeline State
  const [frames, setFrames] = useState<RainViewerFrame[]>([]);
  const [frameIndex, setFrameIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<number | null>(null);

  // Point Investigation State
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [isFetchingPoint, setIsFetchingPoint] = useState(false);

  // Initialize Data & Fetch Timeline
  useEffect(() => {
    if (activeProvider === 'rainviewer') {
        fetch('https://api.rainviewer.com/public/weather-maps.json')
          .then(res => res.json())
          .then(data => {
            const radarFrames = data.radar?.past || [];
            const forecastFrames = data.radar?.nowcast || [];
            const allFrames = [...radarFrames, ...forecastFrames];
            setFrames(allFrames);
            // Default to the last "past" frame (usually "now")
            setFrameIndex(radarFrames.length - 1);
          })
          .catch(e => console.warn("Failed to fetch RainViewer timeline", e));
    } else {
        setFrames([]);
        setFrameIndex(-1);
        setIsPlaying(false);
    }
  }, [activeProvider]);

  // Handle Map Interaction
  const handleMapClick = useCallback(async (e: any) => {
    const { lat, lng } = e.latlng;
    
    if (clickMarkerRef.current) mapInstanceRef.current.removeLayer(clickMarkerRef.current);
    
    const marker = L.circleMarker([lat, lng], {
        radius: 8,
        fillColor: "#3b82f6",
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
    }).addTo(mapInstanceRef.current);
    clickMarkerRef.current = marker;

    setIsFetchingPoint(true);
    setSelectedLocation({ lat, lng });

    try {
      const data = await getPointForecast(lat, lng, settings);
      if (data) {
        setSelectedLocation({ ...data, lat, lng });
      }
    } catch (err) {
      console.error("Point fetch error", err);
    } finally {
      setIsFetchingPoint(false);
    }
  }, [settings]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: false 
      }).setView([latitude, longitude], 7);

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      
      const marker = L.marker([latitude, longitude]).addTo(map);
      if (locationName) marker.bindPopup(`<b>${locationName}</b>`).openPopup();

      map.on('click', handleMapClick);
      mapInstanceRef.current = map;
    }
  }, [latitude, longitude, locationName, handleMapClick]);

  // Handle Base Layer
  useEffect(() => {
      if (!mapInstanceRef.current) return;
      if (baseLayerRef.current) mapInstanceRef.current.removeLayer(baseLayerRef.current);

      const layers: Record<string, string> = {
          satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
          dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      };

      const layer = L.tileLayer(layers[activeBase], {
          attribution: activeBase === 'satellite' ? 'Esri, Maxar' : '&copy; CARTO'
      });

      layer.addTo(mapInstanceRef.current);
      layer.bringToBack();
      baseLayerRef.current = layer;
  }, [activeBase]);

  // Handle Overlay Layer
  useEffect(() => {
      if (!mapInstanceRef.current) return;
      if (overlayLayerRef.current) mapInstanceRef.current.removeLayer(overlayLayerRef.current);

      if (activeLayer === 'none') return;

      let layer = null;
      const layerOptions = {
        opacity: layerOpacity,
        attribution: activeProvider === 'rainviewer' ? 'RainViewer' : activeProvider === 'owm' ? 'OpenWeatherMap' : 'Tomorrow.io'
      };

      if (activeProvider === 'rainviewer' && frames.length > 0 && frameIndex >= 0) {
          const frame = frames[frameIndex];
          if (activeLayer === 'radar') {
              layer = L.tileLayer(`https://tile.rainviewer.com${frame.path}/256/{z}/{x}/{y}/2/1_1.png`, layerOptions);
          } else if (activeLayer === 'satellite') {
               layer = L.tileLayer(`https://tile.rainviewer.com${frame.path}/256/{z}/{x}/{y}/0/1_1.png`, layerOptions);
          }
      } 
      else if (activeProvider === 'owm' && openWeatherApiKey) {
          const layerMap: any = { 'temp': 'temp_new', 'clouds': 'clouds_new', 'wind': 'wind_new', 'rain': 'precipitation_new' };
          if (layerMap[activeLayer]) {
            layer = L.tileLayer(`https://tile.openweathermap.org/map/${layerMap[activeLayer]}/{z}/{x}/{y}.png?appid=${openWeatherApiKey}`, layerOptions);
          }
      }
      else if (activeProvider === 'tomorrow' && tomorrowIoApiKey) {
          const time = new Date().toISOString();
          layer = L.tileLayer(`https://api.tomorrow.io/v4/map/tile/{z}/{x}/{y}/${activeLayer}/${time}.png?apikey=${tomorrowIoApiKey}`, layerOptions);
      }

      if (layer) {
          layer.addTo(mapInstanceRef.current);
          overlayLayerRef.current = layer;
      }
  }, [activeProvider, activeLayer, frames, frameIndex, layerOpacity, openWeatherApiKey, tomorrowIoApiKey]);

  // Animation logic - 500ms loop for better radar visualization
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = window.setInterval(() => {
        setFrameIndex(prev => (prev + 1) % frames.length);
      }, 500);
    } else if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
    }
    return () => { if (playIntervalRef.current) clearInterval(playIntervalRef.current); };
  }, [isPlaying, frames.length]);

  const SettingsPanel = () => (
      <div className="absolute top-0 right-0 h-full w-80 bg-black/90 backdrop-blur-2xl border-l border-white/10 p-6 transform transition-transform duration-300 z-40 overflow-y-auto pointer-events-auto shadow-2xl">
          <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-white font-bold text-xl tracking-tight">Map Strategy</h3>
                <p className="text-gray-400 text-xs mt-1">Configure global overlays</p>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
          </div>

          <div className="space-y-8">
            <section>
                <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-4">Base Canvas</h4>
                <div className="grid grid-cols-3 gap-2">
                    {['dark', 'satellite', 'light'].map(mode => (
                        <button key={mode} onClick={() => setActiveBase(mode as any)} className={`py-2 px-1 rounded-lg text-[10px] font-bold uppercase tracking-tighter border transition-all ${activeBase === mode ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}>
                            {mode}
                        </button>
                    ))}
                </div>
            </section>

            <section>
                <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-4">Data Source</h4>
                <div className="space-y-2">
                    {[
                        { id: 'rainviewer', name: 'RainViewer (Global/Free)', enabled: true },
                        { id: 'owm', name: 'OpenWeatherMap', enabled: !!openWeatherApiKey },
                        { id: 'tomorrow', name: 'Tomorrow.io (Premium)', enabled: !!tomorrowIoApiKey }
                    ].map(p => (
                        <button 
                            key={p.id} 
                            disabled={!p.enabled}
                            onClick={() => setActiveProvider(p.id as any)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${activeProvider === p.id ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 disabled:opacity-30 disabled:grayscale'}`}
                        >
                            <span className="text-xs font-semibold">{p.name}</span>
                            {!p.enabled && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>}
                        </button>
                    ))}
                </div>
            </section>

            <section>
                <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-4">Active Overlay</h4>
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setActiveLayer('none')} className={`p-2.5 rounded-lg text-xs font-bold border transition-all ${activeLayer === 'none' ? 'bg-red-500/20 border-red-500 text-red-200 shadow-lg' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}>None</button>
                    
                    {activeProvider === 'rainviewer' && (
                        <>
                            <button onClick={() => setActiveLayer('radar')} className={`p-2.5 rounded-lg text-xs font-bold border transition-all ${activeLayer === 'radar' ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}>Radar</button>
                            <button onClick={() => setActiveLayer('satellite')} className={`p-2.5 rounded-lg text-xs font-bold border transition-all ${activeLayer === 'satellite' ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}>Satellite</button>
                        </>
                    )}

                    {activeProvider === 'owm' && (
                        ['temp', 'wind', 'clouds', 'rain'].map(l => (
                            <button key={l} onClick={() => setActiveLayer(l)} className={`p-2.5 rounded-lg text-xs font-bold capitalize border transition-all ${activeLayer === l ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}>{l}</button>
                        ))
                    )}

                    {activeProvider === 'tomorrow' && (
                        ['precipitationIntensity', 'temperature', 'windSpeed', 'cloudCover', 'visibility'].map(l => (
                            <button key={l} onClick={() => setActiveLayer(l)} className={`p-2.5 rounded-lg text-xs font-bold capitalize border transition-all ${activeLayer === l ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}>{l.replace(/([A-Z])/g, ' $1')}</button>
                        ))
                    )}
                </div>
            </section>

            <section className="bg-white/5 p-4 rounded-2xl border border-white/10 shadow-inner">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Intensity</h4>
                    <span className="text-xs font-mono font-bold text-blue-400">{Math.round(layerOpacity * 100)}%</span>
                </div>
                <input 
                    type="range" 
                    min="0" max="1" step="0.01" 
                    value={layerOpacity} 
                    onChange={(e) => setLayerOpacity(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
                />
            </section>
          </div>
      </div>
  );

  const LocationDetailPanel = () => {
    if (!selectedLocation) return null;
    const tempUnit = settings.units === 'metric' ? '°C' : '°F';

    return (
        <div className="absolute top-20 left-6 z-30 w-80 max-h-[80%] bg-black/80 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl pointer-events-auto flex flex-col animate-in slide-in-from-left duration-500">
            <div className="p-5 bg-gemini-gradient">
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <h3 className="text-white font-bold leading-tight text-lg drop-shadow-md">{selectedLocation.location || "Investigation Area"}</h3>
                        <p className="text-white/60 text-[10px] mt-1 font-mono tracking-tighter">{selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}</p>
                    </div>
                    <button onClick={() => {
                        setSelectedLocation(null);
                        if (clickMarkerRef.current) mapInstanceRef.current.removeLayer(clickMarkerRef.current);
                    }} className="p-1.5 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-6">
                {isFetchingPoint ? (
                    <div className="py-12 flex flex-col items-center justify-center space-y-4">
                        <div className="relative w-12 h-12">
                            <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <p className="text-xs text-blue-400 font-bold uppercase tracking-widest animate-pulse">Running Deep Analysis...</p>
                    </div>
                ) : (
                    <>
                        {selectedLocation.current && (
                            <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                                <div>
                                    <div className="text-4xl font-bold text-white tracking-tighter">{Math.round(selectedLocation.current.temperature)}{tempUnit}</div>
                                    <div className="text-xs text-blue-400 font-bold uppercase tracking-wide mt-1">{selectedLocation.current.condition}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Historical Avg</div>
                                    <div className="text-xl font-bold text-gray-200 tracking-tight">{Math.round(selectedLocation.current.historicalAvg)}{tempUnit}</div>
                                </div>
                            </div>
                        )}

                        {selectedLocation.historicalContext && (
                            <div className="bg-blue-600/10 p-4 rounded-2xl border border-blue-500/20">
                                <h4 className="text-[10px] text-blue-400 font-bold uppercase mb-2 flex items-center gap-2">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                    Climate Investigation
                                </h4>
                                <p className="text-xs text-gray-300 leading-relaxed font-medium italic">"{selectedLocation.historicalContext}"</p>
                            </div>
                        )}

                        {selectedLocation.hourly && (
                             <div className="space-y-3">
                                <h4 className="text-[10px] text-gray-500 font-bold uppercase tracking-widest pl-1">24-Hour Trajectory</h4>
                                <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
                                    {selectedLocation.hourly.map((h: any, i: number) => (
                                        <div key={i} className="flex-shrink-0 w-20 bg-white/5 p-3 rounded-2xl border border-white/5 text-center transition-transform hover:scale-105">
                                            <div className="text-[10px] text-gray-400 font-bold">{h.time}</div>
                                            <div className="text-base font-bold text-white my-1">{Math.round(h.temperature)}{tempUnit}</div>
                                            <div className="text-[9px] text-blue-400 font-medium truncate">{h.condition}</div>
                                        </div>
                                    ))}
                                </div>
                             </div>
                        )}
                        
                        <button 
                            onClick={() => onClose()} 
                            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 rounded-2xl text-xs font-bold text-white transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
                            Execute Global Strategy
                        </button>
                    </>
                )}
            </div>
        </div>
    );
  };

  const renderTimeMachine = () => {
    if (frames.length === 0 || activeProvider !== 'rainviewer') return null;
    
    const currentFrame = frames[frameIndex];
    const date = currentFrame ? new Date(currentFrame.time * 1000) : null;
    const timeString = date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    
    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-black/60 backdrop-blur-xl border border-white/10 p-4 rounded-2xl pointer-events-auto z-20 flex items-center gap-4 shadow-2xl">
            <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2.5 bg-blue-600 hover:bg-blue-500 rounded-full text-white transition-all shadow-lg"
            >
                {isPlaying ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                )}
            </button>
            
            <div className="flex-1 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Weather Timeline</span>
                    <span className="text-xs font-mono text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded border border-blue-400/20">{timeString}</span>
                </div>
                <input 
                    type="range" 
                    min="0" 
                    max={frames.length - 1} 
                    value={frameIndex} 
                    onChange={(e) => {
                        setFrameIndex(parseInt(e.target.value));
                        setIsPlaying(false);
                    }}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
                />
            </div>
        </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black pointer-events-none overflow-hidden font-sans">
      {/* HUD Header */}
      <div className="flex items-center justify-between p-6 z-40 absolute top-0 left-0 w-full pointer-events-none">
        <div className="flex items-center gap-6 pointer-events-auto">
             <button onClick={onClose} className="group p-3 bg-black/40 hover:bg-blue-600 backdrop-blur-md rounded-2xl border border-white/10 transition-all shadow-2xl">
                <svg className="w-6 h-6 text-white group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
             </button>
             <div className="bg-black/40 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/10 shadow-2xl">
                <h2 className="text-white font-bold text-xl tracking-tight leading-none drop-shadow-md">{locationName || 'Global Grid'}</h2>
                <div className="flex items-center gap-2 mt-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_#3b82f6]"></span>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Real-time Visualization</p>
                </div>
             </div>
        </div>
        
        <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="pointer-events-auto p-3 bg-black/40 hover:bg-blue-600 backdrop-blur-md rounded-2xl border border-white/10 transition-all shadow-2xl group">
            <svg className="w-6 h-6 text-white group-hover:rotate-45 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m10 0a2 2 0 100-4m0 4a2 2 0 110-4m-4 6v2m0-2a2 2 0 100-4m0 4a2 2 0 110-4m0-2V8m-6 6h2m5 0h2m-9 0H4" /></svg>
        </button>
      </div>
      
      {/* Panels */}
      {isSettingsOpen && <SettingsPanel />}
      <LocationDetailPanel />
      {renderTimeMachine()}

      {/* Map Container */}
      <div ref={mapContainerRef} className="flex-1 w-full h-full bg-[#0a0a0a] pointer-events-auto" />
      
      {/* Legend / Status HUD */}
      <div className="absolute bottom-6 left-6 z-10 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl">
             <div className="flex items-center gap-3 mb-2">
                 <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></div>
                 <span className="text-[10px] text-white font-bold uppercase tracking-widest">{activeProvider === 'owm' ? 'OpenWeatherMap' : activeProvider === 'tomorrow' ? 'Tomorrow.io' : 'RainViewer'}</span>
             </div>
             <div className="text-[10px] text-gray-400 font-medium capitalize tracking-tight">{activeLayer.replace(/([A-Z])/g, ' $1').trim()} Deployment Active</div>
             <div className="mt-3 pt-3 border-t border-white/5 text-[9px] text-blue-400 font-bold uppercase tracking-widest">Target selected point for local context</div>
          </div>
      </div>
    </div>
  );
};

export default MapView;
