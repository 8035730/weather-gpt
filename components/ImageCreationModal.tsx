
import React, { useState } from 'react';

interface ImageCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (prompt: string, aspectRatio: string) => void;
}

const suggestions = [
  "Cyberpunk city street at night with neon rain",
  "Watercolor landscape of swiss alps",
  "Studio portrait of a robot playing chess",
  "Isometric 3D icon of a weather station",
  "Oil painting of a stormy ocean",
  "Minimalist vector logo of a sun",
  "Cinematic shot of an astronaut on Mars",
  "Pixel art cozy cottage in the woods"
];

const aspectRatios = [
  { label: '1:1', value: '1:1', icon: 'Square' },
  { label: '16:9', value: '16:9', icon: 'Landscape' },
  { label: '9:16', value: '9:16', icon: 'Portrait' },
  { label: '4:3', value: '4:3', icon: 'Photo' },
  { label: '3:4', value: '3:4', icon: 'Poster' },
];

const ImageCreationModal: React.FC<ImageCreationModalProps> = ({ isOpen, onClose, onGenerate }) => {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#1e1e1e] rounded-2xl w-full max-w-lg border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Image Studio
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Prompt Input */}
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Prompt</label>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 ring-purple-500/50 min-h-[100px] resize-none"
              placeholder="Describe what you want to see..."
              autoFocus
            />
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Aspect Ratio</label>
            <div className="grid grid-cols-5 gap-2">
              {aspectRatios.map((ratio) => (
                <button 
                  key={ratio.value}
                  onClick={() => setAspectRatio(ratio.value)}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${aspectRatio === ratio.value ? 'bg-purple-500/20 border-purple-500 text-purple-300' : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10 hover:text-white'}`}
                >
                  <span className="text-xs font-bold">{ratio.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Suggestions */}
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Inspiration</label>
            <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
              {suggestions.map((s, i) => (
                <button 
                  key={i} 
                  onClick={() => setPrompt(s)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-full text-xs text-gray-300 border border-white/5 transition-colors text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex justify-end bg-black/20">
          <button 
            onClick={() => { onGenerate(prompt, aspectRatio); onClose(); }}
            disabled={!prompt.trim()}
            className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white px-6 py-2 rounded-lg font-medium shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
          >
            Generate
          </button>
        </div>

      </div>
    </div>
  );
};

export default ImageCreationModal;
