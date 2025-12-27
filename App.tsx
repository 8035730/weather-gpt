
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Sidebar from './components/Sidebar';
import MessageItem from './components/MessageItem';
import SettingsModal from './components/SettingsModal';
import LocationSuggestions from './components/LocationSuggestions';
import MapView from './components/MapView';
import { ChatSession, Message, Settings, WeatherAlert, VideoResult, ImageResult } from './types';
import { streamResponse, parseModelResponse, generateTitle } from './services/weatherService';
import { generateSpeech, playAudio } from './services/ttsService';
import { generateBackgroundImage, generateImage } from './services/imageService';
import { generateVideo } from './services/videoService';
import { getBackgroundClass } from './utils/weatherBackgrounds';
import { GenerateContentResponse } from '@google/genai';

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;
if (recognition) {
  recognition.continuous = true;
  recognition.interimResults = true;
}

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [mapCoordinates, setMapCoordinates] = useState<{ lat: number, lng: number } | null>(null);
  const [mapLocationName, setMapLocationName] = useState<string>('');
  const [attachment, setAttachment] = useState<{ data: string; mimeType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [settings, setSettings] = useState<Settings>({
    defaultModel: 'fast',
    voice: 'Zephyr',
    units: 'metric',
    theme: 'diamond',
    backgroundType: 'default',
    backgroundPrompt: '',
    backgroundImage: '',
    imageSize: '1K',
    conversationalMode: false,
    openWeatherApiKey: '',
    tomorrowIoApiKey: ''
  });

  const [isListening, setIsListening] = useState(false);
  const [autoPlayNext, setAutoPlayNext] = useState(false);
  const audioCache = useRef<Map<string, AudioBuffer>>(new Map());
  const activeAudioSource = useRef<AudioBufferSourceNode | null>(null);

  const [locationHistory, setLocationHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [imageGenerationError, setImageGenerationError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isConversationalModeRef = useRef(settings.conversationalMode);
  const isProcessingVoiceRef = useRef(false);

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];
  
  const lastWeatherMessage = [...messages].reverse().find(m => m.current);
  const backgroundClass = getBackgroundClass(lastWeatherMessage?.current?.condition);

  // Update map coordinates when new weather data arrives
  useEffect(() => {
    if (lastWeatherMessage?.latitude && lastWeatherMessage?.longitude) {
      setMapCoordinates({ lat: lastWeatherMessage.latitude, lng: lastWeatherMessage.longitude });
      setMapLocationName(lastWeatherMessage.location || '');
    } else if (userLocation && !mapCoordinates) {
        setMapCoordinates({ lat: userLocation.latitude, lng: userLocation.longitude });
        setMapLocationName('Current Location');
    }
  }, [lastWeatherMessage, userLocation]);

  useEffect(() => {
    isConversationalModeRef.current = settings.conversationalMode;
    if (!settings.conversationalMode && isListening) {
      recognition?.stop();
      setIsListening(false);
    }
  }, [settings.conversationalMode, isListening]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, messages[messages.length - 1]?.content]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setUserLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        (error) => console.warn("Geolocation permission denied or failed.", error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, []);

  useEffect(() => {
    try {
      const savedSessions = localStorage.getItem('weather-gpt-sessions');
      const savedSessionId = localStorage.getItem('weather-gpt-current-session-id');
      const savedSettings = localStorage.getItem('weather-gpt-settings');
      const savedHistory = localStorage.getItem('weather-gpt-location-history');

      if (savedSettings) setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
      if (savedHistory) setLocationHistory(JSON.parse(savedHistory));
      
      const parsedSessions = savedSessions ? JSON.parse(savedSessions) : [];
      if (parsedSessions.length > 0) {
        setSessions(parsedSessions);
        setCurrentSessionId(savedSessionId || parsedSessions[0].id);
      }
    } catch (error) { console.error("Failed to load from localStorage", error); }
  }, []);

  useEffect(() => {
    if (sessions.length > 0) localStorage.setItem('weather-gpt-sessions', JSON.stringify(sessions));
    if (currentSessionId) localStorage.setItem('weather-gpt-current-session-id', currentSessionId);
    localStorage.setItem('weather-gpt-settings', JSON.stringify(settings));
    localStorage.setItem('weather-gpt-location-history', JSON.stringify(locationHistory));
    
    document.documentElement.className = `theme-${settings.theme}`;
  }, [sessions, currentSessionId, settings, locationHistory]);

  const updateMessages = useCallback((sessionId: string, messageUpdater: (messages: Message[]) => Message[]) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages: messageUpdater(s.messages) } : s));
  }, []);

  useEffect(() => {
    if (activeAudioSource.current) {
      activeAudioSource.current.stop();
      activeAudioSource.current = null;
    }
    updateMessages(currentSessionId || '', msgs => msgs.map(m => ({ ...m, audioState: 'idle' })));
    setDismissedAlerts([]);
    setIsListening(false);
    recognition?.stop();
  }, [currentSessionId, updateMessages]);

  useEffect(() => {
    if (!recognition) return;
    
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
      }
      if (finalTranscript) setInput(prev => (prev + ' ' + finalTranscript).trim());
    };

    recognition.onend = () => {
      const form = document.getElementById('chat-form') as HTMLFormElement | null;
      if (isConversationalModeRef.current && isListening && !isProcessingVoiceRef.current) {
        if (form) form.requestSubmit();
      } else if (isListening && !isConversationalModeRef.current) {
        setIsListening(false);
        if (form) form.requestSubmit();
      }
    };
    
    recognition.onerror = (event: any) => {
        console.warn("Speech recognition error", event.error);
        setIsListening(false);
    }
  }, [isListening]);

  const handleNewChat = useCallback(() => {
    const newSessionId = uuidv4();
    const newSession: ChatSession = { id: newSessionId, title: 'New Chat', createdAt: Date.now(), model: settings.defaultModel, messages: [] };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSessionId);
  }, [settings.defaultModel]);

  const handlePlayAudio = useCallback(async (messageId: string, text: string, restartListeningAfter = false) => {
    if (!currentSessionId) return;
    
    recognition?.stop(); 

    if (activeAudioSource.current) activeAudioSource.current.stop();
    updateMessages(currentSessionId, msgs => msgs.map(m => ({ ...m, audioState: 'idle' })));
    updateMessages(currentSessionId, msgs => msgs.map(m => m.id === messageId ? { ...m, audioState: 'loading' } : m));

    try {
      const audioBuffer = audioCache.current.get(messageId) || await generateSpeech(text, settings.voice);
      if (!audioBuffer) throw new Error("Audio generation failed");
      audioCache.current.set(messageId, audioBuffer);
      updateMessages(currentSessionId, msgs => msgs.map(m => m.id === messageId ? { ...m, audioState: 'playing' } : m));
      
      activeAudioSource.current = playAudio(audioBuffer, () => {
        updateMessages(currentSessionId, msgs => msgs.map(m => m.id === messageId ? { ...m, audioState: 'idle' } : m));
        activeAudioSource.current = null;
        
        if (restartListeningAfter && isConversationalModeRef.current) {
             setInput('');
             try { recognition?.start(); } catch(e) {}
        }
      });
    } catch (error) {
      console.error("Failed to play audio:", error);
      updateMessages(currentSessionId, msgs => msgs.map(m => m.id === messageId ? { ...m, audioState: 'idle' } : m));
      
      if (restartListeningAfter && isConversationalModeRef.current) {
         try { recognition?.start(); } catch(e) {}
      }
    }
  }, [currentSessionId, settings.voice, updateMessages]);
  
  const handleGenerateVideo = useCallback(async (messageId: string, prompt: string, aspectRatio: '16:9' | '9:16') => {
    if (!currentSessionId) return;
    
    const onUpdate = (update: VideoResult) => {
      updateMessages(currentSessionId, msgs => msgs.map(m => m.id === messageId ? { ...m, videoResult: { ...m.videoResult, ...update } } : m));
    };

    try {
      const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
      if (!hasKey) {
        await (window as any).aistudio?.openSelectKey();
      }
      await generateVideo(prompt, aspectRatio, onUpdate);
    } catch (error: any) {
      console.error("Video generation failed:", error);
      onUpdate({ status: 'error', error: error.message || "An unknown error occurred." });
    }
  }, [currentSessionId, updateMessages]);

  const handleGenerateImage = useCallback(async (messageId: string, request: any, attachment?: any) => {
    if (!currentSessionId) return;
    
    const onUpdate = (update: Partial<ImageResult>) => {
      updateMessages(currentSessionId, msgs => msgs.map(m => m.id === messageId ? { ...m, imageResult: { ...m.imageResult as ImageResult, ...update } } : m));
    };

    onUpdate({ status: 'generating' });

    try {
      const imageUrl = await generateImage(request, attachment);
      if (imageUrl) {
        onUpdate({ status: 'done', url: imageUrl });
      } else {
        onUpdate({ status: 'error', error: "Model returned empty content." });
      }
    } catch (error: any) {
      console.error("Image generation failed:", error);
      onUpdate({ status: 'error', error: error.message || "An unknown error occurred." });
    }
  }, [currentSessionId, updateMessages]);
  
  const handleSendMessage = useCallback(async (messageContent: string) => {
    if (!messageContent.trim() && !attachment || isLoading) {
      if (isConversationalModeRef.current && isListening) {
        try { recognition.start(); } catch(e) {}
      }
      return;
    }
    
    let sessId = currentSessionId;
    let sess = currentSession;

    if (!sessId || !sess) {
      const newId = uuidv4();
      const newSess: ChatSession = { id: newId, title: "New Chat", createdAt: Date.now(), model: settings.defaultModel, messages: [] };
      setSessions(prev => [newSess, ...prev]);
      setCurrentSessionId(newId);
      sessId = newId;
      sess = newSess;
    }

    if (isListening) recognition?.stop(); 
    if (!settings.conversationalMode) setIsListening(false);

    const userMessage: Message = { 
      id: uuidv4(), 
      role: 'user', 
      content: messageContent, 
      timestamp: Date.now(),
      attachment: attachment || undefined
    };

    const currentAttachment = attachment; // Capture current for async block

    const aiMessageId = uuidv4();
    const aiMessagePlaceholder: Message = { id: aiMessageId, role: 'model', content: '', isStreaming: true, timestamp: Date.now(), audioState: 'idle' };

    updateMessages(sessId, msgs => [...msgs, userMessage, aiMessagePlaceholder]);
    setInput('');
    setAttachment(null);
    setIsLoading(true);

    if (sess.messages.length === 0) {
      generateTitle(userMessage.content).then(title => setSessions(prev => prev.map(s => s.id === sessId ? { ...s, title } : s)));
    }

    try {
      const history = [...sess.messages, userMessage];
      const result = await streamResponse(sess.model, userLocation, history, settings);
      
      let fullText = '';
      let groundingChunks: any[] = [];
      for await (const chunk of result) {
        fullText += (chunk as GenerateContentResponse).text || '';
        if ((chunk as GenerateContentResponse).candidates?.[0]?.groundingMetadata?.groundingChunks) {
          groundingChunks.push(...(chunk as GenerateContentResponse).candidates[0].groundingMetadata.groundingChunks);
        }
        updateMessages(sessId, msgs => msgs.map(m => m.id === aiMessageId ? { ...m, content: fullText } : m));
      }

      const parsed = parseModelResponse(fullText, settings);
      const finalMessage: Message = { 
        ...aiMessagePlaceholder,
        ...parsed,
        content: parsed.cleanedText,
        isStreaming: false,
        groundingMetadata: { groundingChunks },
      };
      
      updateMessages(sessId, msgs => msgs.map(m => m.id === aiMessageId ? finalMessage : m));
      
      if (parsed.location) {
        if (!locationHistory.includes(parsed.location)) {
            setLocationHistory(prev => [parsed.location!, ...prev].slice(0, 15));
        }
      }
      
      if (parsed.imageRequest) {
        handleGenerateImage(aiMessageId, parsed.imageRequest, currentAttachment);
      }

      if (parsed.videoRequest) {
        handleGenerateVideo(aiMessageId, parsed.videoRequest.prompt, parsed.videoRequest.aspectRatio);
      }

      if ((autoPlayNext || settings.conversationalMode) && parsed.cleanedText) {
          handlePlayAudio(aiMessageId, parsed.cleanedText, settings.conversationalMode); 
          setAutoPlayNext(false);
      } else if (settings.conversationalMode) {
          try { recognition?.start(); } catch(e) {}
      }

    } catch (error: any) {
      console.error("Chat error:", error);
      const errorMessage = `Sorry, I encountered an error. Details: ${error.message || JSON.stringify(error)}`;
      updateMessages(sessId, msgs => msgs.map(m => m.id === aiMessageId ? { ...m, content: errorMessage, isStreaming: false } : m));
      if (settings.conversationalMode) {
          try { recognition?.start(); } catch(e) {}
      }
    } finally { setIsLoading(false); }
  }, [currentSessionId, currentSession, isLoading, isListening, settings, userLocation, locationHistory, autoPlayNext, updateMessages, handlePlayAudio, handleGenerateVideo, handleGenerateImage, attachment]);

  const toggleListening = () => {
    if (isListening) {
      recognition?.stop();
      setIsListening(false);
    } else {
      setInput('');
      try { recognition?.start(); } catch(e) { console.error(e); }
      setAutoPlayNext(true);
      setIsListening(true);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachment({
          data: reader.result as string,
          mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleGenerateBackground = useCallback(async () => {
    if (!settings.backgroundPrompt) return;
    setImageGenerationError(null);
    setIsLoading(true);

    try {
      const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
      if (!hasKey) {
        await (window as any).aistudio?.openSelectKey();
      }

      const imageData = await generateBackgroundImage(settings.backgroundPrompt, settings.imageSize);
      if (imageData) {
        setSettings(s => ({ ...s, backgroundType: 'custom', backgroundImage: imageData }));
      } else {
        setImageGenerationError("Generation was successful, but no image was returned. This may be due to a content safety policy.");
      }
    } catch (error: any) {
      console.error("Background generation failed:", error);
      let message = "An unknown error occurred.";
      if (error?.message?.includes("PERMISSION_DENIED")) {
        message = "Permission Denied. This feature requires a paid API key from a Google Cloud project with billing enabled.";
      } else if (error?.message) {
        message = `API Error: ${error.message}`;
      }
      setImageGenerationError(message);
    } finally {
      setIsLoading(false);
    }
  }, [settings.backgroundPrompt, settings.imageSize]);

  const handleDismissAlert = useCallback((alertTitle: string) => {
    setDismissedAlerts(prev => [...prev, alertTitle]);
  }, []);

  const handleDismissAllAlerts = useCallback((alertsToDismiss: WeatherAlert[]) => {
    setDismissedAlerts(prev => [...prev, ...alertsToDismiss.map(a => a.title)]);
  }, []);
  
  const chatInputForm = (
     <form id="chat-form" onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }} className={`relative flex flex-col w-full p-2 pr-3 rounded-xl border border-[color:var(--border-color)] shadow-md focus-within:ring-2 ring-blue-500/50 ${settings.theme === 'sky' ? 'cloud-input' : 'bg-[color:var(--bg-input)] backdrop-blur-md'}`}>
        {attachment && (
          <div className="flex px-2 pt-2 mb-2">
            <div className="relative group rounded-lg overflow-hidden border border-white/20 h-16 w-16 shadow-lg bg-black/20">
              <img src={attachment.data} alt="Attachment preview" className="h-full w-full object-cover" />
              <button 
                type="button" 
                onClick={() => setAttachment(null)}
                className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        )}
        <div className="flex items-center w-full">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 mr-1 rounded-full text-[color:var(--text-secondary)] hover:bg-white/10 hover:text-[color:var(--text-primary)] transition-colors" title="Attach Image">
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </button>
          <button type="button" onClick={() => setIsSettingsOpen(true)} className={`p-2 mr-1 rounded-full text-[color:var(--text-secondary)] hover:bg-white/10 hover:text-[color:var(--text-primary)] transition-colors`} title="Settings">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.581-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button type="button" onClick={() => setIsMapOpen(true)} className={`p-2 mr-1 rounded-full text-[color:var(--text-secondary)] hover:bg-white/10 hover:text-[color:var(--text-primary)] transition-colors`} title="Open Weather Map">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
          </button>
          <button type="button" onClick={toggleListening} className={`p-2 mr-2 rounded-full transition-colors ${isListening ? 'bg-red-500/50 text-red-300 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-white/5'}`} disabled={!recognition} title={isListening ? "Stop listening" : "Start voice mode"}>
            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" className="h-5 w-5"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"></path></svg>
          </button>
          <textarea 
            id="chat-input"
            rows={1} 
            className="flex-1 max-h-[100px] py-2 bg-transparent placeholder-[color:var(--text-secondary)] focus:outline-none resize-none z-10" 
            placeholder={isListening ? (settings.conversationalMode ? "Conversational Mode Active..." : "Listening...") : (attachment ? "Describe how to edit this image..." : "Ask me anything about weather...")} 
            value={input} 
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(input); } }}
            onChange={(e) => {
              setInput(e.target.value);
              if (e.target.value) {
                const filtered = locationHistory.filter(loc => loc.toLowerCase().startsWith(e.target.value.toLowerCase()));
                setSuggestions(filtered);
              } else {
                setSuggestions([]);
              }
            }} 
            disabled={isLoading} 
          />
          <button type="submit" disabled={(!input.trim() && !attachment) || isLoading} className={`p-2 rounded-md transition-colors z-10 ${ (input.trim() || attachment) && !isLoading ? 'bg-gemini-gradient text-white' : 'bg-transparent text-[color:var(--text-secondary)] cursor-not-allowed'}`}>
            {isLoading ? (<div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-white" />) : (<svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>)}
          </button>
        </div>
      </form>
  );

  return (
    <>
      <div 
        className={`fixed inset-0 z-[-2] transition-all duration-1000 ${settings.backgroundType === 'default' && settings.theme === 'diamond' ? 'diamond-background' : ''}`}
      />
      <div
        className={`fixed inset-0 z-[-1] transition-all duration-1000 ${settings.backgroundType === 'default' ? backgroundClass : ''}`}
        style={settings.backgroundType === 'custom' && settings.backgroundImage ? { backgroundImage: `url(${settings.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
      >
        {settings.theme === 'sky' && settings.backgroundType === 'default' && (
          <div className={`absolute inset-0`}></div>
        )}
      </div>
       {settings.backgroundType === 'custom' && <div className="fixed inset-0 z-[-1] bg-black/50"></div>}
      <div className={`flex h-screen font-sans transition-colors duration-500 text-[color:var(--text-primary)] overflow-hidden bg-[color:var(--bg-main)]`}>
      <Sidebar 
        isOpen={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onNewChat={handleNewChat}
        onSelectChat={(id) => setCurrentSessionId(id)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          setImageGenerationError(null);
        }}
        settings={settings}
        onSettingsChange={setSettings}
        onGenerateBackground={handleGenerateBackground}
        isGenerating={isLoading}
        generationError={imageGenerationError}
      />

      {isMapOpen && mapCoordinates && (
          <MapView 
            latitude={mapCoordinates.lat} 
            longitude={mapCoordinates.lng} 
            onClose={() => setIsMapOpen(false)} 
            openWeatherApiKey={settings.openWeatherApiKey}
            tomorrowIoApiKey={settings.tomorrowIoApiKey}
            locationName={mapLocationName}
            settings={settings}
          />
      )}

      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <div className="flex items-center p-2 text-[color:var(--text-primary)] bg-[color:var(--bg-main)]/80 backdrop-blur-sm border-b border-[color:var(--border-color)] md:hidden z-10">
           <button className="p-2 -ml-2 rounded-md hover:bg-white/5" onClick={() => setSidebarOpen(true)}>
             <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" className="h-6 w-6"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
           </button>
           <div className="flex-1 text-center text-sm font-normal truncate px-2">{currentSession?.title || 'New Chat'}</div>
           <button className="p-2 -mr-2 rounded-md hover:bg-white/5" onClick={handleNewChat}>
             <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" className="h-6 w-6"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
           </button>
        </div>

        <main className="flex-1 overflow-y-auto scroll-smooth relative w-full">
          {(!currentSessionId || messages.length === 0) ? (
            <div className="flex flex-col items-center justify-center h-full px-4 text-center">
               <div className="w-16 h-16 mb-6 bg-gemini-gradient rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 animate-pulse-fast">
                <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none"><path fillRule="evenodd" clipRule="evenodd" d="M12 4.75L13.2356 8.26438L16.75 9.5L13.2356 10.7356L12 14.25L10.7644 10.7356L7.25 9.5L10.7644 8.26438L12 4.75ZM4.75 12L5.53158 14.0658L7.59737 14.8474L5.53158 15.6289L4.75 17.6947L3.96842 15.6289L2 14.8474L3.96842 14.0658L4.75 12ZM17.6947 12L18.4763 14.0658L20.5421 14.8474L18.4763 15.6289L17.6947 17.6947L16.9132 15.6289L14.8474 14.8474L16.9132 14.0658L17.6947 12Z" fill="currentColor"></path></svg>
               </div>
              <h2 className="text-2xl font-semibold mb-2">WeatherGPT</h2>
              <p className="text-[color:var(--text-secondary)] max-w-lg mb-8">
                Your advanced AI meteorologist. Forecasts, charts, and visualizations powered by Gemini.
              </p>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-xl text-sm">
                 <button onClick={() => handleSendMessage("What's the weather in Tokyo?")} className="bg-white/5 hover:bg-white/10 p-3 rounded-lg transition-colors text-left">
                   "What's the weather in Tokyo?" →
                 </button>
                 <button onClick={() => handleSendMessage("Visualize a storm over the ocean.")} className="bg-white/5 hover:bg-white/10 p-3 rounded-lg transition-colors text-left">
                   "Visualize a storm..." →
                 </button>
                 <button onClick={() => handleSendMessage("Compare the climate of Paris and London.")} className="bg-white/5 hover:bg-white/10 p-3 rounded-lg transition-colors text-left">
                   "Compare Paris and London..." →
                 </button>
                  <button onClick={() => handleSendMessage("Explain the impact of El Niño.")} className="bg-white/5 hover:bg-white/10 p-3 rounded-lg transition-colors text-left">
                   "Explain the impact of El Niño..." →
                 </button>
               </div>
            </div>
          ) : (
            <div className="flex flex-col pb-32">
              {messages.map(msg => (
                <MessageItem 
                  key={msg.id} 
                  message={msg} 
                  theme={settings.theme} 
                  onPlayAudio={handlePlayAudio} 
                  units={settings.units} 
                  dismissedAlerts={dismissedAlerts} 
                  onDismissAlert={handleDismissAlert} 
                  onDismissAllAlerts={handleDismissAllAlerts} 
                  onGenerateVideo={handleGenerateVideo}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>
        
        <div className={`absolute bottom-0 left-0 w-full pt-10 pb-6 px-4 transition-all duration-300 ${settings.theme === 'diamond' ? 'bg-gradient-to-t from-[--bg-main] via-[--bg-main] to-transparent' : ''}`}>
          <div className="max-w-3xl mx-auto">
            <LocationSuggestions
              suggestions={suggestions}
              onSelect={(location) => {
                setInput(location);
                setSuggestions([]);
              }}
            />
            {chatInputForm}
            <div className="text-center text-xs text-[color:var(--text-secondary)] mt-2">AI can make mistakes. Consider checking important information.</div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default App;
