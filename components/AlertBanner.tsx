import React from 'react';
import { WeatherAlert } from '../types';

interface AlertBannerProps {
  alerts: WeatherAlert[];
  onDismiss: (alertTitle: string) => void;
  onDismissAll: () => void;
}

const severityStyles = {
  Warning: { bg: 'var(--bg-alert-warning)', border: 'var(--border-alert-warning)', text: 'var(--text-alert-warning)'},
  Advisory: { bg: 'var(--bg-alert-advisory)', border: 'var(--border-alert-advisory)', text: 'var(--text-alert-advisory)'},
  Watch: { bg: 'var(--bg-alert-watch)', border: 'var(--border-alert-watch)', text: 'var(--text-alert-watch)'},
  Statement: { bg: 'var(--bg-alert-statement)', border: 'var(--border-alert-statement)', text: 'var(--text-alert-statement)'},
};

const AlertBanner: React.FC<AlertBannerProps> = ({ alerts, onDismiss, onDismissAll }) => {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="mb-4 space-y-3">
      {alerts.map((alert, index) => {
        const styles = severityStyles[alert.severity] || severityStyles.Statement;
        return (
          <div key={index} 
               style={{ backgroundColor: styles.bg, borderColor: styles.border, color: styles.text }}
               className={`relative flex items-start gap-3 p-3 pr-8 rounded-lg border backdrop-blur-sm`}>
            <div className="flex-shrink-0 mt-0.5">
              <svg xmlns="http://www.w.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.636-1.21 2.37-1.21 3.006 0l6.236 11.852c.64 1.214-.26 2.72-1.503 2.72H3.524c-1.243 0-2.143-1.506-1.503-2.72L8.257 3.099zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-[color:var(--text-primary)]">{alert.title}</h4>
              <p className="text-xs text-current/80 leading-snug mt-1">{alert.description}</p>
            </div>
            <button onClick={() => onDismiss(alert.title)} className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/20 transition-colors">
               <svg xmlns="http://www.w.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        );
      })}
      {alerts.length > 1 && (
        <button onClick={onDismissAll} className="w-full text-center text-xs text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors">
          Dismiss All
        </button>
      )}
    </div>
  );
};

export default AlertBanner;