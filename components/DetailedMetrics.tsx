import React from 'react';
import { CurrentWeatherData, Units } from '../types';

interface DetailedMetricsProps {
  data: CurrentWeatherData;
  units: Units;
}

const MetricWidget: React.FC<{ title: string; value: string | number; unit?: string, icon: React.ReactNode }> = ({ title, value, unit, icon }) => (
  <div className="bg-black/20 p-3 rounded-lg flex items-center gap-3">
    <div className="text-[color:var(--text-secondary)] w-5 h-5">{icon}</div>
    <div>
      <div className="text-xs text-[color:var(--text-secondary)]">{title}</div>
      <div className="text-sm font-medium text-[color:var(--text-primary)]">
        {value} <span className="text-xs text-[color:var(--text-secondary)]">{unit}</span>
      </div>
    </div>
  </div>
);

const DetailedMetrics: React.FC<DetailedMetricsProps> = ({ data, units }) => {
  const speedUnit = units === 'metric' ? 'km/h' : 'mph';
  const pressureUnit = units === 'metric' ? 'hPa' : 'inHg';
  const distanceUnit = units === 'metric' ? 'km' : 'mi';
  const tempUnit = units === 'metric' ? '°C' : '°F';

  const getAqiLabel = (aqi?: number) => {
    if (aqi === undefined) return 'N/A';
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy (SG)';
    if (aqi <= 200) return 'Unhealthy';
    return 'Hazardous';
  };
  
  const getPollenLabel = (pollen?: number) => {
    if (pollen === undefined) return 'N/A';
    if (pollen <= 2) return 'Low';
    if (pollen <= 5) return 'Moderate';
    if (pollen <= 8) return 'High';
    return 'Very High';
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
      {data.windSpeed !== undefined && (
        <MetricWidget title="Wind" value={`${Math.round(data.windSpeed)} ${data.windDirection || ''}`} unit={speedUnit} icon={<svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>} />
      )}
       {data.humidity !== undefined && (
        <MetricWidget title="Humidity" value={Math.round(data.humidity)} unit="%" icon={<svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.425 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.25m5.25-8.25h5.25" /></svg>} />
      )}
      {data.uvIndex !== undefined && (
        <MetricWidget title="UV Index" value={Math.round(data.uvIndex)} unit="" icon={<svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>} />
      )}
       {data.pressure !== undefined && (
        <MetricWidget title="Pressure" value={Math.round(data.pressure)} unit={pressureUnit} icon={<svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>} />
      )}
       {data.visibility !== undefined && (
         <MetricWidget title="Visibility" value={Math.round(data.visibility)} unit={distanceUnit} icon={<svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.432 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
      )}
       {data.dewPoint !== undefined && (
         <MetricWidget title="Dew Point" value={Math.round(data.dewPoint)} unit={tempUnit} icon={<svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.362-3.797z" /></svg>} />
      )}
       {data.cloudCover !== undefined && (
         <MetricWidget title="Cloud Cover" value={Math.round(data.cloudCover)} unit="%" icon={<svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-2.667-5.023 5.25 5.25 0 00-9.663 2.193 3.75 3.75 0 00-2.83 3.935Z" /></svg>} />
       )}
      {data.sunrise && (
         <MetricWidget title="Sunrise" value={data.sunrise} unit="" icon={<svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v.01M15 12H9m6 3.75h-6m9-9l-1.5 1.5M6 16.5l-1.5 1.5M12 19.5V21M3 12h1.5M19.5 12H21" /></svg>} />
      )}
      {data.sunset && (
         <MetricWidget title="Sunset" value={data.sunset} unit="" icon={<svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15.75V18m0-15V4.5m-3.75 9.75h7.5M19.5 12h-15" /></svg>} />
      )}
       {data.aqi !== undefined && (
        <MetricWidget title="Air Quality" value={getAqiLabel(data.aqi)} unit={`(${data.aqi})`} icon={<svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12.75 15l3-3m0 0l-3-3m3 3h-7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
      )}
      {data.pollen !== undefined && (
        <MetricWidget title="Pollen" value={getPollenLabel(data.pollen)} unit={``} icon={<svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-3.75v3.75m3-2.25v2.25m3-3.75v3.75M3 13.5l.75 4.5-4.5.75L4.5 21l3.75-3.75L12 21l2.25-2.25 3.75 3.75 1.5-4.5 4.5-.75-4.5-4.5L21 12l-2.25-2.25 2.25-2.25-4.5-1.5-1.5-4.5-3.75 3.75L12 3 9.75 5.25 6 1.5 4.5 6l-4.5 1.5 3.75 3.75L3 13.5z" /></svg>} />
      )}
    </div>
  );
};

export default DetailedMetrics;