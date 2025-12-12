
export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
  };
}

export interface GroundingMetadata {
  groundingChunks: GroundingChunk[];
}

export interface WeatherDataPoint {
  time: string;
  temperature?: number;
  feelsLike?: number;
  precipitation?: number;
  humidity?: number;
  windSpeed?: number;
  windDirection?: string;
  uvIndex?: number;
  aqi?: number;
  pollen?: number;
  visibility?: number;
  dewPoint?: number;
  pressure?: number;
  cloudCover?: number;
  precipitationType?: 'rain' | 'snow' | 'sleet' | 'none';
  historicalAvgTemp?: number;
  confidence?: number;
}

export interface CurrentWeatherData {
  temperature: number;
  feelsLike: number;
  condition: string;
  summary: string;
  sunrise: string;
  sunset: string;
  historicalAvg: number;
  pressure: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  uvIndex: number;
  visibility: number;
  aqi: number;
  pollen: number;
  dewPoint: number;
  cloudCover: number;
}

export interface WeatherAlert {
  severity: 'Warning' | 'Advisory' | 'Watch' | 'Statement';
  title: string;
  description: string;
}

export interface VideoRequest {
  prompt: string;
  aspectRatio: '16:9' | '9:16';
}

export interface VideoResult {
  status: 'generating' | 'done' | 'error';
  uri?: string;
  error?: string;
  progress?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  isStreaming?: boolean;
  timestamp: number;
  groundingMetadata?: GroundingMetadata;
  hourlyData?: WeatherDataPoint[];
  dailyData?: WeatherDataPoint[];
  current?: CurrentWeatherData;
  alerts?: WeatherAlert[];
  insights?: string[];
  diagrams?: string[];
  videoRequest?: VideoRequest;
  videoResult?: VideoResult;
  audioState?: 'idle' | 'loading' | 'playing';
  containsPlan?: boolean;
  location?: string;
}

export type WeatherModel = 'fast' | 'advanced';
export type VoiceName = 'Zephyr' | 'Puck' | 'Kore' | 'Charon' | 'Fenrir';
export type Units = 'metric' | 'imperial';
export type Theme = 'diamond' | 'sky';
export type ImageSize = '1K' | '2K' | '4K';

export interface Settings {
  defaultModel: WeatherModel;
  voice: VoiceName;
  units: Units;
  theme: Theme;
  backgroundType: 'default' | 'custom';
  backgroundPrompt: string;
  backgroundImage: string;
  imageSize: ImageSize;
  conversationalMode: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  model: WeatherModel;
  messages: Message[];
}
