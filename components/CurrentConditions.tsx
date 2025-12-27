
import React from 'react';
import { CurrentWeatherData, Units } from '../types';
import { getWeatherIcon } from '../utils/weatherIcons';

interface CurrentConditionsProps {
  data: CurrentWeatherData;
  units: Units;
  onGenerateVideo?: (prompt: string) => void;
  location?: string;
}

const CurrentConditions: React.FC<CurrentConditionsProps> = ({ data, units, onGenerateVideo, location }) => {
  const tempUnit = units === 'metric' ? '°C' : '°F';

  const handleVisualize = () => {
    if (onGenerateVideo) {
      const prompt = `Cinematic, ultra-high-detail time-lapse video showing ${data.condition} weather patterns in ${location || 'a generic location'}. ${data.summary}. Highly realistic, photorealistic, 8k resolution, atmospheric lighting.`;
      onGenerateVideo(prompt);
    }
  };
  
  return (
    <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 p-4 rounded-xl bg-[color:var(--bg-card)] border border-[color:var(--border-color)] mb-4 backdrop-blur-lg group relative">
      <div className="text-blue-400 w-16 h-16 md:w-20 md:h-20 flex-shrink-0">
        {getWeatherIcon(data.condition)}
      </div>
      <div className="flex-1 text-center md:text-left">
        <div className="flex items-baseline justify-center md:justify-start gap-2">
          <h1 className="text-5xl md:text-6xl font-bold text-[color:var(--text-primary)] tracking-tighter">
            {Math.round(data.temperature)}
          </h1>
          <span className="text-3xl font-medium text-[color:var(--text-secondary)]">{tempUnit}</span>
        </div>
        <p className="text-sm text-[color:var(--text-secondary)] mt-1">
          Feels like {Math.round(data.feelsLike)}{tempUnit}. {data.historicalAvg && `Hist. Avg: ${Math.round(data.historicalAvg)}${tempUnit}.`} <span className="font-medium text-[color:var(--text-primary)]">{data.summary}</span>
        </p>
      </div>

      {onGenerateVideo && (
        <button 
          onClick={handleVisualize}
          className="absolute top-4 right-4 p-2 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-xl border border-blue-500/30 transition-all opacity-0 group-hover:opacity-100 flex items-center gap-2 shadow-lg backdrop-blur-md"
          title="Generate Weather Visualization"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0021 8.618v6.764a1 1 0 001.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          <span className="text-[10px] font-bold uppercase tracking-widest pr-1">Visualize</span>
        </button>
      )}
    </div>
  );
};

export default CurrentConditions;
