
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getPointForecast } from '../services/weatherService';
import { Settings } from '../types';
import WeatherChart from './WeatherChart';

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

interface RainViewerFrame {
    time: number;
    path: string;
}

const MapView: React.FC<MapViewProps> = ({ latitude, longitude, onClose, openWeatherApiKey, tomorrowIoApiKey, locationName, settings }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layersRef = useRef<{ base: any, labels: any, overlay: any, marker: any, measureGroup: any }>({ base: null, labels: null, overlay: null, marker: null, measureGroup: null });
  
  // UI State
  const [activeDrawer, setActiveDrawer] = useState<'none' | 'search' | 'layers' | 'voyager'>('none');
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  // Map Style State
  const [mapStyle, setMapStyle] = useState<'satellite_only' | 'exploration' | 'everything' | 'night_mode' | 'minimalist' | 'osm'>('exploration');

  // Map Config
  const [showLabels, setShowLabels] = useState(true);
  const [showClouds, setShowClouds] = useState(false);
  const [activeWeatherLayer, setActiveWeatherLayer] = useState<string>('none'); 

  // Measurement Tool
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<any[]>([]);
  const [totalDistance, setTotalDistance] = useState(0);

  // Timeline (GenCast)
  const [frames, setFrames] = useState<RainViewerFrame[]>([]);
  const [frameIndex, setFrameIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<number | null>(null);

  // GenCast Data
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [isFetchingPoint, setIsFetchingPoint] = useState(false);

  // -- Icons --
  const Icons = {
    Menu: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>,
    Search: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>,
    Voyager: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.06 13.43l-1.42-3.08-3.08-1.42c-.37-.17-.37-.7 0-.87l3.08-1.42 1.42-3.08c.17-.37.7-.37.87 0l1.42 3.08 3.08 1.42c.37.17.37.7 0 .87l-3.08 1.42-1.42 3.08c-.17.37-.7.37-.87 0z"/></svg>,
    Dice: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM7.5 18c-.83 0-1.5-.67-1.5-1.5S6.67 15 7.5 15s1.5.67 1.5 1.5S8.33 18 7.5 18zm0-9C6.67 9 6 8.33 6 7.5S6.67 6 7.5 6 9 6.67 9 7.5 8.33 9 7.5 9zm4.5 4.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4.5 4.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm0-9c-.83 0-1.5-.67-1.5-1.5S15.67 6 16.5 6s1.5.67 1.5 1.5S17.33 9 16.5 9z"/></svg>,
    Projects: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>,
    Layers: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z"/></svg>,
    Measure: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M2 6l4 12h12l4-12H2zm16 10H6l-2.6-8h17.2l-2.6 8z"/></svg>,
    Person: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>,
    Compass: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z" /></svg>,
    Close: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>,
    Trash: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>,
  };

  // -- Data Fetching --
  useEffect(() => {
    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then(res => res.json())
      .then(data => {
        const radarFrames = data.radar?.past || [];
        const forecastFrames = data.radar?.nowcast || [];
        const allFrames = [...radarFrames, ...forecastFrames];
        setFrames(allFrames);
        setFrameIndex(radarFrames.length - 1);
      })
      .catch(e => console.warn("Failed to fetch GenCast timeline", e));
      
    // Load search history
    const history = localStorage.getItem('weather-gpt-search-history');
    if (history) setRecentSearches(JSON.parse(history));
  }, []);

  // -- Search Logic --
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Search failed:", error);
    }
  };

  const handleSelectLocation = (place: any) => {
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);
    
    // Save to history
    const newHistory = [place.display_name, ...recentSearches.filter(s => s !== place.display_name)].slice(0, 10);
    setRecentSearches(newHistory);
    localStorage.setItem('weather-gpt-search-history', JSON.stringify(newHistory));

    // Fly to location
    mapInstanceRef.current.flyTo([lat, lon], 12, { duration: 1.5 });
    
    // Simulate a "click" to analyze
    handleMapClick({ latlng: { lat, lng: lon } });
    
    setSearchResults([]);
    setSearchQuery("");
    setActiveDrawer('none');
  };

  const clearHistory = () => {
    setRecentSearches([]);
    localStorage.removeItem('weather-gpt-search-history');
  };

  // -- Measurement Logic --
  const toggleMeasurement = () => {
    if (isMeasuring) {
      // Turn off
      setIsMeasuring(false);
      setMeasurePoints([]);
      setTotalDistance(0);
      if (layersRef.current.measureGroup) {
        layersRef.current.measureGroup.clearLayers();
      }
    } else {
      // Turn on
      setIsMeasuring(true);
      setMeasurePoints([]);
      setTotalDistance(0);
      if (!layersRef.current.measureGroup) {
        layersRef.current.measureGroup = L.layerGroup().addTo(mapInstanceRef.current);
      }
    }
  };

  const updateMeasurement = (latlng: any) => {
    const newPoints = [...measurePoints, latlng];
    setMeasurePoints(newPoints);
    
    // Add marker
    L.circleMarker(latlng, { radius: 4, color: '#facc15', fillColor: '#facc15', fillOpacity: 1 }).addTo(layersRef.current.measureGroup);
    
    // Add line
    if (newPoints.length > 1) {
      const lastPoint = newPoints[newPoints.length - 2];
      const dist = mapInstanceRef.current.distance(lastPoint, latlng);
      setTotalDistance(prev => prev + dist);
      
      L.polyline([lastPoint, latlng], { color: '#facc15', weight: 3, dashArray: '10, 10' }).addTo(layersRef.current.measureGroup);
    }
  };

  const displayDistance = settings.units === 'metric' 
    ? `${(totalDistance / 1000).toFixed(2)} km` 
    : `${(totalDistance / 1609.34).toFixed(2)} mi`;

  // -- Map Logic --
  const handleMapClick = useCallback(async (e: any) => {
    const { lat, lng } = e.latlng;
    
    if (isMeasuring) {
      updateMeasurement(e.latlng);
      return;
    }
    
    if (layersRef.current.marker) mapInstanceRef.current.removeLayer(layersRef.current.marker);
    
    const marker = L.circleMarker([lat, lng], {
        radius: 6,
        fillColor: "#4285F4",
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 1
    }).addTo(mapInstanceRef.current);
    
    // Initial Tooltip
    marker.bindTooltip("Analyzing Micro-climate...", { 
        permanent: false, 
        direction: 'top', 
        offset: [0, -5]
    }).openTooltip();

    layersRef.current.marker = marker;

    setIsFetchingPoint(true);
    setSelectedLocation({ lat, lng, location: "GenCast Analyzing..." });

    try {
      const data = await getPointForecast(lat, lng, settings);
      if (data) {
        setSelectedLocation({ ...data, lat, lng });
        // Update Tooltip with Data
        const tempUnit = settings.units === 'metric' ? '°C' : '°F';
        marker.setTooltipContent(`
          <div class="text-center">
            <div class="font-bold">${data.location}</div>
            <div>${Math.round(data.current.temperature)}${tempUnit} • ${data.current.condition}</div>
          </div>
        `);
      }
    } catch (err) {
      console.error("GenCast Error", err);
      marker.setTooltipContent("Analysis Failed");
    } finally {
      setIsFetchingPoint(false);
    }
  }, [settings, isMeasuring, measurePoints]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: false,
          minZoom: 3,
          maxZoom: 18,
          worldCopyJump: true,
          zoomSnap: 0.5
      }).setView([latitude, longitude], 4);

      // Default Base Layer
      const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19
      }).addTo(map);
      layersRef.current.base = satellite;

      map.on('click', handleMapClick);
      mapInstanceRef.current = map;

      // Initial Fly
      setTimeout(() => {
        map.flyTo([latitude, longitude], 10, { duration: 2.5 });
      }, 500);
    }
  }, [latitude, longitude, handleMapClick]);

  // -- Layer Management --
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    
    // 1. Update Base Layer based on style
    if (layersRef.current.base) mapInstanceRef.current.removeLayer(layersRef.current.base);
    
    let baseLayerUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    let labelLayerUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
    
    if (mapStyle === 'night_mode') {
        baseLayerUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    } else if (mapStyle === 'minimalist') {
        baseLayerUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    } else if (mapStyle === 'osm') {
        baseLayerUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    } else if (mapStyle === 'satellite_only') {
        baseLayerUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    }

    const baseLayer = L.tileLayer(baseLayerUrl, { maxZoom: 19 }).addTo(mapInstanceRef.current);
    layersRef.current.base = baseLayer;

    // 2. Manage Labels (Only for Satellite styles mostly, as Dark/Light/OSM usually have labels baked in or handled differently)
    const needsLabels = ['exploration', 'everything'].includes(mapStyle) && showLabels;
    
    if (layersRef.current.labels) {
        mapInstanceRef.current.removeLayer(layersRef.current.labels);
        layersRef.current.labels = null;
    }

    if (needsLabels) {
        const labels = L.tileLayer(labelLayerUrl, { zIndex: 400 }).addTo(mapInstanceRef.current);
        layersRef.current.labels = labels;
    }

    // 3. Weather Overlay
    if (layersRef.current.overlay) mapInstanceRef.current.removeLayer(layersRef.current.overlay);
    
    let layer = null;
    const zIndex = 300;

    if (activeWeatherLayer === 'radar' && frames.length > 0 && frameIndex >= 0) {
       const frame = frames[frameIndex];
       layer = L.tileLayer(`https://tile.rainviewer.com${frame.path}/256/{z}/{x}/{y}/2/1_1.png`, { opacity: 0.8, zIndex });
    } else if (showClouds && activeWeatherLayer !== 'radar') {
       // Clouds can coexist or be separate. If clouds is active, it might overlay differently.
       // For simplicity, we treat clouds as an additional overlay if not using radar, or integrate logic.
       // Here, let's make clouds separate.
    } 
    
    // OpenWeatherMap Layers
    if (['temp_new', 'wind_new', 'precipitation_new', 'pressure_new'].includes(activeWeatherLayer)) {
        if (openWeatherApiKey) {
            layer = L.tileLayer(`https://tile.openweathermap.org/map/${activeWeatherLayer}/{z}/{x}/{y}.png?appid=${openWeatherApiKey}`, { opacity: 0.8, zIndex });
        }
    }

    if (layer) {
       layer.addTo(mapInstanceRef.current);
       layersRef.current.overlay = layer;
    }
    
    // Additional Cloud Layer if toggled
    if (showClouds && frames.length > 0 && frameIndex >= 0) {
        const frame = frames[frameIndex];
        L.tileLayer(`https://tile.rainviewer.com${frame.path}/256/{z}/{x}/{y}/0/0_1.png`, { opacity: 0.6, zIndex: 301 }).addTo(mapInstanceRef.current);
    }

  }, [showLabels, showClouds, activeWeatherLayer, frames, frameIndex, mapStyle, openWeatherApiKey]);

  // -- Animation --
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = window.setInterval(() => {
        setFrameIndex(prev => (prev + 1) % frames.length);
      }, 500);
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }
    return () => { if (playIntervalRef.current) clearInterval(playIntervalRef.current); };
  }, [isPlaying, frames.length]);


  // --- UI Components ---

  const DockItem = ({ icon, label, isActive, onClick, separator }: any) => (
    <>
        <button 
            onClick={onClick}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all group relative mb-2 mx-auto ${isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-[#3c4043]'}`}
        >
            {icon}
            {/* Tooltip */}
            <div className="absolute left-full ml-3 px-2 py-1 bg-[#202124] text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none shadow-lg border border-white/10 font-medium">
                {label}
            </div>
        </button>
        {separator && <div className="w-8 h-[1px] bg-white/10 mx-auto mb-2"></div>}
    </>
  );
  
  const ControlButton = ({ icon, onClick, tooltip, className, title }: any) => (
      <div className="relative group">
         <button 
            onClick={onClick}
            className={className || "w-10 h-10 flex items-center justify-center text-[#e8eaed] hover:bg-[#4a4e51] active:bg-[#5f6368]"}
         >
            {icon}
         </button>
         <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-[#202124] text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none shadow-lg border border-white/10 font-medium transition-opacity">
            {tooltip || title}
        </div>
      </div>
  );

  const Drawer = ({ title, children, onClose, icon }: any) => (
    <div className="absolute top-0 left-0 h-full w-[360px] bg-[#202124] shadow-2xl z-[1000] animate-in slide-in-from-left duration-300 flex flex-col text-[#e8eaed]">
      <div className="h-16 flex items-center px-4 border-b border-white/10 bg-[#202124]">
        <button onClick={onClose} className="mr-4 text-gray-400 hover:text-white">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </button>
        <div className="flex items-center gap-3">
             {icon}
             <h2 className="text-xl font-google font-normal">{title}</h2>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {children}
      </div>
    </div>
  );

  const MapStyleOption = ({ label, description, image, active, onClick }: any) => (
      <button onClick={onClick} className={`w-full text-left p-4 hover:bg-[#3c4043] border-b border-white/5 flex gap-4 group ${active ? 'bg-[#3c4043]' : ''}`}>
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${active ? 'border-blue-400' : 'border-gray-500 group-hover:border-white'}`}>
              {active && <div className="w-3 h-3 bg-blue-400 rounded-full"></div>}
          </div>
          <div className="flex-1">
              <div className="text-sm font-medium text-[#e8eaed]">{label}</div>
              <div className="text-xs text-[#9aa0a6] mt-1">{description}</div>
          </div>
          {/* Simulated preview thumbnail */}
          <div className={`w-16 h-16 rounded-md bg-gray-700 overflow-hidden opacity-80 ${active ? 'ring-2 ring-blue-400' : ''}`}>
             <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${image})` }}></div>
          </div>
      </button>
  );

  const Toggle = ({ label, active, onClick, type = 'checkbox' }: any) => (
      <button onClick={onClick} className="flex items-center justify-between w-full py-3 px-4 hover:bg-[#3c4043]">
          <span className="text-sm text-[#e8eaed]">{label}</span>
          <div className={`w-9 h-3.5 rounded-full relative transition-colors ${active ? 'bg-blue-300/50' : 'bg-gray-600'}`}>
              <div className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full shadow-md transition-transform ${active ? 'translate-x-4 bg-blue-400' : '-translate-x-1 bg-gray-400'}`} />
          </div>
      </button>
  );

  // --- Right Side Knowledge Card (GenCast) ---
  const GenCastKnowledgeCard = () => {
    if (!selectedLocation) return null;
    const tempUnit = settings.units === 'metric' ? '°C' : '°F';

    return (
      <div className="absolute top-20 right-4 w-[360px] bg-[#202124] rounded-lg shadow-2xl z-[1000] overflow-hidden animate-in slide-in-from-right fade-in duration-300 flex flex-col max-h-[calc(100vh-160px)] font-sans">
          {/* Header Image Area */}
          <div className="relative h-48 bg-gray-800 group">
             {/* Gradient Overlay */}
             <div className="absolute inset-0 bg-gradient-to-t from-[#202124] to-transparent z-10"></div>
             
             {/* Close Button */}
             <button 
                onClick={() => setSelectedLocation(null)}
                className="absolute top-2 right-2 z-20 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors"
             >
                {Icons.Close}
             </button>

             {/* Title */}
             <div className="absolute bottom-4 left-6 z-20">
                 <h1 className="text-2xl font-google text-white mb-1 shadow-black drop-shadow-md">{selectedLocation.location}</h1>
                 <div className="flex items-center gap-2 text-xs font-medium text-blue-300">
                     <span>GenCast Analysis</span>
                     <span className="w-1 h-1 bg-white rounded-full"></span>
                     <span>Live</span>
                 </div>
             </div>
             
             {/* Background Pattern */}
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
             <div className={`absolute inset-0 bg-gradient-to-br ${selectedLocation.current?.condition.includes('Rain') ? 'from-blue-900' : 'from-orange-900'} to-gray-900 opacity-80`}></div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto custom-scrollbar">
             {isFetchingPoint ? (
                <div className="space-y-4">
                    <div className="h-4 bg-white/10 rounded w-3/4 animate-pulse"></div>
                    <div className="h-4 bg-white/10 rounded w-1/2 animate-pulse"></div>
                    <div className="h-32 bg-white/5 rounded-lg animate-pulse"></div>
                </div>
             ) : (
                <>
                    <p className="text-[#bdc1c6] text-sm leading-relaxed mb-6">
                        {selectedLocation.historicalContext || "A unique micro-climate analyzed by GenCast diffusion models."}
                        <span className="text-blue-400 ml-1 cursor-pointer hover:underline">More info</span>
                    </p>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-[#303134] p-3 rounded-lg border border-white/5">
                            <div className="text-xs text-[#9aa0a6] uppercase tracking-wider mb-1">Temp</div>
                            <div className="text-2xl text-white">{Math.round(selectedLocation.current.temperature)}{tempUnit}</div>
                        </div>
                        <div className="bg-[#303134] p-3 rounded-lg border border-white/5">
                             <div className="text-xs text-[#9aa0a6] uppercase tracking-wider mb-1">Prob.</div>
                             <div className="text-sm text-green-400 font-medium pt-1">{selectedLocation.genCastProbability || 'High'}</div>
                        </div>
                    </div>

                    {/* Forecast Chart */}
                    <WeatherChart 
                        hourlyData={selectedLocation.hourly} 
                        dailyData={selectedLocation.daily} 
                        units={settings.units} 
                        className="h-64 mt-2 text-[10px] bg-transparent border-none p-0"
                    />
                </>
             )}
          </div>
          
          {/* Footer Actions */}
          <div className="p-2 border-t border-white/10 flex justify-around bg-[#202124]">
              <button className="flex flex-col items-center gap-1 p-2 text-blue-300 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                  <span className="text-[10px]">Share</span>
              </button>
              <button className="flex flex-col items-center gap-1 p-2 text-blue-300 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                  <span className="text-[10px]">Save</span>
              </button>
          </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#101010] font-sans flex text-[#e8eaed] overflow-hidden">
      
      {/* 1. TOP LEFT MENU BUTTON */}
      <div className="absolute top-4 left-4 z-[1100]">
         <button onClick={onClose} className="p-3 text-gray-400 hover:text-white hover:bg-[#3c4043] rounded-full transition-colors">
             {Icons.Menu}
         </button>
      </div>

      {/* 2. LEFT VERTICAL DOCK */}
      <div className="absolute top-20 left-4 z-[1100] flex flex-col items-center">
         <DockItem icon={Icons.Search} label="Search" isActive={activeDrawer === 'search'} onClick={() => setActiveDrawer('search')} />
         <DockItem icon={Icons.Voyager} label="Voyager" isActive={activeDrawer === 'voyager'} onClick={() => setActiveDrawer('voyager')} />
         <DockItem icon={Icons.Dice} label="I'm Feeling Lucky" onClick={() => alert("Warping to random location...")} />
         <DockItem icon={Icons.Projects} label="Projects" separator />
         <DockItem icon={Icons.Layers} label="Map Style" isActive={activeDrawer === 'layers'} onClick={() => setActiveDrawer('layers')} />
         <DockItem icon={Icons.Measure} label="Measure" isActive={isMeasuring} onClick={toggleMeasurement} />
      </div>

      {/* 3. DRAWERS */}
      {activeDrawer === 'search' && (
          <Drawer title="Search" icon={Icons.Search} onClose={() => setActiveDrawer('none')}>
              <div className="p-4">
                  <form onSubmit={handleSearch} className="relative mb-6">
                      <input 
                        type="text" 
                        placeholder="Search places..."
                        className="w-full bg-transparent border-b border-gray-600 text-white pb-2 focus:border-blue-400 focus:outline-none placeholder-gray-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                        autoFocus
                      />
                      <button type="submit" className="absolute right-0 top-0 text-blue-400 font-medium text-sm">SEARCH</button>
                  </form>
                  
                  {searchResults.length > 0 ? (
                    <div className="space-y-2 mb-6">
                       <h3 className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-2">Results</h3>
                       {searchResults.map((result, i) => (
                         <button key={i} onClick={() => handleSelectLocation(result)} className="w-full text-left p-3 hover:bg-white/5 rounded-lg text-sm transition-colors border border-transparent hover:border-white/10">
                            <div className="font-medium text-white truncate">{result.display_name.split(',')[0]}</div>
                            <div className="text-xs text-gray-400 truncate">{result.display_name}</div>
                         </button>
                       ))}
                    </div>
                  ) : (isSearchFocused || searchQuery === "") && (
                    <div className="mt-2">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-widest">Recent History</h3>
                            {recentSearches.length > 0 && (
                                <button onClick={clearHistory} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                                    {Icons.Trash} Clear
                                </button>
                            )}
                        </div>
                        {recentSearches.length > 0 ? (
                            recentSearches.map((s, i) => (
                                <button key={i} onClick={() => { setSearchQuery(s); handleSearch(); }} className="flex items-center gap-3 w-full py-2 hover:bg-white/5 px-2 rounded transition-colors text-sm text-gray-300">
                                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <span className="truncate">{s}</span>
                                </button>
                            ))
                        ) : (
                            <div className="text-sm text-gray-400 italic">No recent searches</div>
                        )}
                    </div>
                  )}
              </div>
          </Drawer>
      )}

      {activeDrawer === 'layers' && (
          <Drawer title="Map Style" icon={Icons.Layers} onClose={() => setActiveDrawer('none')}>
              <div className="py-2">
                 <MapStyleOption 
                    label="Satellite Only" 
                    description="Clean satellite imagery without labels" 
                    image="https://www.gstatic.com/earth/images/layer_clean_v1.png"
                    active={mapStyle === 'satellite_only'}
                    onClick={() => { setMapStyle('satellite_only'); setShowLabels(false); }}
                 />
                 <MapStyleOption 
                    label="Exploration" 
                    description="Satellite imagery with borders, labels, and places" 
                    image="https://www.gstatic.com/earth/images/layer_exploration_v1.png"
                    active={mapStyle === 'exploration'}
                    onClick={() => { setMapStyle('exploration'); setShowLabels(true); }}
                 />
                 <MapStyleOption 
                    label="Everything" 
                    description="All borders, labels, roads, transit, and landmarks" 
                    image="https://www.gstatic.com/earth/images/layer_everything_v1.png"
                    active={mapStyle === 'everything'}
                    onClick={() => { setMapStyle('everything'); setShowLabels(true); }}
                 />
                 <MapStyleOption 
                    label="Night Mode" 
                    description="High contrast dark map for low-light environments" 
                    image="https://carto.com/help/images/building-maps/basemaps/dark_matter_labels.png"
                    active={mapStyle === 'night_mode'}
                    onClick={() => { setMapStyle('night_mode'); setShowLabels(false); }}
                 />
                 <MapStyleOption 
                    label="Minimalist Map" 
                    description="Clean, light-themed map with essential details" 
                    image="https://carto.com/help/images/building-maps/basemaps/positron_labels.png"
                    active={mapStyle === 'minimalist'}
                    onClick={() => { setMapStyle('minimalist'); setShowLabels(false); }}
                 />
                 <MapStyleOption 
                    label="OpenStreetMap" 
                    description="Standard street map view" 
                    image="https://upload.wikimedia.org/wikipedia/commons/b/b0/Openstreetmap_logo.svg"
                    active={mapStyle === 'osm'}
                    onClick={() => { setMapStyle('osm'); setShowLabels(false); }}
                 />
                 
                 <div className="border-t border-white/5 mt-2 pt-2">
                     <h3 className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-widest">Weather Data (Single Select)</h3>
                     <div className="space-y-1">
                        <Toggle label="None" active={activeWeatherLayer === 'none'} onClick={() => setActiveWeatherLayer('none')} />
                        <Toggle label="RainViewer Radar" active={activeWeatherLayer === 'radar'} onClick={() => setActiveWeatherLayer('radar')} />
                        <Toggle label="Temperature" active={activeWeatherLayer === 'temp_new'} onClick={() => setActiveWeatherLayer('temp_new')} />
                        <Toggle label="Wind Speed" active={activeWeatherLayer === 'wind_new'} onClick={() => setActiveWeatherLayer('wind_new')} />
                        <Toggle label="Precipitation" active={activeWeatherLayer === 'precipitation_new'} onClick={() => setActiveWeatherLayer('precipitation_new')} />
                        <Toggle label="Pressure" active={activeWeatherLayer === 'pressure_new'} onClick={() => setActiveWeatherLayer('pressure_new')} />
                     </div>
                     
                     <div className="mt-4 mb-2 px-4 text-[10px] text-gray-500 font-bold uppercase tracking-wider">Overlays</div>
                     <Toggle label="Animated Clouds" active={showClouds} onClick={() => setShowClouds(!showClouds)} />
                     <Toggle label="Gridlines" active={false} onClick={() => {}} />
                 </div>
              </div>
          </Drawer>
      )}

      {/* 4. MAIN MAP */}
      <div className="flex-1 relative bg-[#202124]">
         <div ref={mapContainerRef} className="w-full h-full" />
         
         <GenCastKnowledgeCard />

         {/* Measurement Overlay */}
         {isMeasuring && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-[#202124] px-4 py-2 rounded-full shadow-lg border border-yellow-500 flex items-center gap-3">
               <span className="text-yellow-500 font-bold text-sm">Measurement Mode</span>
               <div className="h-4 w-[1px] bg-white/20"></div>
               <span className="text-white text-sm">{displayDistance}</span>
               <div className="text-[10px] text-gray-400 hidden sm:block">(Click points to measure)</div>
               <button onClick={toggleMeasurement} className="ml-2 text-gray-400 hover:text-white">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>
         )}

         {/* 5. BOTTOM RIGHT CONTROLS */}
         <div className="absolute bottom-8 right-6 flex flex-col items-center gap-4 z-[1000]">
            
            {/* Compass */}
            <ControlButton 
              icon={Icons.Compass}
              className="w-10 h-10 bg-[#3c4043] rounded-full flex items-center justify-center text-[#e8eaed] hover:text-white shadow-lg"
              tooltip="Reset North"
            />

            {/* 3D/2D Toggle (Visual Only for Leaflet) */}
            <ControlButton 
              icon={<span className="text-blue-400 font-bold text-xs">2D</span>}
              className="w-10 h-10 bg-[#3c4043] rounded-full flex items-center justify-center shadow-lg"
              tooltip="Toggle 2D/3D"
            />

            {/* Street View Pegman */}
            <ControlButton 
              icon={Icons.Person}
              className="w-10 h-10 bg-[#3c4043] rounded-full flex items-center justify-center text-[#e8eaed] hover:text-white shadow-lg"
              tooltip="Street View"
            />

            {/* Zoom Stack */}
            <div className="bg-[#3c4043] rounded-full shadow-lg flex flex-col overflow-hidden">
               <ControlButton 
                  icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>}
                  onClick={() => mapInstanceRef.current?.zoomIn()}
                  tooltip="Zoom In"
               />
               <div className="w-6 h-[1px] bg-white/10 mx-auto"></div>
               <ControlButton 
                  icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13H5v-2h14v2z"/></svg>}
                  onClick={() => mapInstanceRef.current?.zoomOut()}
                  tooltip="Zoom Out"
               />
            </div>
         </div>

         {/* 6. BOTTOM CENTER TIMELINE (Only active for RainViewer Time-based layers) */}
         {((activeWeatherLayer === 'radar' || showClouds) && frames.length > 0) && (
             <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1000] bg-[#202124]/90 backdrop-blur-md px-6 py-3 rounded-lg flex items-center gap-4 border border-white/10 shadow-2xl animate-in slide-in-from-bottom duration-300">
                 <button onClick={() => setIsPlaying(!isPlaying)} className="text-white hover:text-blue-400">
                    {isPlaying ? (
                       <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    ) : (
                       <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    )}
                 </button>
                 <div className="flex flex-col w-64">
                    <div className="flex justify-between text-[10px] font-bold text-[#9aa0a6] uppercase tracking-widest mb-1">
                       <span>Past</span>
                       <span className="text-white">GenCast Now</span>
                       <span>Future</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max={frames.length - 1} 
                      value={frameIndex} 
                      onChange={(e) => { setFrameIndex(parseInt(e.target.value)); setIsPlaying(false); }}
                      className="w-full h-1 bg-gray-600 rounded-full appearance-none cursor-pointer accent-blue-400"
                    />
                 </div>
             </div>
         )}
         
         {/* 7. WATERMARK / ATTRIBUTION (Bottom Right) */}
         <div className="absolute bottom-1 right-0 pr-2 pointer-events-none select-none text-[10px] text-white/70 flex gap-2">
            <span>Camera: 1450m</span>
            <span>35°41'N 139°45'E</span>
            <span>Imagery ©2025 CNES / Airbus, Maxar Technologies</span>
            <span className="font-bold">Google</span>
         </div>
      </div>
    </div>
  );
};

export default MapView;
