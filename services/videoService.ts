
import { GoogleGenAI } from "@google/genai";
import { VideoResult } from "../types";

export const generateVideo = async (
  prompt: string,
  aspectRatio: '16:9' | '9:16',
  onUpdate: (update: VideoResult) => void
) => {
  // Use a localized variable for progress to avoid race conditions with updates
  let currentProgress = 0;
  
  onUpdate({ status: 'generating', progress: 0 });

  try {
    // Re-initialize AI client right before use to catch any updated keys/permissions
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio,
      }
    });
    
    currentProgress = 10;
    onUpdate({ status: 'generating', progress: currentProgress });

    // Polling logic
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
      
      try {
        operation = await ai.operations.getVideosOperation({ operation: operation });
        // Fixed: Use manual progress estimation as 'progress' property does not exist on GenerateVideosOperation
        currentProgress = Math.min(95, currentProgress + 5);
        onUpdate({ status: 'generating', progress: currentProgress });
      } catch (pollError: any) {
        // If operation is lost or 404s, it's a model-side issue
        if (pollError.message?.includes("404") || pollError.message?.includes("Not Found")) {
          throw new Error("Video generation session lost. This can happen due to high traffic or model timeouts. Please try again.");
        }
        throw pollError;
      }
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

    if (downloadLink) {
      onUpdate({ status: 'done', uri: downloadLink, progress: 100 });
    } else {
      throw new Error("Video generation completed, but no URI was returned.");
    }
  } catch (error: any) {
    console.error("Video generation process failed:", error);
    let message = error.message || "An unknown error occurred.";
    if (message.includes("404") || message.includes("Requested entity was not found")) {
      message = "Video generation model is currently unavailable or your account lacks access to 'veo-3.1-fast-generate-preview'.";
    }
    onUpdate({ status: 'error', error: message });
    throw error;
  }
};
