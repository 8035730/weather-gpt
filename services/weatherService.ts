

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, WeatherDataPoint, WeatherAlert, WeatherModel, Settings, CurrentWeatherData, VideoRequest, Units } from "./types";

const getSystemInstruction = (settings: Settings, isAdvanced: boolean): string => {
  const persona = isAdvanced 
    ? `You are a hyper-intelligent Universal Assistant and creative polymath with access to the sum of public human knowledge via Google Search. You excel at deep reasoning, planning, and creative tasks, including acting as a video director and diagram creator.`
    : `You are a fast and factual Universal Assistant connected to the live web.`;

  return `
${persona}

**CORE MANDATE:**
1.  **Universal Creator**: Your primary function is to answer ANY question and fulfill ANY creative request from the user. You can handle requests about history, science, coding, creative writing, planning, and more.
2.  **Multi-Modal Specialist (Automated Function)**: You have several specialized tools. You MUST use the correct JSON block when the user's intent matches the tool. For all other queries, DO NOT generate these blocks.
    - If the query is about weather, climate, or location-based planning, respond with a \`\`\`json_weather\`\`\` block.
    - If the user asks to "create a video", "generate a video", or "animate this", respond with a \`\`\`json_video\`\`\` block.
    - If a visual explanation like a flowchart, timeline, or sequence diagram would be best, respond with a \`\`\`mermaid\`\`\` block.

**JSON Response formats (ONLY for specific intents):**
- **Weather/Location:**
  \`\`\`json_weather
  {
    "location": "City, State/Country",
    "current": { "temperature": number, "feelsLike": number, "condition": "Short description", "summary": "A concise summary.", "sunrise": "HH:MM AM/PM", "sunset": "HH:MM AM/PM", "historicalAvg": number, "pressure": number, "humidity": number, "windSpeed": number, "windDirection": "NW", "uvIndex": number, "visibility": number, "aqi": number, "pollen": number, "dewPoint": number, "cloudCover": number },
    "hourly": [ { "time": "1 PM", "temperature": number, "feelsLike": number, "precipitation": number, "precipitationType": "'rain'|'snow'|'sleet'|'none'", "humidity": number, "windSpeed": number, "uvIndex": number, "cloudCover": number, "visibility": number, "pressure": number, "dewPoint": number, "aqi": number, "pollen": number, "historicalAvgTemp": number, "confidence": number } ],
    "daily": [ { "time": "Day", "temperature": number, "feelsLike": number, "precipitation": number, "precipitationType": "'rain'|'snow'|'sleet'|'none'", "humidity": number, "windSpeed": number, "uvIndex": number, "cloudCover": number, "visibility": number, "pressure": number, "dewPoint": number, "aqi": number, "pollen": number, "historicalAvgTemp": number, "confidence": number } ],
    "alerts": [ { "severity": "'Warning'|'Advisory'|'Watch'|'Statement'", "title": "Title", "description": "Text" } ],
    "insights": [ "Tip 1", "Tip 2" ]
  }
  \`\`\`
- **Video Generation:**
  \`\`\`json_video
  {
    "prompt": "A detailed, descriptive prompt for the Veo video model. For example: 'A majestic cinematic shot of a futuristic city with flying cars at sunset, high detail, 8k'.",
    "aspectRatio": "'16:9' or '9:16'"
  }
  \`\`\`
- **Diagram Generation:**
  \`\`\`mermaid
  graph TD;
      A[Start] --> B{Is it sunny?};
      B -- Yes --> C[Go to the park];
      B -- No --> D[Stay inside];
  \`\`\`

**General Rules:**
- For the text part of your response (outside the JSON), use Markdown.
- Use Google Search and Maps to fetch real-time data for all relevant queries.
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
  const ai = new GoogleGenAI({ apiKey: (window as any).GEMINI_API_KEY });
  const modelName = model === 'advanced' ? 'gemini-3-pro-preview' : 'gemini-2.5-flash';
  const isAdvanced = model === 'advanced';
  const systemInstruction = getSystemInstruction(settings, isAdvanced);

  const config: any = { systemInstruction };
  
  if (isAdvanced) {
    config.thinkingConfig = { thinkingBudget: 32768 };
  }
  
  config.tools = [{ googleSearch: {} }, { googleMaps: {} }];
  if (userLocation) {
    config.toolConfig = { retrievalConfig: { latLng: userLocation } };
  }

  const contents = history.map(m => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));

  return ai.models.generateContentStream({
    model: modelName,
    contents: contents,
    config: config,
  });
};

const extractJson = (text: string, blockType: string) => {
  const regex = new RegExp("```" + blockType + "\\s*([\\s\\S]*?)\\s*```");
  const match = text.match(regex);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      console.warn(`Failed to parse ${blockType} JSON block`, e);
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
  containsPlan?: boolean; 
  location?: string;
} => {
  let cleanedText = text;

  const weatherData = extractJson(text, 'json_weather');
  const videoRequest = extractJson(text, 'json_video');
  const diagrams = extractDiagrams(text);
  
  let parsedWeatherData: any = {};
  if (weatherData) {
    cleanedText = cleanedText.replace(/```json_weather[\s\S]*?```/, '').trim();
    parsedWeatherData = convertDataUnits(weatherData, settings.units);
  }

  if (videoRequest) {
    cleanedText = cleanedText.replace(/```json_video[\s\S]*?```/, '').trim();
  }

  if (diagrams.length > 0) {
    let i = 0;
    cleanedText = cleanedText.replace(/```mermaid[\s\S]*?```/g, () => `[DIAGRAM_PLACEHOLDER_${i++}]`).trim();
  }
  
  const containsPlan = /(^#{1,3}\s.*$)|(^\s*-\s)|(^\s*\*\s)|(^\s*\d+\.\s)/m.test(cleanedText);

  const radarRegex = /(https?:\/\/[^\s]*radar[^\s]*)/gi;
  cleanedText = cleanedText.replace(radarRegex, (url) => `\n[View Local Weather Radar](${url})\n`);

  return { 
    cleanedText, 
    hourlyData: parsedWeatherData.hourly, 
    dailyData: parsedWeatherData.daily, 
    current: parsedWeatherData.current, 
    alerts: parsedWeatherData.alerts, 
    insights: parsedWeatherData.insights, 
    diagrams,
    videoRequest,
    containsPlan, 
    location: parsedWeatherData.location 
  };
};

export const generateTitle = async (firstMessage: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: (window as any).GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a very short, concise title (max 5 words, no quotes) for a chat that starts with this user query: "${firstMessage}"`,
    });
    return response.text?.trim().replace(/"/g, '') || 'New Chat';
  } catch (error) {
    return firstMessage.slice(0, 30);
  }
};
