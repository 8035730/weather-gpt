
import { GoogleGenAI, Modality } from "@google/genai";
import { VoiceName } from "./types";

const outputAudioContext = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


export const generateSpeech = async (text: string, voice: VoiceName): Promise<AudioBuffer | null> => {
  if (!text.trim()) return null;
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    if (outputAudioContext.state === 'suspended') {
      await outputAudioContext.resume();
    }
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("No audio data in response");
    }

    const decodedAudio = decode(base64Audio);
    return await decodeAudioData(decodedAudio, outputAudioContext, 24000, 1);
  } catch (error) {
    console.error("TTS generation failed:", error);
    return null;
  }
};

export const playAudio = (audioBuffer: AudioBuffer, onEnded: () => void): AudioBufferSourceNode => {
    const source = outputAudioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(outputAudioContext.destination);
    source.addEventListener('ended', onEnded, { once: true });
    source.start();
    return source;
};
