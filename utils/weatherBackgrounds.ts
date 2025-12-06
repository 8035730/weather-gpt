const backgroundMap = [
  { keywords: ['thunder', 'storm'], class: 'bg-sky-gradient-storm' },
  { keywords: ['snow', 'sleet', 'flurries', 'blizzard'], class: 'bg-sky-gradient-snow' },
  { keywords: ['rain', 'drizzle', 'showers'], class: 'bg-sky-gradient-rain' },
  { keywords: ['fog', 'mist', 'haze'], class: 'bg-sky-gradient-cloudy' },
  { keywords: ['cloudy', 'overcast'], class: 'bg-sky-gradient-cloudy' },
  { keywords: ['sunny', 'clear'], class: 'bg-sky-gradient-clear' },
];

export const getBackgroundClass = (condition?: string): string => {
  if (!condition) {
    return 'bg-sky-gradient-clear'; // Default
  }
  const lowerCaseCondition = condition.toLowerCase();
  for (const item of backgroundMap) {
    for (const keyword of item.keywords) {
      if (lowerCaseCondition.includes(keyword)) {
        return item.class;
      }
    }
  }
  return 'bg-sky-gradient-clear'; // Default for partly cloudy etc.
};
