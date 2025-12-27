
import React from 'react';
import { Settings, ImageSize } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSettingsChange: (newSettings: Settings) => void;
  onGenerateBackground: () => void;
  isGenerating: boolean;
  generationError?: string | null;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSettingsChange, onGenerateBackground, isGenerating, generationError }) => {
  if (!isOpen) return null;

  const handleSettingChange = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

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

  return (
    <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center" onClick={onClose}>
      <div className="bg-[color:var(--bg-input)] rounded-xl shadow-2xl w-full max-w-md m-4 border border-[color:var(--border-color)] backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-[color:var(--border-color)]">
          <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Settings</h2>
          <p className="text-sm text-[color:var(--text-secondary)] mt-1">Customize your AI experience.</p>
        </div>
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <RadioGroup label="Theme" options={[{ value: 'diamond', label: 'Diamond' }, { value: 'sky', label: 'Sky' }]} selected={settings.theme} onChange={(v) => handleSettingChange('theme', v)} />
          <RadioGroup 
            label="Active Brain" 
            options={[
              { value: 'fast', label: 'Gemini 2.5' }, 
              { value: 'advanced', label: 'Gemini Ultra' }
            ]} 
            selected={settings.defaultModel} 
            onChange={(v) => handleSettingChange('defaultModel', v)} 
          />
          <RadioGroup label="Units" options={[{ value: 'metric', label: 'Metric' }, { value: 'imperial', label: 'Imperial' }]} selected={settings.units} onChange={(v) => handleSettingChange('units', v)} />
          
          <div>
            <label className="flex items-center justify-between cursor-pointer mb-2">
               <span className="block text-sm font-medium text-[color:var(--text-secondary)]">Conversational Voice Mode</span>
               <input 
                 type="checkbox" 
                 checked={settings.conversationalMode} 
                 onChange={(e) => handleSettingChange('conversationalMode', e.target.checked)}
                 className="sr-only peer"
               />
               <div className="relative w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
            <p className="text-xs text-[color:var(--text-secondary)]">Allows hands-free, continuous back-and-forth conversation.</p>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[color:var(--text-primary)] pt-2">API Keys</h3>
            <div>
               <label htmlFor="owm-key" className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1">OpenWeatherMap API Key (Optional)</label>
               <input 
                 id="owm-key"
                 type="password"
                 value={settings.openWeatherApiKey || ''}
                 onChange={(e) => handleSettingChange('openWeatherApiKey', e.target.value)}
                 placeholder="Unlock Temp & Wind layers"
                 className="w-full bg-[color:var(--bg-input)] border border-[color:var(--border-color)] rounded-lg px-3 py-2 text-[color:var(--text-primary)] focus:outline-none focus:ring-2 ring-blue-500/50 text-sm"
               />
            </div>
            
            <div>
               <label htmlFor="tomorrow-key" className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1">Tomorrow.io API Key (Optional)</label>
               <input 
                 id="tomorrow-key"
                 type="password"
                 value={settings.tomorrowIoApiKey || ''}
                 onChange={(e) => handleSettingChange('tomorrowIoApiKey', e.target.value)}
                 placeholder="Unlock 10+ Premium layers"
                 className="w-full bg-[color:var(--bg-input)] border border-[color:var(--border-color)] rounded-lg px-3 py-2 text-[color:var(--text-primary)] focus:outline-none focus:ring-2 ring-blue-500/50 text-sm"
               />
               <p className="text-xs text-[color:var(--text-secondary)] mt-1">Access high-res layers: Humidity, Cloud Cover, Visibility, etc.</p>
            </div>
          </div>

          <div>
            <label htmlFor="voice-select" className="block text-sm font-medium text-[color:var(--text-secondary)] mb-2">AI Voice</label>
            <select id="voice-select" value={settings.voice} onChange={(e) => handleSettingChange('voice', e.target.value as any)} className="w-full bg-[color:var(--bg-input)] border border-[color:var(--border-color)] rounded-lg px-3 py-2 text-[color:var(--text-primary)] focus:outline-none focus:ring-2 ring-blue-500/50">
              <option value="Zephyr">Zephyr (Default)</option>
              <option value="Puck">Puck</option>
              <option value="Kore">Kore</option>
              <option value="Charon">Charon</option>
              <option value="Fenrir">Fenrir</option>
            </select>
          </div>
          
          <div className="border-t border-[color:var(--border-color)] pt-6">
            <h3 className="text-md font-semibold text-[color:var(--text-primary)]">Custom Background</h3>
            <p className="text-sm text-[color:var(--text-secondary)] mt-1 mb-4">Generate a unique background with Gemini 2.5 Flash Image.</p>
            <textarea value={settings.backgroundPrompt} onChange={e => handleSettingChange('backgroundPrompt', e.target.value)} placeholder="e.g., A serene anime sky at dusk" className="w-full bg-[color:var(--bg-input)] border border-[color:var(--border-color)] rounded-lg px-3 py-2 text-[color:var(--text-primary)] focus:outline-none focus:ring-2 ring-blue-500/50" rows={2}/>
            
            <div className="flex items-center gap-4 mt-4">
              <button onClick={onGenerateBackground} disabled={isGenerating || !settings.backgroundPrompt} className="w-full px-4 py-2 bg-gemini-gradient text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {isGenerating && <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-white" />}
                {isGenerating ? 'Generating...' : 'Generate'}
              </button>
            </div>
             {generationError && (
              <div className="mt-3 text-xs text-red-400 bg-red-500/10 p-2.5 rounded-md border border-red-500/20">
                <span className="font-semibold">Generation Failed:</span> {generationError} <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-red-300 font-medium">Learn more about billing.</a>
              </div>
            )}
             {settings.backgroundType === 'custom' && settings.backgroundImage && (
                <button onClick={() => {
                  handleSettingChange('backgroundType', 'default');
                  handleSettingChange('backgroundImage', '');
                  handleSettingChange('backgroundPrompt', '');
                }} className="w-full mt-2 px-4 py-2 bg-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/20">Reset to Default</button>
              )}
          </div>

        </div>
        <div className="p-4 bg-[color:var(--bg-input)] text-right rounded-b-xl border-t border-[color:var(--border-color)]">
          <button onClick={onClose} className="px-5 py-2 bg-gemini-gradient text-white text-sm font-medium rounded-lg shadow-lg hover:opacity-90">Done</button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
