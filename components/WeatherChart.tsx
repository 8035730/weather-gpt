import React, { useState, useMemo, useEffect } from 'react';
import {
  ComposedChart, Area, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell
} from 'recharts';
import { WeatherDataPoint, Units } from '../types';

interface WeatherChartProps {
  hourlyData?: WeatherDataPoint[];
  dailyData?: WeatherDataPoint[];
  units: Units;
}

type VisibilityState = {
  temperature: boolean;
  feelsLike: boolean;
  precipitation: boolean;
  humidity: boolean;
  windSpeed: boolean;
  uvIndex: boolean;
  historicalAvgTemp: boolean;
  pressure: boolean;
  visibility: boolean;
  dewPoint: boolean;
  cloudCover: boolean;
  aqi: boolean;
  pollen: boolean;
};

const getPrecipitationColor = (type?: string) => {
  switch (type) {
    case 'snow': return '#ffffff';
    case 'sleet': return '#a855f7';
    case 'rain':
    default: return '#38bdf8';
  }
};

const CustomTooltip = ({ active, payload, label, units }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const tempUnit = units === 'metric' ? '°C' : '°F';
    const speedUnit = units === 'metric' ? 'km/h' : 'mph';
    const pressureUnit = units === 'metric' ? 'hPa' : 'inHg';
    const distanceUnit = units === 'metric' ? 'km' : 'mi';
    
    const temp = data.temperature !== undefined ? Math.round(data.temperature) : 'N/A';
    const deviation = data.confidence && data.temperature ? Math.round((5 * (100 - data.confidence)) / 100 * (units === 'metric' ? 1 : 1.8)) : 0;
    
    return (
      <div className="bg-[color:var(--bg-input)] p-3 rounded-lg border border-[color:var(--border-color)] shadow-lg text-xs backdrop-blur-md">
        <p className="font-bold text-[color:var(--text-primary)] mb-2">{label}</p>
        {payload.map((p: any) => (
          <div key={p.dataKey} style={{ color: p.color, display: p.value === undefined ? 'none' : 'block' }}>
            {p.dataKey === 'temperature' && `Temp: ${temp}° ± ${deviation}° (${data.confidence}%)`}
            {p.dataKey === 'feelsLike' && `Feels Like: ${Math.round(p.value)}${tempUnit}`}
            {p.dataKey === 'historicalAvgTemp' && `Hist. Avg: ${Math.round(p.value)}${tempUnit}`}
            {p.dataKey === 'precipitation' && `Precip: ${p.value}% (${data.precipitationType || 'rain'})`}
            {p.dataKey === 'humidity' && `Humidity: ${p.value}%`}
            {p.dataKey === 'windSpeed' && `Wind: ${p.value} ${speedUnit}`}
            {p.dataKey === 'uvIndex' && `UV Index: ${p.value}`}
            {p.dataKey === 'pressure' && `Pressure: ${p.value} ${pressureUnit}`}
            {p.dataKey === 'visibility' && `Visibility: ${p.value} ${distanceUnit}`}
            {p.dataKey === 'dewPoint' && `Dew Point: ${Math.round(p.value)}${tempUnit}`}
            {p.dataKey === 'cloudCover' && `Cloud Cover: ${p.value}%`}
            {p.dataKey === 'aqi' && `AQI: ${p.value}`}
            {p.dataKey === 'pollen' && `Pollen: ${p.value}`}
          </div>
        ))}
      </div>
    );
  }
  return null;
};


const WeatherChart: React.FC<WeatherChartProps> = ({ hourlyData, dailyData, units }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [view, setView] = useState<'hourly' | 'daily'>('hourly');
  const [visibility, setVisibility] = useState<VisibilityState>({
    temperature: true, feelsLike: true, precipitation: true, humidity: false,
    windSpeed: false, uvIndex: false, historicalAvgTemp: true, pressure: false,
    visibility: false, dewPoint: false, cloudCover: false, aqi: false, pollen: false,
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const data = view === 'hourly' ? hourlyData : dailyData;

  const processedData = useMemo(() => {
    return data?.map(d => {
      const deviation = d.confidence ? (5 * (100 - d.confidence)) / 100 * (units === 'metric' ? 1 : 1.8) : 0;
      return {
        ...d,
        confidenceInterval: d.temperature ? [d.temperature - deviation, d.temperature + deviation] : [0, 0]
      };
    });
  }, [data, units]);

  if (!processedData || processedData.length === 0) return null;
  
  const tempUnit = units === 'metric' ? '°C' : '°F';
  const speedUnit = units === 'metric' ? 'km/h' : 'mph';
  const pressureUnit = units === 'metric' ? 'hPa' : 'inHg';
  const distanceUnit = units === 'metric' ? 'km' : 'mi';

  // FIX: Changed `id` to `dataKey` to match recharts API and fix toggle functionality.
  const legendPayload = [
    { value: `Temp (${tempUnit})`, type: 'line', dataKey: 'temperature', color: '#3b82f6' },
    { value: 'Feels Like', type: 'line', dataKey: 'feelsLike', color: '#f97316' },
    { value: `Hist. Avg`, type: 'line', dataKey: 'historicalAvgTemp', color: '#8b5cf6' },
    { value: 'Precip %', type: 'rect', dataKey: 'precipitation', color: '#38bdf8' },
    { value: 'Humidity %', type: 'line', dataKey: 'humidity', color: '#14b8a6' },
    { value: `Wind (${speedUnit})`, type: 'line', dataKey: 'windSpeed', color: '#ec4899' },
    { value: 'UV Index', type: 'line', dataKey: 'uvIndex', color: '#facc15' },
    { value: `Pressure (${pressureUnit})`, type: 'line', dataKey: 'pressure', color: '#6b7280'},
    { value: `Visibility (${distanceUnit})`, type: 'line', dataKey: 'visibility', color: '#10b981'},
    { value: `Dew Point (${tempUnit})`, type: 'line', dataKey: 'dewPoint', color: '#0ea5e9'},
    { value: 'Cloud Cover %', type: 'line', dataKey: 'cloudCover', color: '#a855f7'},
    { value: 'AQI', type: 'line', dataKey: 'aqi', color: '#ef4444' },
    { value: 'Pollen', type: 'line', dataKey: 'pollen', color: '#84cc16' },
  ].map(item => ({...item, inactive: !visibility[item.dataKey as keyof VisibilityState]}));
  
  return (
    <div className="w-full h-[28rem] mt-4 bg-[color:var(--bg-card)] rounded-lg p-4 border border-[color:var(--border-color)] backdrop-blur-lg">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xs font-semibold text-[color:var(--text-secondary)] uppercase tracking-wider">Interactive Forecast Dashboard</h3>
        <div className="flex space-x-1 rounded-lg bg-black/20 p-1 text-xs">
          <button onClick={() => setView('hourly')} className={`px-2 py-1 rounded-md ${view === 'hourly' ? 'bg-white/10 text-[color:var(--text-primary)]' : 'text-[color:var(--text-secondary)]'}`}>Hourly</button>
          <button onClick={() => setView('daily')} className={`px-2 py-1 rounded-md ${view === 'daily' ? 'bg-white/10 text-[color:var(--text-primary)]' : 'text-[color:var(--text-secondary)]'}`}>Daily</button>
        </div>
      </div>
      {isMounted && (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={processedData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
            <defs><linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
            <XAxis dataKey="time" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="temp" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} unit={tempUnit} />
            <YAxis yAxisId="percent" orientation="right" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
            {/* Hidden axes for correct scaling */}
            <YAxis yAxisId="pressure" domain={['dataMin - 5', 'dataMax + 5']} hide={true} />
            <YAxis yAxisId="wind" hide={true} />
            <YAxis yAxisId="uv" hide={true} />
            <YAxis yAxisId="visibility" hide={true} />
            <YAxis yAxisId="aqi" hide={true} />
            <YAxis yAxisId="pollen" hide={true} />
            
            <Tooltip content={<CustomTooltip units={units} />} />
            {/* FIX: Removed unused @ts-expect-error directive as there is no type error on the Legend component. */}
            <Legend onClick={(e) => setVisibility(p => ({ ...p, [e.dataKey]: !p[e.dataKey] }))} payload={legendPayload} wrapperStyle={{fontSize: "11px", paddingTop: "40px", lineHeight: "1.5"}} />

            <Area yAxisId="temp" type="monotone" dataKey="confidenceInterval" stroke="none" fill="#3b82f6" fillOpacity={0.15} hide={!visibility.temperature} activeDot={false} />
            <Area yAxisId="temp" type="monotone" dataKey="temperature" name="Temp" stroke="#3b82f6" fill="url(#colorTemp)" strokeWidth={2} hide={!visibility.temperature} />
            <Area yAxisId="temp" type="monotone" dataKey="feelsLike" name="Feels Like" stroke="#f97316" fill="none" strokeWidth={2} strokeDasharray="3 3" hide={!visibility.feelsLike} />
            <Line yAxisId="temp" type="monotone" dataKey="historicalAvgTemp" name="Hist. Avg" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="2 4" dot={false} hide={!visibility.historicalAvgTemp} />
            <Line yAxisId="temp" type="monotone" dataKey="dewPoint" name="Dew Point" stroke="#0ea5e9" strokeWidth={2} dot={false} hide={!visibility.dewPoint} />
            
            <Bar yAxisId="percent" dataKey="precipitation" name="Precip %" barSize={12} opacity={0.6} hide={!visibility.precipitation}>
              {processedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getPrecipitationColor(entry.precipitationType)} />
              ))}
            </Bar>

            <Line yAxisId="percent" type="monotone" dataKey="humidity" name="Humidity %" stroke="#14b8a6" strokeWidth={2} dot={false} hide={!visibility.humidity} />
            <Line yAxisId="percent" type="monotone" dataKey="cloudCover" name="Cloud Cover" stroke="#a855f7" strokeWidth={2} dot={false} hide={!visibility.cloudCover} />
            
            <Line yAxisId="wind" type="monotone" dataKey="windSpeed" name="Wind" stroke="#ec4899" strokeWidth={2} dot={false} hide={!visibility.windSpeed} />
            <Line yAxisId="uv" type="monotone" dataKey="uvIndex" name="UV Index" stroke="#facc15" strokeWidth={2} dot={false} hide={!visibility.uvIndex} />
            <Line yAxisId="pressure" type="monotone" dataKey="pressure" name="Pressure" stroke="#6b7280" strokeWidth={2} dot={false} hide={!visibility.pressure} />
            <Line yAxisId="visibility" type="monotone" dataKey="visibility" name="Visibility" stroke="#10b981" strokeWidth={2} dot={false} hide={!visibility.visibility} />
            <Line yAxisId="aqi" type="monotone" dataKey="aqi" name="AQI" stroke="#ef4444" strokeWidth={2} dot={false} hide={!visibility.aqi} />
            <Line yAxisId="pollen" type="monotone" dataKey="pollen" name="Pollen" stroke="#84cc16" strokeWidth={2} dot={false} hide={!visibility.pollen} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default WeatherChart;