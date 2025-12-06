

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Sidebar from './components/Sidebar';
import MessageItem from './components/MessageItem';
import SettingsModal from './components/SettingsModal';
import LocationSuggestions from './components/LocationSuggestions';
import { ChatSession, Message, Settings, WeatherAlert } from './types';
import { streamResponse, parseModelResponse, generateTitle } from './services/weatherService';
import { generateSpeech, playAudio } from './services/ttsService';
import { generateBackgroundImage } from './services/imageService';
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
  
  const [settings, setSettings] = useState<Settings>({
    defaultModel: 'fast',
    voice: 'Zephyr',
    units: 'metric',
    theme: 'sky',
    backgroundType: 'default',
    backgroundPrompt: '',
    backgroundImage: '',
    conversationalMode: false,
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
  // Track if we are currently processing a voice input to prevent race conditions
  const isProcessingVoiceRef = useRef(false);

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];
  const currentBgClass = getBackgroundClass(messages[messages.length-1]?.current?.condition);

  // Sync ref for access in closures
  useEffect(() => {
    isConversationalModeRef.current = settings.conversationalMode;
    if (!settings.conversationalMode && isListening) {
      recognition?.stop();
      setIsListening(false);
    }
  }, [settings.conversationalMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

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

  useEffect(() => {
    if (activeAudioSource.current) {
      activeAudioSource.current.stop();
      activeAudioSource.current = null;
    }
    setSessions(prev => prev.map(s => ({ ...s, messages: s.messages.map(m => ({ ...m, audioState: 'idle' })) })));
    setDismissedAlerts([]);
    setIsListening(false);
    recognition?.stop();
  }, [currentSessionId]);

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
      if (isConversationalModeRef.current && isListening && !isProcessingVoiceRef.current) {
        // In conversational mode, if input exists, submit it.
        // If not, just restart listening.
        const inputVal = (document.getElementById('chat-input') as HTMLTextAreaElement)?.value.trim();
        if (inputVal) {
           isProcessingVoiceRef.current = true;
           handleSendMessage(inputVal).then(() => {
             isProcessingVoiceRef.current = false;
           });
        } else {
           // Restart listening if no input and we weren't stopped explicitly
           try { recognition.start(); } catch(e) {}
        }
      } else if (isListening && !isConversationalModeRef.current) {
        // Standard mode: stop listening and submit if content
        setIsListening(false);
        const inputVal = (document.getElementById('chat-input') as HTMLTextAreaElement)?.value.trim();
        if (inputVal) {
             handleSendMessage(inputVal);
        }
      }
    };
    
    recognition.onerror = (event: any) => {
        console.warn("Speech recognition error", event.error);
        if (event.error === 'not-allowed') {
            setIsListening(false);
        }
    }
  }, [isListening]);

  const handleNewChat = useCallback(() => {
    const newSessionId = uuidv4();
    const newSession: ChatSession = { id: newSessionId, title: 'New Chat', createdAt: Date.now(), model: settings.defaultModel, messages: [] };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSessionId);
  }, [settings.defaultModel]);
  
  const updateMessages = (sessionId: string, messageUpdater: (messages: Message[]) => Message[]) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages: messageUpdater(s.messages) } : s));
  };

  const handleSendMessage = async (messageContent: string) => {
    if (!messageContent.trim() || isLoading) return;
    
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

    // Stop listening momentarily while processing response
    if (isListening) { 
        recognition?.stop(); 
        // We do NOT set isListening to false here if in conversational mode, 
        // we essentially pause actual recording but keep logic state true
        // so we can restart after TTS.
        if (!settings.conversationalMode) setIsListening(false);
    }

    const userMessage: Message = { id: uuidv4(), role: 'user', content: messageContent, timestamp: Date.now() };
    const aiMessageId = uuidv4();
    const aiMessagePlaceholder: Message = { id: aiMessageId, role: 'model', content: '', isStreaming: true, timestamp: Date.now(), audioState: 'idle' };

    updateMessages(sessId, msgs => [...msgs, userMessage, aiMessagePlaceholder]);
    setInput('');
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

      const parsed = parseModelResponse(fullText);
      updateMessages(sessId, msgs => msgs.map(m => 
        m.id === aiMessageId ? { 
          ...m, content: parsed.cleanedText, isStreaming: false, groundingMetadata: { groundingChunks }, ...parsed
        } : m
      ));
      
      if (parsed.location && !locationHistory.includes(parsed.location)) {
        setLocationHistory(prev => [parsed.location, ...prev].slice(0, 15));
      }

      // Auto-play audio logic
      if ((autoPlayNext || settings.conversationalMode) && parsed.cleanedText) {
          // Pass true to restart listening after TTS is done
          handlePlayAudio(aiMessageId, parsed.cleanedText, settings.conversationalMode); 
          setAutoPlayNext(false);
      } else if (settings.conversationalMode) {
          // If no text to speak (unlikely), resume listening immediately
          try { recognition?.start(); } catch(e) {}
      }

    } catch (error: any) {
      console.error("Chat error:", error);
      const errorMessage = `Sorry, I encountered an error. Details: ${error.message || JSON.stringify(error)}`;
      updateMessages(sessId, msgs => msgs.map(m => m.id === aiMessageId ? { ...m, content: errorMessage, isStreaming: false } : m));
      // If error, resume listening if mode is on
      if (settings.conversationalMode) {
          try { recognition?.start(); } catch(e) {}
      }
    } finally { setIsLoading(false); }
  };

  const toggleListening = () => {
    if (isListening) {
      recognition?.stop();
      setIsListening(false);
    } else {
      setInput('');
      try { recognition?.start(); } catch(e) { console.error(e); }
      setAutoPlayNext(true); // Auto-play response for this interaction
      setIsListening(true);
    }
  };
  
  const handlePlayAudio = useCallback(async (messageId: string, text: string, restartListeningAfter = false) => {
    if (!currentSessionId) return;
    
    // Stop recognition while AI speaks
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
        
        // Resume listening if requested (Conversational Mode)
        if (restartListeningAfter && isConversationalModeRef.current) {
             setInput('');
             try { recognition?.start(); } catch(e) {}
             // Ensure state reflects we are listening again
             // (Though we likely didn't set it to false, just stopped the engine)
        }
      });
    } catch (error) {
      console.error("Failed to play audio:", error);
      updateMessages(currentSessionId, msgs => msgs.map(m => m.id === messageId ? { ...m, audioState: 'idle' } : m));
      
      // If failed, still try to resume if in conversational mode
      if (restartListeningAfter && isConversationalModeRef.current) {
         try { recognition?.start(); } catch(e) {}
      }
    }
  }, [currentSessionId, settings.voice]);
  
  const handleGenerateBackground = async () => {
    if (!settings.backgroundPrompt) return;
    setImageGenerationError(null);
    setIsLoading(true);

    try {
      const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
      if (!hasKey) {
        await (window as any).aistudio?.openSelectKey();
      }

      const imageData = await generateBackgroundImage(settings.backgroundPrompt);
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
  };

  const handleDismissAlert = (alertTitle: string) => {
    setDismissedAlerts(prev => [...prev, alertTitle]);
  };

  const handleDismissAllAlerts = (alertsToDismiss: WeatherAlert[]) => {
    setDismissedAlerts(prev => [...prev, ...alertsToDismiss.map(a => a.title)]);
  };

  return (
    <>
      <div 
        className={`fixed inset-0 z-[-1] transition-all duration-1000 ${settings.backgroundType === 'default' ? currentBgClass : ''}`}
        style={settings.backgroundType === 'custom' && settings.backgroundImage ? { backgroundImage: `url(${settings.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
      >
        {settings.theme === 'sky' && settings.backgroundType === 'default' && (
           <>
             {currentBgClass.includes('rain') && <div className="absolute inset-0 rain-animation animate-rain"></div>}
             {currentBgClass.includes('snow') && <div className="absolute inset-0 snow-animation animate-snow"></div>}
           </>
        )}
      </div>
       {settings.backgroundType === 'custom' && <div className="fixed inset-0 z-[-1] bg-black/50"></div>}
      <div className={`flex h-screen font-sans transition-colors duration-500 text-[color:var(--text-primary)] overflow-hidden`}>
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
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
               </div>
              <h2 className="text-2xl font-semibold mb-2">WeatherGPT</h2>
              <p className="text-[color:var(--text-secondary)] max-w-lg mb-8">
                Your personal AI assistant & meteorological strategist.
              </p>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-xl text-sm">
                 <button onClick={() => handleSendMessage("Plan my week: I need to go to the grocery store and have a picnic.")} className="bg-white/5 hover:bg-white/10 p-3 rounded-lg transition-colors text-left">
                   "Plan my week: I need to go to the grocery store and have a picnic." →
                 </button>
                 <button onClick={() => handleSendMessage("What's the best time to go for a walk today?")} className="bg-white/5 hover:bg-white/10 p-3 rounded-lg transition-colors text-left">
                   "What's the best time to go for a walk today?" →
                 </button>
               </div>
            </div>
          ) : (
            <div className="flex flex-col pb-32">
              {messages.map(msg => <MessageItem key={msg.id} message={msg} onPlayAudio={(id, text) => handlePlayAudio(id, text, false)} units={settings.units} dismissedAlerts={dismissedAlerts} onDismissAlert={handleDismissAlert} onDismissAllAlerts={handleDismissAllAlerts} />)}
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>
        
        <div className={`absolute bottom-0 left-0 w-full pt-10 pb-6 px-4 ${settings.theme === 'diamond' ? 'bg-gradient-to-t from-[--bg-main] via-[--bg-main] to-transparent' : ''}`}>
          <div className="max-w-3xl mx-auto">
            <LocationSuggestions
              suggestions={suggestions}
              onSelect={(location) => {
                setInput(location);
                setSuggestions([]);
              }}
            />
             <form id="chat-form" onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }} className={`relative flex items-center w-full p-2 pr-3 rounded-xl border border-[color:var(--border-color)] shadow-md focus-within:ring-2 ring-blue-500/50 ${settings.theme === 'sky' ? 'cloud-input' : 'bg-[color:var(--bg-input)] backdrop-blur-md'}`}>
              <button type="button" onClick={toggleListening} className={`p-2 mr-2 rounded-full transition-colors ${isListening ? 'bg-red-500/50 text-red-300 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-white/5'}`} disabled={!recognition} title={isListening ? "Stop listening" : "Start voice mode"}>
                <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" className="h-5 w-5"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"></path></svg>
              </button>
              <textarea 
                id="chat-input"
                rows={1} 
                className="flex-1 max-h-[100px] py-2 bg-transparent placeholder-[color:var(--text-secondary)] focus:outline-none resize-none z-10" 
                placeholder={isListening ? (settings.conversationalMode ? "Conversational Mode Active..." : "Listening...") : "Ask WeatherGPT..."} 
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
              <button type="submit" disabled={!input.trim() || isLoading} className={`p-2 rounded-md transition-colors z-10 ${input.trim() && !isLoading ? 'bg-gemini-gradient text-white' : 'bg-transparent text-[color:var(--text-secondary)] cursor-not-allowed'}`}>
                {isLoading ? (<div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-white" />) : (<svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>)}
              </button>
            </form>
            <div className="text-center text-xs text-[color:var(--text-secondary)] mt-2">WeatherGPT can make mistakes. Verify severe weather alerts with local authorities.</div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default App;