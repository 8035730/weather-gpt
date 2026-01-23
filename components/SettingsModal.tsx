
import React, { useState } from 'react';
import { Settings, ImageSize, ChatSession } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSettingsChange: (newSettings: Settings) => void;
  onGenerateBackground: () => void;
  isGenerating: boolean;
  generationError?: string | null;
  sessions: ChatSession[];
}

const RadioGroup = ({ label, options, selected, onChange }: { label:string, options: {value: string, label: string}[], selected: string, onChange: (value: any) => void}) => (
  <div>
    <label className="block text-sm font-medium text-[color:var(--text-secondary)] mb-2">{label}</label>
    <div className="flex space-x-2 rounded-lg bg-black/20 p-1">
      {options.map(option => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`w-full rounded-md px-3 py-1.5 text-xs md:text-sm font-medium transition-all ${
            selected === option.value ? 'bg-gemini-gradient text-white shadow' : 'text-[color:var(--text-secondary)] hover:bg-white/10'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  </div>
);

const Section = ({ title, children }: React.PropsWithChildren<{ title: string }>) => (
  <div className="mb-6">
    <h3 className="text-sm font-semibold text-[color:var(--text-primary)] mb-3 pb-1 border-b border-[color:var(--border-color)]">{title}</h3>
    <div className="space-y-4">
      {children}
    </div>
  </div>
);

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, onClose, settings, onSettingsChange, onGenerateBackground, isGenerating, generationError, sessions 
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'data' | 'api'>('general');
  const [exportFormat, setExportFormat] = useState<'json' | 'txt'>('json');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  const handleSettingChange = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const handleExport = () => {
    let filteredSessions = sessions;

    if (exportStartDate) {
      const start = new Date(exportStartDate).getTime();
      filteredSessions = filteredSessions.filter(s => s.createdAt >= start);
    }
    if (exportEndDate) {
      const end = new Date(exportEndDate).getTime() + 86400000; // Include end of day
      filteredSessions = filteredSessions.filter(s => s.createdAt <= end);
    }

    let dataStr = '';
    let filename = `weather-gpt-export-${new Date().toISOString().slice(0, 10)}`;

    if (exportFormat === 'json') {
      dataStr = JSON.stringify(filteredSessions, null, 2);
      filename += '.json';
    } else {
      filename += '.txt';
      filteredSessions.forEach(session => {
        dataStr += `=== CONVERSATION: ${session.title} (${new Date(session.createdAt).toLocaleString()}) ===\n\n`;
        session.messages.forEach(msg => {
          dataStr += `[${msg.role.toUpperCase()} - ${new Date(msg.timestamp).toLocaleTimeString()}]\n${msg.content}\n\n`;
        });
        dataStr += `--------------------------------------------------\n\n`;
      });
    }

    const blob = new Blob([dataStr], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center font-sans" onClick={onClose}>
      <div className="bg-[color:var(--bg-input)] rounded-xl shadow-2xl w-full max-w-2xl m-4 border border-[color:var(--border-color)] backdrop-blur-xl flex flex-col md:flex-row overflow-hidden max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        
        {/* Sidebar Tabs */}
        <div className="w-full md:w-48 bg-black/20 border-b md:border-b-0 md:border-r border-[color:var(--border-color)] p-4 flex md:flex-col gap-2 overflow-x-auto md:overflow-visible">
          <div className="md:mb-4 px-2 hidden md:block">
            <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Settings</h2>
          </div>
          {[
            { id: 'general', label: 'General', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg> },
            { id: 'appearance', label: 'Appearance', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg> },
            { id: 'api', label: 'API Keys', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11.5 15.75l-1.5-1.5-2.25 2.25-1.5-1.5-2.25 2.25A3 3 0 002 18v2a2 2 0 002 2h2a2 2 0 002-2v-1.5c0-.995.78-2.778 1.457-2.778 0 0 5.743-1.743 5.743-5.743A6 6 0 0121 9z" /></svg> },
            { id: 'data', label: 'Data & Privacy', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg> },
          ].map((tab: any) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full ${
                activeTab === tab.id 
                  ? 'bg-blue-500/10 text-blue-400' 
                  : 'text-[color:var(--text-secondary)] hover:bg-white/5 hover:text-[color:var(--text-primary)]'
              }`}
            >
              {tab.icon}
              <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10">
          
          {activeTab === 'general' && (
            <>
              <Section title="AI & Model">
                <RadioGroup 
                  label="Active Brain" 
                  options={[
                    { value: 'fast', label: 'Gemini 2.5 (Fast)' }, 
                    { value: 'advanced', label: 'Gemini Ultra (Smart)' }
                  ]} 
                  selected={settings.defaultModel} 
                  onChange={(v) => handleSettingChange('defaultModel', v)} 
                />
              </Section>
              
              <Section title="Preferences">
                <RadioGroup 
                  label="Units" 
                  options={[{ value: 'metric', label: 'Metric (°C, km/h)' }, { value: 'imperial', label: 'Imperial (°F, mph)' }]} 
                  selected={settings.units} 
                  onChange={(v) => handleSettingChange('units', v)} 
                />
              </Section>

              <Section title="Voice Control">
                <div>
                  <label htmlFor="voice-select" className="block text-sm font-medium text-[color:var(--text-secondary)] mb-2">AI Voice</label>
                  <select id="voice-select" value={settings.voice} onChange={(e) => handleSettingChange('voice', e.target.value as any)} className="w-full bg-black/20 border border-[color:var(--border-color)] rounded-lg px-3 py-2 text-[color:var(--text-primary)] focus:outline-none focus:ring-2 ring-blue-500/50">
                    <option value="Zephyr">Zephyr (Balanced)</option>
                    <option value="Puck">Puck (Energetic)</option>
                    <option value="Kore">Kore (Calm)</option>
                    <option value="Charon">Charon (Deep)</option>
                    <option value="Fenrir">Fenrir (Authoritative)</option>
                  </select>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-[color:var(--border-color)] mt-3">
                   <div>
                     <span className="block text-sm font-medium text-[color:var(--text-primary)]">Conversational Mode</span>
                     <span className="text-xs text-[color:var(--text-secondary)]">Automatically listen after assistant speaks.</span>
                   </div>
                   <label className="relative inline-flex items-center cursor-pointer">
                     <input 
                       type="checkbox" 
                       checked={settings.conversationalMode} 
                       onChange={(e) => handleSettingChange('conversationalMode', e.target.checked)}
                       className="sr-only peer"
                     />
                     <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                   </label>
                </div>
              </Section>
            </>
          )}

          {activeTab === 'appearance' && (
            <>
              <Section title="Theme">
                 <RadioGroup label="Interface Theme" options={[{ value: 'diamond', label: 'Diamond (Dark)' }, { value: 'sky', label: 'Sky (Light)' }]} selected={settings.theme} onChange={(v) => handleSettingChange('theme', v)} />
              </Section>

              <Section title="Custom Background">
                <p className="text-sm text-[color:var(--text-secondary)] mb-3">Generate a unique background with Gemini 2.5 Flash Image.</p>
                <textarea 
                  value={settings.backgroundPrompt} 
                  onChange={e => handleSettingChange('backgroundPrompt', e.target.value)} 
                  placeholder="e.g., A serene anime sky at dusk with purple clouds" 
                  className="w-full bg-black/20 border border-[color:var(--border-color)] rounded-lg px-3 py-2 text-[color:var(--text-primary)] focus:outline-none focus:ring-2 ring-blue-500/50 min-h-[80px]" 
                />
                
                <div className="flex flex-col gap-2 mt-3">
                  <button onClick={onGenerateBackground} disabled={isGenerating || !settings.backgroundPrompt} className="w-full px-4 py-2 bg-gemini-gradient text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                    {isGenerating && <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-white" />}
                    {isGenerating ? 'Generating...' : 'Generate New Background'}
                  </button>
                  
                  {settings.backgroundType === 'custom' && settings.backgroundImage && (
                    <button onClick={() => {
                      handleSettingChange('backgroundType', 'default');
                      handleSettingChange('backgroundImage', '');
                      handleSettingChange('backgroundPrompt', '');
                    }} className="w-full px-4 py-2 bg-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/20 transition-colors">
                      Reset to Default
                    </button>
                  )}
                </div>

                {generationError && (
                  <div className="mt-3 text-xs text-red-400 bg-red-500/10 p-2.5 rounded-md border border-red-500/20">
                    <span className="font-semibold">Error:</span> {generationError}
                  </div>
                )}
              </Section>
            </>
          )}

          {activeTab === 'api' && (
            <>
               <Section title="Weather Providers">
                 <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1">OpenWeatherMap API Key (For Tile Layers)</label>
                    <input 
                      type="password"
                      value={settings.openWeatherApiKey || ''}
                      onChange={(e) => handleSettingChange('openWeatherApiKey', e.target.value)}
                      placeholder="sk_..."
                      className="w-full bg-black/20 border border-[color:var(--border-color)] rounded-lg px-3 py-2 text-[color:var(--text-primary)] focus:outline-none focus:ring-2 ring-blue-500/50 text-sm"
                    />
                    <p className="text-[10px] text-[color:var(--text-secondary)] mt-1">Required for Temperature, Wind, and Pressure map layers.</p>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1">Tomorrow.io API Key</label>
                    <input 
                      type="password"
                      value={settings.tomorrowIoApiKey || ''}
                      onChange={(e) => handleSettingChange('tomorrowIoApiKey', e.target.value)}
                      placeholder="sk_..."
                      className="w-full bg-black/20 border border-[color:var(--border-color)] rounded-lg px-3 py-2 text-[color:var(--text-primary)] focus:outline-none focus:ring-2 ring-blue-500/50 text-sm"
                    />
                  </div>
                 </div>
               </Section>
            </>
          )}

          {activeTab === 'data' && (
            <>
              <Section title="Export Chat History">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1">Start Date</label>
                    <input type="date" className="w-full bg-black/20 border border-[color:var(--border-color)] rounded-lg px-3 py-2 text-[color:var(--text-primary)] text-sm focus:outline-none" onChange={(e) => setExportStartDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1">End Date</label>
                    <input type="date" className="w-full bg-black/20 border border-[color:var(--border-color)] rounded-lg px-3 py-2 text-[color:var(--text-primary)] text-sm focus:outline-none" onChange={(e) => setExportEndDate(e.target.value)} />
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1">Format</label>
                  <div className="flex space-x-2">
                    <button onClick={() => setExportFormat('json')} className={`flex-1 py-2 rounded-lg text-sm font-medium border ${exportFormat === 'json' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'border-[color:var(--border-color)] text-[color:var(--text-secondary)] hover:bg-white/5'}`}>JSON</button>
                    <button onClick={() => setExportFormat('txt')} className={`flex-1 py-2 rounded-lg text-sm font-medium border ${exportFormat === 'txt' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'border-[color:var(--border-color)] text-[color:var(--text-secondary)] hover:bg-white/5'}`}>Text File</button>
                  </div>
                </div>

                <button onClick={handleExport} className="w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Download Export
                </button>
              </Section>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-[color:var(--bg-input)] border-t md:border-t-0 md:border-l border-[color:var(--border-color)] flex md:flex-col justify-end gap-3 md:w-32">
           <button onClick={onClose} className="flex-1 md:flex-none px-4 py-2 bg-gemini-gradient text-white text-sm font-medium rounded-lg shadow-lg hover:opacity-90 text-center">Done</button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
