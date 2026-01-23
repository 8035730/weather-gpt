
import React from 'react';
import { ChatSession } from '../types';

interface SidebarProps {
  isOpen: boolean;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onToggle: () => void;
  onOpenSettings: () => void;
  onSaveChats: () => void;
  isSessionsLoading: boolean;
  isSaving: boolean;
  onOpenImageCreation: () => void;
  onOpenGallery: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, sessions, currentSessionId, onNewChat, onSelectChat, onDeleteChat, onToggle, onOpenSettings,
  onSaveChats, isSessionsLoading, isSaving, onOpenImageCreation, onOpenGallery
}) => {
  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onToggle}
      />
      <div className={`
        fixed inset-y-0 left-0 z-50 w-[280px] bg-[color:var(--bg-sidebar)]/95 backdrop-blur-2xl text-[color:var(--text-primary)] transition-transform duration-300 ease-out transform 
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        flex flex-col border-r border-[color:var(--border-color)] shadow-2xl
      `}>
        {/* Header Section */}
        <div className="p-4 flex-shrink-0">
          <button
            onClick={() => { onNewChat(); onToggle(); }}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-gemini-gradient text-white font-medium shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:scale-[1.02] transition-all duration-200 group"
          >
            <svg stroke="currentColor" fill="none" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 group-hover:rotate-90 transition-transform"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span>New Chat</span>
          </button>
        </div>

        {/* Tools Section (New) */}
        <div className="px-4 pb-2 flex gap-2">
            <button 
                onClick={() => { onOpenImageCreation(); onToggle(); }}
                className="flex-1 flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-colors text-xs gap-1 group"
            >
                <svg className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span>Studio</span>
            </button>
            <button 
                onClick={() => { onOpenGallery(); onToggle(); }}
                className="flex-1 flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-colors text-xs gap-1 group"
            >
                <svg className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                <span>Gallery</span>
            </button>
        </div>

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <div className="flex flex-col gap-2 mt-1">
            <h3 className="px-3 text-[10px] font-bold text-[color:var(--text-secondary)] uppercase tracking-wider py-2 sticky top-0 bg-[color:var(--bg-sidebar)]/95 backdrop-blur-xl z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <span>Recent Activity</span>
                 {(isSessionsLoading || isSaving) && (
                   <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" title="Syncing..."></div>
                 )}
              </div>
              <span className="bg-white/5 border border-white/5 px-1.5 py-0.5 rounded text-[9px] text-[color:var(--text-secondary)]">{sessions.length}</span>
            </h3>
            
            {isSessionsLoading ? (
              // Skeleton Loading State
              <div className="space-y-3 px-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 w-full bg-white/5 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[color:var(--text-secondary)]">
                <div className="mb-2 opacity-50">
                   <svg className="w-8 h-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                No chat history yet.
              </div>
            ) : (
              sessions.map(session => (
                <div key={session.id} className="relative group perspective-1000">
                  <button
                    onClick={() => { onSelectChat(session.id); onToggle(); }}
                    className={`relative flex items-center gap-3 px-3 py-3.5 rounded-xl text-sm transition-all duration-300 w-full text-left pr-10 border ${
                      currentSessionId === session.id 
                        ? 'bg-gradient-to-r from-white/10 to-transparent border-white/10 text-white shadow-md translate-x-1' 
                        : 'border-transparent text-[color:var(--text-secondary)] hover:bg-white/5 hover:text-[color:var(--text-primary)] hover:border-white/5 hover:translate-x-1'
                    }`}
                  >
                    <div className={`shrink-0 transition-colors duration-300 ${currentSessionId === session.id ? 'text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'text-gray-500 group-hover:text-gray-400'}`}>
                       <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{session.title}</div>
                        <div className="text-[10px] opacity-60 truncate mt-0.5">
                            {new Date(session.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • {session.model === 'advanced' ? 'Ultra' : 'Flash'}
                        </div>
                    </div>
                    
                    {currentSessionId === session.id && (
                       <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full shadow-[0_0_5px_#60a5fa] animate-pulse"></div>
                    )}
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm("Are you sure you want to delete this chat?")) {
                        onDeleteChat(session.id);
                      }
                    }}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-200 backdrop-blur-sm z-10 ${currentSessionId === session.id ? 'mr-3' : ''}`}
                    title="Delete chat"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-[color:var(--border-color)] bg-[color:var(--bg-sidebar)] space-y-2">
           <button 
            onClick={onSaveChats}
            disabled={isSaving}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-sm text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed group"
          >
             {isSaving ? (
               <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
             ) : (
               <svg className="h-4 w-4 group-hover:text-green-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
             )}
            <span>{isSaving ? 'Saving...' : 'Save chats locally'}</span>
          </button>

          <button 
            onClick={() => { onOpenSettings(); onToggle(); }} 
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-sm text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] group"
          >
             <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 group-hover:text-blue-400 transition-colors" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            <span>Settings</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
