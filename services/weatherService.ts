
import { GoogleGenAI, GenerateContentResponse, Type, Modality } from "@google/genai";
import { Message, WeatherDataPoint, WeatherAlert, WeatherModel, Settings, CurrentWeatherData, VideoRequest, ImageRequest, Units } from "../types";

// Define the Virtual MCP Context to structure the Agent's reasoning capabilities
const getMCPContext = () => `
**SYSTEM ARCHITECTURE: AGENTIC MCP NODE**

You are **WeatherGPT**, an autonomous research agent operating on a virtual Model Context Protocol (MCP) bus. You do not just "answer" questions; you Orchestrate, Research, and Synthesize using connected MCP Servers.

**CONNECTED MCP SERVERS:**
1.  **[server: google_search]**:
    *   *Capability*: Real-time web indexing, news aggregation, fact verification.
    *   *Trigger*: Any query requiring up-to-date information, checking events, or verifying locations.
    *   *Agentic Strategy*: For complex queries, perform multiple distinct searches to triangulate the truth.

2.  **[server: google_maps]**:
    *   *Capability*: Spatial reasoning, geocoding, business lookups, routing.
    *   *Trigger*: "Where is...", "Distance to...", "Near me...", specific city names.

3.  **[server: frontend_renderer]**:
    *   *Capability*: Renders specialized UI widgets on the client.
    *   *Tools*:
        *   \`json_weather\`: For displaying meteorological data.
        *   \`json_video\`: For requesting the Veo video generation engine.
        *   \`json_image\`: For requesting Imagen 3 generation.
        *   \`mermaid\`: For rendering logic flows or timelines.

**AGENTIC SEARCH PROTOCOL:**
When you receive a user prompt, you must follow this internal loop:
1.  **Intent Classification**: Which MCP servers are required?
2.  **Research Plan**: If the query is complex (e.g., "Weather in Tokyo vs NYC"), break it down.
3.  **Tool Execution**: Use \`googleSearch\` or \`googleMaps\` tools provided by the API.
4.  **Synthesis**: Combine raw data into a coherent strategic answer.
5.  **Widget Selection**: Select the appropriate JSON format for the [frontend_renderer].
`;

const getSystemInstruction = (settings: Settings, model: WeatherModel): string => {
  let persona = '';
  
  if (model === 'advanced') {
    persona = `**Identity**: You are the **WeatherGPT Pro Agent**. You utilize multi-step reasoning. You are strategic, concise, and highly intelligent. You prefer density of information over fluff.`;
  } else {
    persona = `**Identity**: You are **WeatherGPT Flash**. You are a fast, efficient agent focused on quick data retrieval and immediate helpfulness.`;
  }

  return `
${getMCPContext()}

${persona}

**CORE RENDERING RULES (CRITICAL):**
You MUST use the following JSON formats to communicate with the [frontend_renderer]. Do not invent new schemas.

- **Weather/Location Intent**:
  If the user asks about weather, location, or travel planning, you MUST output a \`\`\`json_weather\`\`\` block.
  **CRITICAL:** You MUST include "latitude" and "longitude" in this block. Use [google_maps] logic to find these coordinates if not provided.
  
  Format:
  \`\`\`json_weather
  {
    "location": "City, State/Country",
    "latitude": number,
    "longitude": number,
    "current": { "temperature": number, "feelsLike": number, "condition": "Short description", "summary": "A concise summary.", "sunrise": "HH:MM AM/PM", "sunset": "HH:MM AM/PM", "historicalAvg": number, "pressure": number, "humidity": number, "windSpeed": number, "windDirection": "NW", "uvIndex": number, "visibility": number, "aqi": number, "pollen": number, "dewPoint": number, "cloudCover": number },
    "hourly": [ { "time": "1 PM", "temperature": number, "feelsLike": number, "precipitation": number, "precipitationType": "'rain'|'snow'|'sleet'|'none'", "humidity": number, "windSpeed": number, "uvIndex": number, "cloudCover": number, "visibility": number, "pressure": number, "dewPoint": number, "aqi": number, "pollen": number, "historicalAvgTemp": number, "confidence": number } ],
    "daily": [ { "time": "Day", "temperature": number, "feelsLike": number, "precipitation": number, "precipitationType": "'rain'|'snow'|'sleet'|'none'", "humidity": number, "windSpeed": number, "uvIndex": number, "cloudCover": number, "visibility": number, "pressure": number, "dewPoint": number, "aqi": number, "pollen": number, "historicalAvgTemp": number, "confidence": number } ],
    "alerts": [ { "severity": "'Warning'|'Advisory'|'Watch'|'Statement'", "title": "Title", "description": "Text" } ],
    "insights": [ "Strategic Insight 1", "Strategic Insight 2" ]
  }
  \`\`\`

- **Visual Creation Intent**:
  If the user asks to "generate", "create", "draw", or "render" media:
  
  For Images:
  \`\`\`json_image
  {
    "prompt": "A detailed, artistic prompt describing the scene.",
    "aspectRatio": "'1:1'|'3:4'|'4:3'|'9:16'|'16:9'"
  }
  \`\`\`

  For Videos (Veo):
  \`\`\`json_video
  {
    "prompt": "A cinematic prompt for the video model.",
    "aspectRatio": "'16:9' or '9:16'"
  }
  \`\`\`

- **Logic/Diagram Intent**:
  For explanations requiring structure (timelines, process flows):
  \`\`\`mermaid
  graph TD;
      A[Start] --> B[Step];
  \`\`\`
  *Constraint:* No HTML tags in Mermaid labels.

**RESPONSE GUIDELINES:**
1.  **Markdown**: Use Markdown for all text outside JSON blocks.
2.  **Citations**: When using [google_search], the system will automatically append citations. You do not need to manually format links, but refer to sources in your text.
3.  **Proactivity**: If the weather is bad, suggest indoor activities. If good, suggest outdoor spots (using [google_maps] knowledge).
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
  
  // Model Selection Logic
  let modelName = 'gemini-2.5-flash';
  let isAdvanced = false;

  if (model === 'advanced') {
    modelName = 'gemini-3-pro-preview';
    isAdvanced = true;
  }

  const systemInstruction = getSystemInstruction(settings, model);

  const config: any = { 
    systemInstruction,
    // Enable search for Agentic research capabilities
    tools: [{ googleSearch: {} }],
  };
  
  if (isAdvanced) {
    config.thinkingConfig = { thinkingBudget: 32768 };
  }
  
  // Add Maps tool for spatial reasoning if supported by the model (2.5 series or future supported models)
  if (modelName.startsWith('gemini-2.5')) {
     if (!config.tools) config.tools = [];
     config.tools.push({ googleMaps: {} });

     if (userLocation) {
        config.toolConfig = { 
            retrievalConfig: { 
                latLng: { 
                    latitude: userLocation.latitude, 
                    longitude: userLocation.longitude 
                } 
            } 
        };
     }
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
 * Fetches a detailed forecast and historical analysis using the Agentic Loop.
 */
export const getPointForecast = async (
  lat: number, 
  lng: number, 
  settings: Settings
): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Agentic prompt requiring multi-source synthesis
  const prompt = `
  **AGENTIC TASK: MICRO-CLIMATE ANALYSIS**
  
  Target Coordinates: (${lat}, ${lng})
  
  1. **Research**: Analyze current weather stations near this point.
  2. **Context**: Compare with historical climate data for this specific day.
  3. **Synthesize**: Generate a JSON forecast object.
  
  Return ONLY the JSON format:
  {
    "location": "Specific Area Name",
    "current": { "temperature": number, "condition": "Brief status", "historicalAvg": number },
    "hourly": [ { "time": "1 PM", "temperature": number, "condition": "Status" } ],
    "historicalContext": "One sentence comparing today to historical averages."
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
    console.error("Failed to parse point forecast", e);
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
  
  // Enhanced detection for Agentic Plans
  const containsPlan = /(^#{1,3}\s.*Plan.*$)|(^\*\*Research Plan:\*\*)|(^\s*-\s)|(^\s*\*\s)|(^\s*\d+\.\s)/mi.test(cleanedText);

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
      contents: `Generate a very short, concise title (max 5 words, no quotes) for a chat that starts with this user query: "${firstMessage}"`,
    });
    return response.text?.trim().replace(/"/g, '') || 'New Chat';
  } catch (error) {
    return firstMessage.slice(0, 30);
  }
};
