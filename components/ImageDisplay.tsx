
import React, { useState, useEffect, useRef } from 'react';
import { ImageResult } from '../types';

interface ImageDisplayProps {
  result: ImageResult;
  prompt: string;
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({ result, prompt }) => {
  const [progress, setProgress] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  
  // Edit State
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [sepia, setSepia] = useState(0);

  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (result.status === 'generating') {
      const interval = setInterval(() => {
        setProgress(p => (p < 90 ? p + Math.random() * 10 : p));
      }, 500);
      return () => clearInterval(interval);
    } else if (result.status === 'done') {
      setProgress(100);
    }
  }, [result.status]);

  const resetFilters = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setSepia(0);
  };

  const downloadEdited = () => {
    if (!imgRef.current || !result.url) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = imgRef.current;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    if (ctx) {
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) sepia(${sepia}%)`;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const link = document.createElement('a');
        link.download = `edited-image-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        setIsEditing(false);
    }
  };

  if (result.status === 'generating') {
    return (
      <div className="my-4 p-6 rounded-2xl bg-black/20 border border-white/10 backdrop-blur-md">
        <div className="flex flex-col items-center gap-4">
          <div className="w-full max-w-xs bg-gray-700 h-1.5 rounded-full overflow-hidden">
             <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">Manifesting your vision...</p>
            <p className="text-xs text-[color:var(--text-secondary)] mt-1">Free image generation with Gemini 2.5 Flash</p>
          </div>
        </div>
      </div>
    );
  }

  if (result.status === 'error') {
    return (
      <div className="my-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
        <p className="text-sm font-bold">Visualization Failed</p>
        <p className="text-xs mt-1">{result.error}</p>
      </div>
    );
  }

  if (result.status === 'done' && result.url) {
    const filterStyle = {
        filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) sepia(${sepia}%)`
    };

    return (
      <div className="my-4 group relative rounded-2xl border border-white/10 shadow-2xl bg-black/40 animate-in fade-in zoom-in duration-500 overflow-hidden">
        {/* Editor Controls */}
        {isEditing && (
            <div className="p-4 bg-black/60 backdrop-blur-md border-b border-white/10 grid grid-cols-2 gap-4 text-xs">
                <div>
                    <label className="block text-gray-400 mb-1">Brightness</label>
                    <input type="range" min="0" max="200" value={brightness} onChange={e => setBrightness(Number(e.target.value))} className="w-full accent-blue-500" />
                </div>
                <div>
                    <label className="block text-gray-400 mb-1">Contrast</label>
                    <input type="range" min="0" max="200" value={contrast} onChange={e => setContrast(Number(e.target.value))} className="w-full accent-blue-500" />
                </div>
                <div>
                    <label className="block text-gray-400 mb-1">Saturation</label>
                    <input type="range" min="0" max="200" value={saturation} onChange={e => setSaturation(Number(e.target.value))} className="w-full accent-blue-500" />
                </div>
                <div>
                    <label className="block text-gray-400 mb-1">Sepia</label>
                    <input type="range" min="0" max="100" value={sepia} onChange={e => setSepia(Number(e.target.value))} className="w-full accent-blue-500" />
                </div>
                <div className="col-span-2 flex justify-end gap-2 mt-2">
                    <button onClick={resetFilters} className="px-3 py-1 bg-white/10 rounded hover:bg-white/20 text-white">Reset</button>
                    <button onClick={() => setIsEditing(false)} className="px-3 py-1 bg-white/10 rounded hover:bg-white/20 text-white">Cancel</button>
                    <button onClick={downloadEdited} className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-500 text-white font-bold">Save & Download</button>
                </div>
            </div>
        )}

        <div className="relative overflow-hidden">
            <img 
            ref={imgRef}
            src={result.url} 
            alt={prompt} 
            style={filterStyle}
            crossOrigin="anonymous" // Needed for canvas export if CORS allows
            className="w-full h-auto object-contain max-h-[500px]"
            />
            
            {!isEditing && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 pointer-events-none">
                <div className="flex items-center justify-between gap-3 pointer-events-auto">
                    <div className="text-xs text-white/80 line-clamp-1 flex-1 italic">"{prompt}"</div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setIsEditing(true)}
                            className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full transition-all text-white"
                            title="Edit Image"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <a 
                        href={result.url} 
                        download={`generated-image-${Date.now()}.png`}
                        className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full transition-all text-white"
                        title="Download Original"
                        >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        </a>
                    </div>
                </div>
                </div>
            )}
        </div>
      </div>
    );
  }

  return null;
};

export default ImageDisplay;
