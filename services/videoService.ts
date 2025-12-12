
import { GoogleGenAI } from "@google/genai";
import { VideoResult } from "./types";

export const generateVideo = async (
  prompt: string,
  aspectRatio: '16:9' | '9:16',
  onUpdate: (update: VideoResult) => void
) => {
  let ai: GoogleGenAI;
  try {
    ai = new GoogleGenAI({ apiKey: (window as any).GEMINI_API_KEY });
  } catch (error) {
    onUpdate({ status: 'error', error: 'Failed to initialize AI. Check API Key.' });
    throw error;
  }

  onUpdate({ status: 'generating', progress: 0 });

  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio,
      }
    });
    
    onUpdate({ status: 'generating', progress: 10 });

    // Polling logic
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
      operation = await ai.operations.getVideosOperation({ operation: operation });
      onUpdate({ status: 'generating', progress: operation.progress?.completePercent || 50 });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

    if (downloadLink) {
      onUpdate({ status: 'done', uri: downloadLink, progress: 100 });
    } else {
      throw new Error("Video generation completed, but no URI was returned.");
    }
  } catch (error: any) {
    console.error("Video generation process failed:", error);
    onUpdate({ status: 'error', error: error.message || "An unknown error occurred." });
    throw error;
  }
};
