

import { GoogleGenAI } from "@google/genai";

export const generateBackgroundImage = async (prompt: string): Promise<string | null> => {
  try {
    // FIX: Re-instantiate the client on every call to ensure the latest API key is used.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const fullPrompt = `A beautiful, scenic, high-quality background image for a weather application. The scene should be: ${prompt}. Aspect ratio 16:9. Photorealistic, 8k.`;
    
    // Using gemini-2.5-flash-image as requested.
    // Note: 2.5 Flash Image may not support 'imageConfig' with explicit sizes in the same way as Pro.
    // We strictly send the prompt.
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: fullPrompt }] },
      // Config removed to prevent INVALID_ARGUMENT errors with 2.5 flash image model
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