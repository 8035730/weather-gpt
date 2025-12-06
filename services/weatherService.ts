
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, WeatherDataPoint, WeatherAlert, WeatherModel, Settings, CurrentWeatherData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getSystemInstruction = (settings: Settings, isAdvanced: boolean): string => {
  const tempUnit = settings.units === 'metric' ? 'Celsius' : 'Fahrenheit';
  const speedUnit = settings.units === 'metric' ? 'km/h' : 'mph';
  const distanceUnit = settings.units === 'metric' ? 'kilometers' : 'miles';
  const pressureUnit = settings.units === 'metric' ? 'hPa' : 'inHg';

  const persona = isAdvanced 
    ? `You are WeatherGPT, a hyper-intelligent Universal Assistant with access to the sum of public human knowledge via Google Search. You are a meteorological strategist and a general polymath.`
    : `You are WeatherGPT, a fast and factual Universal Assistant connected to the live web.`;

  return `
${persona}

**CORE MANDATE:**
1.  **Universal Access**: You have access to all public data on the web through Google Search. You **MUST** use this tool to answer ANY question the user asks (current events, history, science, pop culture, coding, etc.) with real-time accuracy. Do not rely solely on your internal training data if the web offers newer info.
2.  **Weather Specialist**: If the query is related to weather, climate, or location planning, you **MUST** generate the structured JSON block below to power the app's dashboard.

**Weather-Specific Rules:**
- **Visuals First**: For weather queries, always provide the \`\`\`json_weather\`\`\` block.
- **Units**: Strict adherence to user units: Temperature in ${tempUnit}, Wind Speed in ${speedUnit}, Visibility in ${distanceUnit}, Pressure in ${pressureUnit}.
- **Historical Context**: Compare the forecast to historical averages (e.g., "5° cooler than average").
- **Proactivity**: Identify specific risks (UV, Pollen, Severe Weather) and generate actionable "Insights".

**Data Sourcing:**
- **General Queries**: Use Google Search to find the most recent and authoritative public data.
- **Weather Queries**: Use Google Search and Maps to fetch real-time data, forecasts, and location specifics. Cross-reference multiple sources (NWS, AccuWeather, etc.) for consensus.

**JSON Response format (Required for Weather/Location queries):**
You must wrap your JSON response in \`\`\`json_weather\`\`\`.
{
  "location": "City, State/Country",
  "current": {
    "temperature": number,
    "feelsLike": number,
    "condition": "Short description (e.g., Mostly Cloudy)",
    "summary": "A concise, natural language summary of right now.",
    "sunrise": "HH:MM AM/PM",
    "sunset": "HH:MM AM/PM",
    "historicalAvg": number,
    "pressure": number,
    "humidity": number,
    "windSpeed": number,
    "windDirection": "Direction (e.g. NW)",
    "uvIndex": number,
    "visibility": number,
    "aqi": number,
    "pollen": number, // 0-10 scale
    "dewPoint": number,
    "cloudCover": number // 0-100%
  },
  "hourly": [
    {
      "time": "Hour (e.g. 1 PM)",
      "temperature": number,
      "feelsLike": number,
      "precipitation": number, // % chance
      "precipitationType": "'rain'|'snow'|'sleet'|'none'",
      "humidity": number,
      "windSpeed": number,
      "uvIndex": number,
      "cloudCover": number,
      "visibility": number,
      "pressure": number,
      "dewPoint": number,
      "aqi": number,
      "pollen": number,
      "historicalAvgTemp": number,
      "confidence": number // 0-100
    }
    // ... next 24 hours
  ],
  "daily": [
     // ... next 7 days (same structure as hourly, but daily averages/highs)
  ],
  "alerts": [
    {
      "severity": "'Warning'|'Advisory'|'Watch'|'Statement'",
      "title": "Short Title",
      "description": "Full text"
    }
  ],
  "insights": [
    "Short, actionable tip 1 (e.g. 'UV is extreme, wear sunscreen')",
    "Short, actionable tip 2"
  ]
}
\`\`\`

**Formatting:**
- For the text part of your response (outside the JSON), use Markdown.
- If proposing a schedule/plan, use bullet points or numbered lists.
`;
};

export const streamResponse = async (
  model: WeatherModel,
  userLocation: { latitude: number; longitude: number } | null,
  history: Message[],
  settings: Settings,
) => {
  // Use gemini-2.5-flash for 'fast' mode because gemini-flash-lite-latest does not support Google Maps tool
  const modelName = model === 'advanced' ? 'gemini-3-pro-preview' : 'gemini-2.5-flash';
  const isAdvanced = model === 'advanced';
  const systemInstruction = getSystemInstruction(settings, isAdvanced);

  const config: any = { systemInstruction };
  
  if (isAdvanced) {
    config.thinkingConfig = { thinkingBudget: 32768 };
    config.tools = [{ googleSearch: {} }, { googleMaps: {} }];
  } else {
    config.tools = [{ googleSearch: {} }, { googleMaps: {} }];
    if (userLocation) {
      config.toolConfig = { retrievalConfig: { latLng: userLocation } };
    }
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

export const parseModelResponse = (text: string): { 
  cleanedText: string; 
  hourlyData?: WeatherDataPoint[]; 
  dailyData?: WeatherDataPoint[]; 
  current?: CurrentWeatherData; 
  alerts?: WeatherAlert[]; 
  insights?: string[]; 
  containsPlan?: boolean; 
  location?: string;
} => {
  const jsonBlockRegex = /```json_weather\s*([\s\S]*?)\s*```/;
  let cleanedText = text;
  let hourlyData: WeatherDataPoint[] | undefined;
  let dailyData: WeatherDataPoint[] | undefined;
  let current: CurrentWeatherData | undefined;
  let alerts: WeatherAlert[] | undefined;
  let insights: string[] | undefined;
  let location: string | undefined;

  const match = cleanedText.match(jsonBlockRegex);
  if (match && match[1]) {
    try {
      const parsed = JSON.parse(match[1]);
      cleanedText = cleanedText.replace(jsonBlockRegex, '').trim();
      
      if (parsed.current) current = parsed.current;
      if (Array.isArray(parsed.hourly)) hourlyData = parsed.hourly;
      if (Array.isArray(parsed.daily)) dailyData = parsed.daily;
      if (Array.isArray(parsed.alerts)) alerts = parsed.alerts;
      if (Array.isArray(parsed.insights)) insights = parsed.insights;
      if (typeof parsed.location === 'string') location = parsed.location;

    } catch (e) {
      console.warn("Failed to parse master JSON block", e);
    }
  }
  
  // Look for markdown lists or headers, which indicate a plan
  const containsPlan = /(^#{1,3}\s.*$)|(^\s*-\s)|(^\s*\*\s)|(^\s*\d+\.\s)/m.test(cleanedText);

  // Proactively find and format radar links
  const radarRegex = /(https?:\/\/[^\s]*radar[^\s]*)/gi;
  cleanedText = cleanedText.replace(radarRegex, (url) => `\n[View Local Weather Radar](${url})\n`);

  return { cleanedText, hourlyData, dailyData, current, alerts, insights, containsPlan, location };
};

export const generateTitle = async (firstMessage: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a very short, concise title (max 5 words, no quotes) for a chat that starts with this user query: "${firstMessage}"`,
    });
    return response.text?.trim().replace(/"/g, '') || 'New Chat';
  } catch (error) {
    return firstMessage.slice(0, 30);
  }
};
