import React from 'react';

interface InsightsProps {
  insights: string[];
}

const Insights: React.FC<InsightsProps> = ({ insights }) => {
  if (!insights || insights.length === 0) return null;

  return (
    <div 
      className="mb-4 p-3 rounded-lg border backdrop-blur-sm"
      style={{
        backgroundColor: 'var(--bg-insight)',
        borderColor: 'var(--border-insight)'
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5" style={{ color: 'var(--text-insight-icon)'}}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.121-3.536a1 1 0 011.414 0l.707.707a1 1 0 01-1.414 1.414l-.707-.707a1 1 0 010-1.414zM4.05 11.536a1 1 0 011.414 0l.707.707a1 1 0 01-1.414 1.414l-.707-.707a1 1 0 010-1.414zM10 18a1 1 0 01-1-1v-1a1 1 0 112 0v1a1 1 0 01-1 1z" />
          </svg>
        </div>
        <div>
          <h4 className="font-semibold text-sm text-[color:var(--text-primary)]">Insights</h4>
          <ul className="text-xs text-[color:var(--text-secondary)] leading-snug mt-1 list-disc pl-4 space-y-1">
            {insights.map((insight, index) => (
              <li key={index}>{insight}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Insights;