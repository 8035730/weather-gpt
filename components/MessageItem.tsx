import React from 'react';
import { Message, Units, WeatherAlert } from '../types';
import WeatherChart from './WeatherChart';
import AlertBanner from './AlertBanner';
import CurrentConditions from './CurrentConditions';
import DetailedMetrics from './DetailedMetrics';
import Insights from './Insights';
import LoadingSkeleton from './LoadingSkeleton';

interface MessageItemProps {
  message: Message;
  onPlayAudio: (messageId: string, text: string) => void;
  units: Units;
  dismissedAlerts: string[];
  onDismissAlert: (alertTitle: string) => void;
  onDismissAllAlerts: (alerts: WeatherAlert[]) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, onPlayAudio, units, dismissedAlerts, onDismissAlert, onDismissAllAlerts }) => {
  const isUser = message.role === 'user';

  const formatText = (text: string) => {
    // Convert markdown lists to HTML lists
    const htmlText = text
      .replace(/(\n|^)- (.*?)(?=\n- |\n\n|$)/g, '$1<li>$2</li>')
      .replace(/<\/li>(\n)?<li>/g, '</li><li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');

    const parts = htmlText.split(/(\*\*.*?\*\*|`.*?`|<ul>.*?<\/ul>)/gs);
    
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={index} className="bg-black/20 px-1.5 py-0.5 rounded font-mono text-sm">{part.slice(1, -1)}</code>;
      }
      if (part.startsWith('<ul>')) {
        return <div key={index} className="prose-ul:list-disc prose-ul:pl-6" dangerouslySetInnerHTML={{ __html: part }} />;
      }
      return <span key={index}>{part}</span>;
    });
  };
  
  const AudioButton = () => {
    if (isUser || !message.content || message.isStreaming) return null;
    let icon;
    switch (message.audioState) {
      case 'loading': icon = <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />; break;
      case 'playing': icon = <svg viewBox="0 0 20 20" fill="currentColor"><path d="M7 5a3 3 0 013-3h.01a3 3 0 013 3v10a3 3 0 01-3 3h-.01a3 3 0 01-3-3V5zm4 0a1 1 0 00-2 0v10a1 1 0 102 0V5z"/></svg>; break;
      default: icon = <svg viewBox="0 0 20 20" fill="currentColor"><path d="M6.3 2.841A1.5 1.5 0 019 4.11V15.89a1.5 1.5 0 01-2.7-1.27V4.111zM13.7 2.841A1.5 1.5 0 0116.5 4.11V15.89a1.5 1.5 0 01-2.7-1.27V4.111z" /></svg>;
    }
    return <button onClick={() => onPlayAudio(message.id, message.content)} className="absolute -right-10 top-1 p-1 rounded-full text-[color:var(--text-secondary)] hover:bg-white/10 hover:text-[color:var(--text-primary)] transition-colors h-6 w-6">{icon}</button>;
  }
  
  const visibleAlerts = message.alerts?.filter(alert => !dismissedAlerts.includes(alert.title)) || [];

  return (
    <div className={`w-full text-[color:var(--text-primary)]`}>
      <div className={`text-base gap-4 md:gap-6 md:max-w-3xl lg:max-w-4xl p-4 md:py-6 flex lg:px-0 m-auto`}>
        <div className="flex-shrink-0 flex flex-col relative items-end">
          <div className={`w-[30px] h-[30px] rounded-lg flex items-center justify-center ${isUser ? 'bg-white/10' : 'bg-gemini-gradient'}`}>
            {isUser ? (
              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" className="h-4 w-4"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            ) : (
               <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white"><path fillRule="evenodd" clipRule="evenodd" d="M12 4.75L13.2356 8.26438L16.75 9.5L13.2356 10.7356L12 14.25L10.7644 10.7356L7.25 9.5L10.7644 8.26438L12 4.75ZM4.75 12L5.53158 14.0658L7.59737 14.8474L5.53158 15.6289L4.75 17.6947L3.96842 15.6289L2 14.8474L3.96842 14.0658L4.75 12ZM17.6947 12L18.4763 14.0658L20.5421 14.8474L18.4763 15.6289L17.6947 17.6947L16.9132 15.6289L14.8474 14.8474L16.9132 14.0658L17.6947 12Z" fill="currentColor"></path></svg>
            )}
          </div>
        </div>
        
        <div className={`relative flex-1 overflow-hidden p-4 rounded-lg bg-[color:var(--bg-message-model)]/80 backdrop-blur-md border border-[color:var(--border-color)] ${isUser ? 'bg-[color:var(--bg-message-user)]/80' : ''}`}>
          <AudioButton />
          
          {message.isStreaming && (!message.current && !message.hourlyData) && <LoadingSkeleton />}
          
          <AlertBanner alerts={visibleAlerts} onDismiss={onDismissAlert} onDismissAll={() => onDismissAllAlerts(visibleAlerts)} />
          
          {message.insights && <Insights insights={message.insights} />}

          {message.current && (
            <>
              <CurrentConditions data={message.current} units={units} />
              <DetailedMetrics data={message.current} units={units} />
            </>
          )}

          <div className="prose prose-invert min-h-[20px] whitespace-pre-wrap leading-7 text-[color:var(--text-primary)] prose-strong:text-[color:var(--text-primary)]">
            {formatText(message.content)}
            {message.isStreaming && !message.content && <div className="h-5 w-1/4 bg-white/20 animate-pulse rounded-full"></div>}
          </div>

          {(message.hourlyData || message.dailyData) && <WeatherChart hourlyData={message.hourlyData} dailyData={message.dailyData} units={units} />}

          {message.containsPlan && (
            <button onClick={() => navigator.clipboard.writeText(message.content)} className="mt-4 px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 rounded-md flex items-center gap-2">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              Copy Plan
            </button>
          )}

          {message.groundingMetadata?.groundingChunks && message.groundingMetadata.groundingChunks.length > 0 && (
            <div className="mt-4 pt-3 border-t border-[color:var(--border-color)]">
              <div className="text-xs font-medium text-[color:var(--text-secondary)] mb-2 uppercase tracking-wide flex items-center gap-2">
                <svg className="w-3 h-3" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                Sources
              </div>
              <div className="flex flex-wrap gap-2">
                {message.groundingMetadata.groundingChunks.map((chunk, idx) => {
                  const source = chunk.web || chunk.maps;
                  if (!source?.uri) return null;
                  return (
                    <a key={idx} href={source.uri} target="_blank" rel="noopener noreferrer" className="inline-flex items-center max-w-full px-3 py-1 text-xs bg-black/20 hover:bg-black/40 rounded-full transition-colors border border-[color:var(--border-color)] truncate">
                      {!!chunk.maps && <svg className="h-3 w-3 mr-1.5 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" /></svg>}
                      <span className="truncate max-w-[200px]">{source.title || new URL(source.uri).hostname}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageItem;