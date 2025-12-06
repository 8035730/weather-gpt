import React from 'react';

// A map of keywords to icon components. Order matters.
const iconMap = [
  { keywords: ['thunder', 'storm'], icon: 'thunderstorm' },
  { keywords: ['snow', 'sleet', 'flurries', 'blizzard'], icon: 'snow' },
  { keywords: ['rain', 'drizzle', 'showers'], icon: 'rain' },
  { keywords: ['windy', 'breezy', 'gusts'], icon: 'windy' },
  { keywords: ['fog', 'mist', 'haze'], icon: 'fog' },
  { keywords: ['cloudy', 'overcast'], icon: 'cloudy' },
  { keywords: ['partly cloudy', 'mostly cloudy', 'partly sunny'], icon: 'partly-cloudy' },
  { keywords: ['sunny', 'clear'], icon: 'sunny' },
];

// FIX: Replaced JSX.Element with React.ReactElement to resolve 'Cannot find namespace JSX' error.
const SVGComponents: { [key: string]: React.ReactElement } = {
  sunny: (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="10" stroke="currentColor" strokeWidth="3" />
      <path d="M32 16V12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M32 52V48" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M48 32H52" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M12 32H16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M44.39 19.61L47.22 16.78" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M16.78 47.22L19.61 44.39" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M44.39 44.39L47.22 47.22" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M16.78 16.78L19.61 19.61" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  cloudy: (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M41.43 20.73A12 12 0 1029.5 16.2c-2.8.2-5.9 1.4-7.5 3.3-2.6 3-1.8 8.4 2 11.5 3.8 3.1 9.2 3.8 12.3 1.9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M48.2 38.6c2-2 3.6-5.5 2.8-8.6-1.1-4.2-6.5-6.6-10.9-5.1" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  'partly-cloudy': (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="26" cy="28" r="8" stroke="currentColor" strokeWidth="3"/>
      <path d="M26 14V11" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      <path d="M26 45V42" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      <path d="M40 28H43" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      <path d="M9 28H12" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      <path d="M37.11 16.89L39.23 14.77" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      <path d="M12.77 41.23L14.89 39.11" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      <path d="M37.11 39.11L39.23 41.23" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      <path d="M12.77 14.77L14.89 16.89" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      <path d="M48.2 38.6c2-2 3.6-5.5 2.8-8.6-1.1-4.2-6.5-6.6-10.9-5.1" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  rain: (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 44V52" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      <path d="M32 48V56" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      <path d="M40 44V52" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      <path d="M41.43 20.73A12 12 0 1029.5 16.2c-2.8.2-5.9 1.4-7.5 3.3-2.6 3-1.8 8.4 2 11.5 3.8 3.1 9.2 3.8 12.3 1.9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M48.2 38.6c2-2 3.6-5.5 2.8-8.6-1.1-4.2-6.5-6.6-10.9-5.1" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  thunderstorm: (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M34 38L28 46L34 46L30 54" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M41.43 20.73A12 12 0 1029.5 16.2c-2.8.2-5.9 1.4-7.5 3.3-2.6 3-1.8 8.4 2 11.5 3.8 3.1 9.2 3.8 12.3 1.9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M48.2 38.6c2-2 3.6-5.5 2.8-8.6-1.1-4.2-6.5-6.6-10.9-5.1" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  snow: (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M32 46V54" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      <path d="M29.17 51.17L34.83 48.34" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      <path d="M29.17 48.34L34.83 51.17" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      <path d="M40 46V54" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      <path d="M37.17 51.17L42.83 48.34" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      <path d="M37.17 48.34L42.83 51.17" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      <path d="M24 46V54" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      <path d="M21.17 51.17L26.83 48.34" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      <path d="M21.17 48.34L26.83 51.17" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      <path d="M41.43 20.73A12 12 0 1029.5 16.2c-2.8.2-5.9 1.4-7.5 3.3-2.6 3-1.8 8.4 2 11.5 3.8 3.1 9.2 3.8 12.3 1.9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M48.2 38.6c2-2 3.6-5.5 2.8-8.6-1.1-4.2-6.5-6.6-10.9-5.1" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  windy: (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 32H44C48.42 32 52 28.42 52 24C52 19.58 48.42 16 44 16H38" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 44H38C42.42 44 46 40.42 46 36C46 31.58 42.42 28 38 28H32" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  fog: (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 38H48" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      <path d="M20 46H52" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      <path d="M41.43 20.73A12 12 0 1029.5 16.2c-2.8.2-5.9 1.4-7.5 3.3-2.6 3-1.8 8.4 2 11.5 3.8 3.1 9.2 3.8 12.3 1.9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M48.2 38.6c2-2 3.6-5.5 2.8-8.6-1.1-4.2-6.5-6.6-10.9-5.1" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  default: (
     <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M41.43 20.73A12 12 0 1029.5 16.2c-2.8.2-5.9 1.4-7.5 3.3-2.6 3-1.8 8.4 2 11.5 3.8 3.1 9.2 3.8 12.3 1.9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M48.2 38.6c2-2 3.6-5.5 2.8-8.6-1.1-4.2-6.5-6.6-10.9-5.1" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
};

// FIX: Replaced JSX.Element with React.ReactElement to resolve 'Cannot find namespace JSX' error.
export const getWeatherIcon = (condition: string): React.ReactElement => {
  const lowerCaseCondition = condition.toLowerCase();
  for (const item of iconMap) {
    for (const keyword of item.keywords) {
      if (lowerCaseCondition.includes(keyword)) {
        return SVGComponents[item.icon];
      }
    }
  }
  return SVGComponents.default;
};