

import React, { useState, useEffect } from 'react';
import { VideoResult } from '../types';

interface VideoPlayerProps {
  result: VideoResult;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ result }) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (result.status === 'done' && result.uri) {
      const fetchVideo = async () => {
        try {
          // IMPORTANT: Append the API key to the URI for authorization
          const response = await fetch(`${result.uri}&key=${(window as any).GEMINI_API_KEY}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch video: ${response.statusText}`);
          }
          const blob = await response.blob();
          if (isMounted) {
            setVideoUrl(URL.createObjectURL(blob));
          }
        } catch (error: any) {
          if (isMounted) {
            setFetchError(error.message);
          }
        }
      };
      fetchVideo();
    }
    return () => { isMounted = false; };
  }, [result.status, result.uri]);

  if (result.status === 'generating') {
    return (
      <div className="my-4 p-4 rounded-lg bg-black/20 border border-[color:var(--border-color)]">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <div>
            <p className="text-sm font-medium text-[color:var(--text-primary)]">Generating Video...</p>
            <p className="text-xs text-[color:var(--text-secondary)]">This can take a few minutes. Please wait.</p>
          </div>
        </div>
      </div>
    );
  }

  if (result.status === 'error' || fetchError) {
    return (
      <div className="my-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
        <p className="text-sm font-medium">Video Generation Failed</p>
        <p className="text-xs mt-1">{result.error || fetchError}</p>
      </div>
    );
  }

  if (result.status === 'done' && videoUrl) {
    return (
      <div className="my-4 rounded-lg overflow-hidden border border-[color:var(--border-color)]">
        <video src={videoUrl} controls autoPlay muted loop className="w-full" />
      </div>
    );
  }

  return null;
};

export default VideoPlayer;
