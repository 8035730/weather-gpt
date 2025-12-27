
import React from 'react';
import { ImageResult } from '../types';

interface ImageDisplayProps {
  result: ImageResult;
  prompt: string;
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({ result, prompt }) => {
  if (result.status === 'generating') {
    return (
      <div className="my-4 p-6 rounded-2xl bg-black/20 border border-white/10 backdrop-blur-md">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500/30 border-t-blue-500" />
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
    return (
      <div className="my-4 group relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black/40 animate-in fade-in zoom-in duration-500">
        <img 
          src={result.url} 
          alt={prompt} 
          className="w-full h-auto object-contain max-h-[500px]"
        />
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
          <div className="flex items-center justify-between gap-3">
             <div className="text-xs text-white/80 line-clamp-1 flex-1 italic">"{prompt}"</div>
             <div className="flex gap-2">
                <a 
                  href={result.url} 
                  download={`generated-image-${Date.now()}.png`}
                  className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full transition-all text-white"
                  title="Download Image"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </a>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ImageDisplay;
