import React from 'react';

interface LocationSuggestionsProps {
  suggestions: string[];
  onSelect: (location: string) => void;
}

const LocationSuggestions: React.FC<LocationSuggestionsProps> = ({ suggestions, onSelect }) => {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="absolute bottom-full w-full mb-2 bg-[color:var(--bg-input)] rounded-lg border border-[color:var(--border-color)] shadow-lg backdrop-blur-md overflow-hidden z-20">
      <ul className="py-1">
        {suggestions.map((location, index) => (
          <li key={index}>
            <button
              onClick={() => onSelect(location)}
              className="w-full text-left px-4 py-2 text-sm text-[color:var(--text-primary)] hover:bg-white/10 transition-colors"
            >
              {location}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LocationSuggestions;
