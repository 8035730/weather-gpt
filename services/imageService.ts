
import { GoogleGenAI } from "@google/genai";
import { ImageSize } from "./types";

export const generateBackgroundImage = async (prompt: string, imageSize: ImageSize): Promise<string | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const fullPrompt = `A beautiful, scenic, high-quality background image for a weather application. The scene should be: ${prompt}. Aspect ratio 16:9. Photorealistic, 8k.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: fullPrompt }] },
      config: {
        imageConfig: {
          imageSize: imageSize,
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
