
import React, { useEffect, useRef, useState } from 'react';

// Declare L as any to access the global Leaflet variable
declare const L: any;

interface MapViewProps {
  latitude: number;
  longitude: number;
  onClose: () => void;
  openWeatherApiKey?: string;
  locationName?: string;
}

const MapView: React.FC<MapViewProps> = ({ latitude, longitude, onClose, openWeatherApiKey, locationName }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const baseLayerRef = useRef<any>(null);
  const overlayLayerRef = useRef<any>(null);

  const [activeOverlay, setActiveOverlay] = useState<string>('radar');
  const [activeBase, setActiveBase] = useState<'dark' | 'satellite'>('dark');
  const [timestamps, setTimestamps] = useState<{ radar?: number, satellite?: number }>({});

  // Fetch RainViewer timestamp for free radar and satellite
  useEffect(() => {
    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then(res => res.json())
      .then(data => {
        const radar = data.radar?.past?.[data.radar.past.length - 1]?.time;
        const satellite = data.satellite?.infrared?.[data.satellite.infrared.length - 1]?.time;
        setTimestamps({ radar, satellite });
      })
      .catch(e => console.warn("Failed to fetch RainViewer timestamp", e));
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: false 
      }).setView([latitude, longitude], 7); // Zoom 7 gives a good regional radar view

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      L.control.attribution({ position: 'bottomright' }).addTo(map);

      // Add Marker
      const marker = L.marker([latitude, longitude]).addTo(map);
      if (locationName) marker.bindPopup(`<b>${locationName}</b>`).openPopup();

      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView([latitude, longitude], 7);
      mapInstanceRef.current.eachLayer((layer: any) => {
          if (layer instanceof L.Marker) {
              layer.setLatLng([latitude, longitude]);
              if (locationName) layer.bindPopup(`<b>${locationName}</b>`).openPopup();
          }
      });
    }

    // Cleanup not strictly necessary for ref-based instance reuse in this context
  }, [latitude, longitude]);

  // Handle Base Layer Changes
  useEffect(() => {
      if (!mapInstanceRef.current) return;

      if (baseLayerRef.current) {
          mapInstanceRef.current.removeLayer(baseLayerRef.current);
      }

      let layer;
      if (activeBase === 'satellite') {
          // Esri World Imagery
          layer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
              attribution: 'Esri, Maxar, Earthstar Geographics'
          });
      } else {
          // Carto Dark
           layer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
              attribution: '&copy; CARTO',
              subdomains: 'abcd',
              maxZoom: 20
          });
      }

      layer.addTo(mapInstanceRef.current);
      layer.bringToBack();
      baseLayerRef.current = layer;
  }, [activeBase]);

  // Handle Overlay Changes
  useEffect(() => {
      if (!mapInstanceRef.current) return;

      if (overlayLayerRef.current) {
          mapInstanceRef.current.removeLayer(overlayLayerRef.current);
          overlayLayerRef.current = null;
      }

      if (!activeOverlay) return;

      let layer = null;

      if (activeOverlay === 'radar' && timestamps.radar) {
          layer = L.tileLayer(`https://tile.rainviewer.com/${timestamps.radar}/256/{z}/{x}/{y}/2/1_1.png`, {
              opacity: 0.8,
              attribution: 'RainViewer'
          });
      } else if (activeOverlay === 'satellite' && timestamps.satellite) {
           layer = L.tileLayer(`https://tile.rainviewer.com/satellite-infrared/${timestamps.satellite}/256/{z}/{x}/{y}/0/1_1.png`, {
              opacity: 0.7,
              attribution: 'RainViewer'
          });
      } else if (openWeatherApiKey && ['temp', 'clouds', 'wind'].includes(activeOverlay)) {
           const layerMap: any = {
              'temp': 'temp_new',
              'clouds': 'clouds_new',
              'wind': 'wind_new'
          };
          const layerUrl = `https://tile.openweathermap.org/map/${layerMap[activeOverlay]}/{z}/{x}/{y}.png?appid=${openWeatherApiKey}`;
          layer = L.tileLayer(layerUrl, { opacity: 0.7, attribution: 'OpenWeatherMap' });
      }

      if (layer) {
          layer.addTo(mapInstanceRef.current);
          layer.bringToFront();
          overlayLayerRef.current = layer;
      }
  }, [activeOverlay, timestamps, openWeatherApiKey]);

  const hasOwm = !!openWeatherApiKey;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 animate-in fade-in duration-200">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-black/60 backdrop-blur-md border-b border-white/10 z-10 absolute top-0 left-0 w-full gap-4">
        <div className="flex items-center gap-4">
             <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors bg-black/20">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
             <div>
                <h2 className="text-white font-bold text-lg leading-none shadow-black drop-shadow-md">Global Radar</h2>
                <p className="text-xs text-gray-300 mt-0.5">{locationName || 'Location View'}</p>
             </div>
        </div>
        
        <div className="flex flex-col gap-2 w-full md:w-auto">
            {/* Base Layer Switcher */}
            <div className="flex bg-black/50 rounded-lg p-1 gap-1 border border-white/10 w-fit">
                <button 
                    onClick={() => setActiveBase('dark')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${activeBase === 'dark' ? 'bg-white text-black' : 'text-gray-400 hover:bg-white/10'}`}
                >
                    Dark Map
                </button>
                <button 
                    onClick={() => setActiveBase('satellite')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${activeBase === 'satellite' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-white/10'}`}
                >
                    Satellite View
                </button>
            </div>

            {/* Overlay Switcher */}
            <div className="flex bg-black/50 rounded-lg p-1 gap-1 border border-white/10 overflow-x-auto no-scrollbar">
                <button 
                    onClick={() => setActiveOverlay(activeOverlay === 'radar' ? '' : 'radar')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${activeOverlay === 'radar' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-300 hover:bg-white/10'}`}
                >
                    Radar
                </button>
                <button 
                    onClick={() => setActiveOverlay(activeOverlay === 'satellite' ? '' : 'satellite')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${activeOverlay === 'satellite' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-300 hover:bg-white/10'}`}
                >
                    Clouds (Sat)
                </button>

                {hasOwm && (
                    <>
                        <button 
                            onClick={() => setActiveOverlay(activeOverlay === 'temp' ? '' : 'temp')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${activeOverlay === 'temp' ? 'bg-orange-600 text-white' : 'text-gray-300 hover:bg-white/10'}`}
                        >
                            Temp
                        </button>
                        <button 
                            onClick={() => setActiveOverlay(activeOverlay === 'wind' ? '' : 'wind')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${activeOverlay === 'wind' ? 'bg-teal-600 text-white' : 'text-gray-300 hover:bg-white/10'}`}
                        >
                            Wind
                        </button>
                    </>
                )}
            </div>
        </div>
      </div>
      
      <div ref={mapContainerRef} className="flex-1 w-full h-full bg-[#1a1a1a]" />
      
      {/* Legend / Info Overlay */}
      <div className="absolute bottom-6 left-6 z-10 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-md p-3 rounded-lg border border-white/10 text-xs text-gray-300">
             <div className="flex items-center gap-2 mb-1">
                 <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                 <span>Radar: Precipitation</span>
             </div>
             <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                 <span>Satellite: Cloud Cover</span>
             </div>
          </div>
      </div>
    </div>
  );
};

export default MapView;
