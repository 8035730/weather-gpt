import React from 'react';
import { ChatSession } from '../types';

interface SidebarProps {
  isOpen: boolean;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onToggle: () => void;
  onOpenSettings: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, sessions, currentSessionId, onNewChat, onSelectChat, onToggle, onOpenSettings
}) => {
  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/60 z-20 transition-opacity md:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onToggle}
      />
      <div className={`
        fixed inset-y-0 left-0 z-30 w-[260px] bg-[color:var(--bg-sidebar)]/80 backdrop-blur-xl text-[color:var(--text-primary)] transition-transform duration-300 transform 
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:relative md:translate-x-0 flex flex-col border-r border-[color:var(--border-color)]
      `}>
        <div className="p-2 flex-shrink-0">
          <button
            onClick={() => { onNewChat(); if (window.innerWidth < 768) onToggle(); }}
            className="flex items-center gap-3 w-full px-3 py-3 rounded-md border border-[color:var(--border-color)] hover:bg-white/10 transition-colors text-sm"
          >
            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            New chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2">
          <div className="flex flex-col gap-2">
            <h3 className="px-3 text-xs font-medium text-[color:var(--text-secondary)] py-2">History</h3>
            {sessions.map(session => (
              <button
                key={session.id}
                onClick={() => { onSelectChat(session.id); if (window.innerWidth < 768) onToggle(); }}
                className={`relative flex items-center gap-3 px-3 py-3 rounded-md text-sm transition-colors overflow-hidden w-full text-left ${
                  currentSessionId === session.id ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                {currentSessionId === session.id && <div className="absolute left-0 top-0 h-full w-1 bg-gemini-gradient rounded-r-full"></div>}
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-[color:var(--text-secondary)]" xmlns="http://www.w3.org/2000/svg"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                <span className="truncate">{session.title}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-[color:var(--border-color)] p-2">
          <button onClick={onOpenSettings} className="flex items-center gap-3 w-full px-3 py-3 rounded-md hover:bg-white/10 transition-colors text-sm">
             <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            Settings
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
