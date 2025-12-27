
import { GoogleGenAI } from "@google/genai";
import { ImageSize, ImageRequest } from "../types";

export const generateBackgroundImage = async (prompt: string, imageSize: ImageSize): Promise<string | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const fullPrompt = `A beautiful, scenic, high-quality background image for a weather application. The scene should be: ${prompt}. Aspect ratio 16:9. Photorealistic, 8k.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: fullPrompt }] },
      config: {
        imageConfig: {
          aspectRatio: '16:9',
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64Data = part.inlineData.data;
        return `data:image/png;base64,${base64Data}`;
      }
    }
    
    console.warn("No image data found in response");
    return null;

  } catch (error) {
    console.error("Image generation failed:", error);
    throw error;
  }
};

export const generateImage = async (
  request: ImageRequest,
  attachment?: { data: string; mimeType: string }
): Promise<string | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const parts: any[] = [{ text: request.prompt }];
    
    if (attachment) {
      parts.unshift({
        inlineData: {
          data: attachment.data.split(',')[1],
          mimeType: attachment.mimeType
        }
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: request.aspectRatio
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    return null;
  } catch (error) {
    console.error("Standard image generation failed:", error);
    throw error;
  }
};
