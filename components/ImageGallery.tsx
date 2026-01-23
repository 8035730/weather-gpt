
import React from 'react';

interface GalleryImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
}

interface ImageGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  images: GalleryImage[];
  onDelete: (id: string) => void;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ isOpen, onClose, images, onDelete }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-[60] flex flex-col font-sans backdrop-blur-md" onClick={onClose}>
        {/* Header */}
        <div className="p-4 flex justify-between items-center bg-black/40 border-b border-white/10 z-10" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                My Gallery
                <span className="text-sm font-normal text-gray-500 ml-2">({images.length})</span>
            </h2>
            <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8" onClick={e => e.stopPropagation()}>
            {images.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <p className="text-lg">No images generated yet.</p>
                    <p className="text-sm mt-2">Use the "Image Studio" to create something amazing.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {images.map((img) => (
                        <div key={img.id} className="group relative rounded-xl overflow-hidden bg-[#1e1e1e] border border-white/10 shadow-lg aspect-square">
                            <img src={img.url} alt={img.prompt} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                            
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                                <p className="text-xs text-gray-300 line-clamp-2 mb-3 italic">"{img.prompt}"</p>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-gray-500">{new Date(img.timestamp).toLocaleDateString()}</span>
                                    <div className="flex gap-2">
                                        <a href={img.url} download={`generated-${img.id}.png`} className="p-1.5 bg-white/20 hover:bg-white/40 rounded-lg text-white" title="Download">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        </a>
                                        <button onClick={() => onDelete(img.id)} className="p-1.5 bg-red-500/20 hover:bg-red-500/40 rounded-lg text-red-300 hover:text-red-100" title="Delete">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
};

export default ImageGallery;
