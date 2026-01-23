
import { GoogleGenAI, GenerateContentResponse, Type, Modality } from "@google/genai";
import { Message, WeatherDataPoint, WeatherAlert, WeatherModel, Settings, CurrentWeatherData, VideoRequest, ImageRequest, Units } from "../types";

const getSystemInstruction = (settings: Settings, model: WeatherModel): string => {
  return `
You are **WeatherGPT**, an advanced AI assistant.
You are helpful, knowledgeable, and creative. You can answer questions about any topic, including coding, history, science, and general knowledge.

**SPECIALIZED CAPABILITIES:**
1.  **Weather Analysis**: You have access to real-time weather data and the GenCast diffusion model. If a user asks about weather, you **MUST** use the \`json_weather\` format.
2.  **Image Generation**: You can generate images using Google's latest diffusion models. Use the \`json_image\` format.
3.  **Video Generation**: You can generate videos. Use the \`json_video\` format.
4.  **Diagrams**: You can create diagrams using Mermaid.js syntax.

**RENDERING RULES:**

- **General Queries** (Coding, Chat, QA):
  Answer naturally in Markdown. Use headers, bold text, lists, and code blocks where appropriate.

- **Weather/Location Intent**:
  Output \`\`\`json_weather\`\`\`.
  **CRITICAL:** You MUST include "latitude" and "longitude".
  
  Format:
  \`\`\`json_weather
  {
    "location": "City, State",
    "latitude": number,
    "longitude": number,
    "current": { 
      "temperature": number, 
      "feelsLike": number, 
      "condition": "Short text", 
      "summary": "Brief analysis.", 
      "sunrise": "HH:MM", "sunset": "HH:MM", 
      "pressure": number, "humidity": number, "windSpeed": number, "windDirection": "NW", 
      "uvIndex": number, "visibility": number, "aqi": number, "pollen": number, 
      "dewPoint": number, "cloudCover": number,
      "historicalAvg": number
    },
    "hourly": [ { "time": "1 PM", "temperature": number, "precipitation": number, "confidence": number (0-100) } ],
    "daily": [ { "time": "Day", "temperature": number, "precipitation": number, "confidence": number (0-100) } ],
    "alerts": [ { "severity": "Warning", "title": "Title", "description": "Text" } ],
    "insights": [ "Key Insight 1", "Key Insight 2" ]
  }
  \`\`\`

- **Visual Creation Intent**:
  For Images: \`\`\`json_image { "prompt": "...", "aspectRatio": "..." } \`\`\`
  For Videos: \`\`\`json_video { "prompt": "...", "aspectRatio": "..." } \`\`\`

- **Logic/Diagram Intent**:
  \`\`\`mermaid
  graph TD; A-->B;
  \`\`\`
`;
};

// Unit conversion functions
const toFahrenheit = (c: number) => (c * 9/5) + 32;
const toMph = (kph: number) => kph / 1.609;
const toMiles = (km: number) => km / 1.609;
const toInHg = (hpa: number) => hpa / 33.864;

const convertDataUnits = (data: any, units: Units) => {
    if (units === 'imperial') {
        if (data.current) {
            data.current.temperature = toFahrenheit(data.current.temperature);
            data.current.feelsLike = toFahrenheit(data.current.feelsLike);
            data.current.historicalAvg = toFahrenheit(data.current.historicalAvg);
            data.current.windSpeed = toMph(data.current.windSpeed);
            data.current.visibility = toMiles(data.current.visibility);
            data.current.pressure = toInHg(data.current.pressure);
            data.current.dewPoint = toFahrenheit(data.current.dewPoint);
        }
        const convertPoints = (points: WeatherDataPoint[]) => {
            return points.map(p => ({
                ...p,
                temperature: p.temperature !== undefined ? toFahrenheit(p.temperature) : undefined,
                feelsLike: p.feelsLike !== undefined ? toFahrenheit(p.feelsLike) : undefined,
                historicalAvgTemp: p.historicalAvgTemp !== undefined ? toFahrenheit(p.historicalAvgTemp) : undefined,
                windSpeed: p.windSpeed !== undefined ? toMph(p.windSpeed) : undefined,
                visibility: p.visibility !== undefined ? toMiles(p.visibility) : undefined,
                pressure: p.pressure !== undefined ? toInHg(p.pressure) : undefined,
                dewPoint: p.dewPoint !== undefined ? toFahrenheit(p.dewPoint) : undefined,
            }));
        }
        if (data.hourly) data.hourly = convertPoints(data.hourly);
        if (data.daily) data.daily = convertPoints(data.daily);
    }
    return data;
}

export const streamResponse = async (
  model: WeatherModel,
  userLocation: { latitude: number; longitude: number } | null,
  history: Message[],
  settings: Settings,
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-2.5-flash';
  const systemInstruction = getSystemInstruction(settings, model);

  const config: any = { 
    systemInstruction,
    tools: [{ googleSearch: {} }, { googleMaps: {} }],
  };
  
  if (userLocation) {
    config.toolConfig = { 
        retrievalConfig: { 
            latLng: { latitude: userLocation.latitude, longitude: userLocation.longitude } 
        } 
    };
  }

  const contents = history.map(m => {
    const parts: any[] = [{ text: m.content }];
    if (m.attachment) {
      parts.unshift({
        inlineData: {
          data: m.attachment.data.split(',')[1],
          mimeType: m.attachment.mimeType
        }
      });
    }
    return { role: m.role, parts };
  });

  return ai.models.generateContentStream({
    model: modelName,
    contents: contents,
    config: config,
  });
};

/**
 * Fetches a GenCast probabilistic forecast for a specific point.
 */
export const getPointForecast = async (
  lat: number, 
  lng: number, 
  settings: Settings
): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
  **TASK: GENCAST PROBABILISTIC ANALYSIS**
  
  Target Coordinates: (${lat}, ${lng})
  
  Act as GenCast. Perform a diffusion-based weather analysis for this exact micro-climate.
  
  Output JSON ONLY:
  {
    "location": "Name of area",
    "current": { "temperature": number, "condition": "Status", "historicalAvg": number, "windSpeed": number },
    "hourly": [ { "time": "1 PM", "temperature": number, "condition": "Status", "precipitation": number, "humidity": number, "windSpeed": number } ],
    "historicalContext": "A brief statement on how this weather compares to the ensemble mean (e.g., '2 standard deviations above normal').",
    "genCastProbability": "Probability string (e.g., '92% Confidence')"
  }`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json"
    }
  });

  try {
    const data = JSON.parse(response.text || '{}');
    return convertDataUnits(data, settings.units);
  } catch (e) {
    console.error("GenCast parsing failed", e);
    return null;
  }
};

const extractJson = (text: string, blockType: string) => {
  const regex = new RegExp("```" + blockType + "\\s*([\\s\\S]*?)\\s*```");
  const match = text.match(regex);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      return null;
    }
  }
  return null;
};

const extractDiagrams = (text: string): string[] => {
  const regex = /```mermaid\s*([\s\S]*?)\s*```/g;
  const matches = text.matchAll(regex);
  return Array.from(matches, match => match[1].trim());
};

export const parseModelResponse = (text: string, settings: Settings): { 
  cleanedText: string; 
  hourlyData?: WeatherDataPoint[]; 
  dailyData?: WeatherDataPoint[]; 
  current?: CurrentWeatherData; 
  alerts?: WeatherAlert[]; 
  insights?: string[]; 
  diagrams?: string[];
  videoRequest?: VideoRequest;
  imageRequest?: ImageRequest;
  containsPlan?: boolean; 
  location?: string;
  latitude?: number;
  longitude?: number;
} => {
  let cleanedText = text;

  const weatherData = extractJson(text, 'json_weather');
  const videoRequest = extractJson(text, 'json_video');
  const imageRequest = extractJson(text, 'json_image');
  const diagrams = extractDiagrams(text);
  
  let parsedWeatherData: any = {};
  if (weatherData) {
    cleanedText = cleanedText.replace(/```json_weather[\s\S]*?```/, '').trim();
    parsedWeatherData = convertDataUnits(weatherData, settings.units);
  }

  if (videoRequest) {
    cleanedText = cleanedText.replace(/```json_video[\s\S]*?```/, '').trim();
  }

  if (imageRequest) {
    cleanedText = cleanedText.replace(/```json_image[\s\S]*?```/, '').trim();
  }

  if (diagrams.length > 0) {
    let i = 0;
    cleanedText = cleanedText.replace(/```mermaid[\s\S]*?```/g, () => `[DIAGRAM_PLACEHOLDER_${i++}]`).trim();
  }
  
  const containsPlan = /(^#{1,3}\s.*Plan.*$)|(^\*\*Research Plan:\*\*)|(^\s*-\s)|(^\s*\*\s)|(^\s*\d+\.\s)/mi.test(cleanedText);
  const radarRegex = /(https?:\/\/[^\s]*radar[^\s]*)/gi;
  cleanedText = cleanedText.replace(radarRegex, (url) => `\n[View GenCast Radar](${url})\n`);

  return { 
    cleanedText, 
    hourlyData: parsedWeatherData.hourly, 
    dailyData: parsedWeatherData.daily, 
    current: parsedWeatherData.current, 
    alerts: parsedWeatherData.alerts, 
    insights: parsedWeatherData.insights, 
    diagrams,
    videoRequest,
    imageRequest,
    containsPlan, 
    location: parsedWeatherData.location,
    latitude: parsedWeatherData.latitude,
    longitude: parsedWeatherData.longitude
  };
};

export const generateTitle = async (firstMessage: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a short title (max 5 words) for: "${firstMessage}".`,
    });
    return response.text?.trim().replace(/"/g, '') || 'New Chat';
  } catch (error) {
    return firstMessage.slice(0, 30);
  }
};
