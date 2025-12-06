import React from 'react';
import { CurrentWeatherData, Units } from '../types';
import { getWeatherIcon } from '../utils/weatherIcons';

interface CurrentConditionsProps {
  data: CurrentWeatherData;
  units: Units;
}

const CurrentConditions: React.FC<CurrentConditionsProps> = ({ data, units }) => {
  const tempUnit = units === 'metric' ? '°C' : '°F';
  
  return (
    <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 p-4 rounded-lg bg-[color:var(--bg-card)] border border-[color:var(--border-color)] mb-4 backdrop-blur-lg">
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
    </div>
  );
};

export default CurrentConditions;
