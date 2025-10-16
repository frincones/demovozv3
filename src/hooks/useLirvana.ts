import { useState, useEffect, useCallback, useRef } from 'react';
import useWebRTC from './useWebRTC';
import { useAudio } from './useAudio';
import { useSpeechRecognition } from './useSpeechRecognition';

import type {
  ConversationState,
  ConversationContext,
  UserLocation,
  Executive,
  WhatsAppRedirection
} from '@/types/business';

import type { Conversation, ConnectionStatus } from '@/types/conversation';

import LirvanaTools from '@/services/lirvanaTools';
import { appConfig, log } from '@/config/appConfig';

interface UseLirvanaConfig {
  autoConnect?: boolean;
  language?: 'es' | 'en';
  fallbackToSpeech?: boolean;
}

interface UseLirvanaReturn {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  connectionStatus: ConnectionStatus;

  // Conversation state
  conversationState: ConversationState;
  messages: Conversation[];

  // Audio state
  isListening: boolean;
  isSpeaking: boolean;
  audioLevel: number;
  currentTranscript: string;

  // User state
  userLocation: UserLocation | null;
  assignedExecutive: Executive | null;
  language: 'es' | 'en';

  // Methods
  connect: () => Promise<void>;
  disconnect: () => void;
  startListening: () => void;
  stopListening: () => void;
  sendMessage: (message: string) => void;
  setLanguage: (lang: 'es' | 'en') => void;

  // Business methods
  processLocationInput: (input: string) => Promise<boolean>;
  redirectToWhatsApp: (redirection: WhatsAppRedirection) => void;

  // Error handling
  error: string | null;
  clearError: () => void;

  // Cleanup
  cleanup: () => void;
}

export function useLirvana(config: UseLirvanaConfig = {}): UseLirvanaReturn {
  // Configuration
  const {
    autoConnect = false,
    language: initialLanguage = 'es',
    fallbackToSpeech = true
  } = config;

  // State
  const [conversationState, setConversationState] = useState<ConversationState>('idle');
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [assignedExecutive, setAssignedExecutive] = useState<Executive | null>(null);
  const [language, setLanguageState] = useState<'es' | 'en'>(initialLanguage);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<ConversationContext>({
    products_discussed: [],
    intent: 'unknown',
    stage: 'greeting',
    metadata: {}
  });

  // Refs
  const toolsRef = useRef<LirvanaTools | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize tools
  useEffect(() => {
    if (!isInitializedRef.current) {
      toolsRef.current = new LirvanaTools();
      isInitializedRef.current = true;
    }
  }, []);

  // Hooks - Replace useRealtime with useWebRTC
  const webrtc = useWebRTC(
    'alloy', // Voice setting - valid for Realtime API
    [] // Tools will be registered separately
  );

  const audio = useAudio({
    ...appConfig.audio,
    autoStart: false,
    onData: (chunk) => {
      // WebRTC handles audio automatically through RTCPeerConnection
      // No need to manually send audio data
    },
    onError: (error) => {
      log('error', 'Audio error:', error);
      setError(`Error de audio: ${error.message}`);
    }
  });

  const speech = useSpeechRecognition({
    language,
    continuous: true,
    interimResults: true,
    onResult: (result) => {
      if (result.isFinal && result.text.trim()) {
        handleUserInput(result.text);
      }
    },
    onError: (error) => {
      log('warn', 'Speech recognition error:', error);
      // Don't set error for speech recognition as it's a fallback
    }
  });

  // Setup tool handlers for WebRTC
  useEffect(() => {
    if (toolsRef.current && webrtc.isSessionActive) {
      const handlers = toolsRef.current.getToolHandlers();

      for (const [toolName, handler] of handlers) {
        webrtc.registerFunction(toolName, async (params: any) => {
          try {
            log('info', `Executing tool: ${toolName}`, params);
            const result = await handler(params);

            // Handle specific tool results
            if (toolName === 'get_location_info' && result.success) {
              setUserLocation(result.location);
              updateContext({ user_location: result.location, stage: 'needs_assessment' });
            } else if (toolName === 'redirect_to_sales' && result.success) {
              setAssignedExecutive(result.executive);
              updateContext({ assigned_executive: result.executive, stage: 'redirection' });
            }

            return result;
          } catch (error: any) {
            log('error', `Tool execution failed: ${toolName}`, error);
            return {
              success: false,
              error: error.message,
              message: 'Hubo un error procesando tu solicitud. ¿Podrías intentar de nuevo?'
            };
          }
        });
      }
    }
  }, [webrtc.isSessionActive, toolsRef.current]);

  // Handle user input
  const handleUserInput = useCallback(async (input: string) => {
    log('info', 'User input received:', input);

    try {
      // Update conversation context
      updateContext({ stage: 'needs_assessment' });

      // WebRTC handles text input differently - it's converted to audio automatically
      // For WebRTC mode, we rely on speech input primarily
      if (webrtc.isSessionActive) {
        // In WebRTC mode, we primarily use voice, but we can log text input
        log('info', 'WebRTC session active - input will be handled via voice');
      } else if (fallbackToSpeech && speech.isSupported) {
        // Fallback to local speech processing
        await handleFallbackProcessing(input);
      } else {
        setError('No hay conexión disponible para procesar tu mensaje');
      }
    } catch (error: any) {
      log('error', 'Error handling user input:', error);
      setError(`Error procesando mensaje: ${error.message}`);
    }
  }, [webrtc.isSessionActive, fallbackToSpeech, speech.isSupported]);

  // Fallback processing when Realtime API is not available
  const handleFallbackProcessing = useCallback(async (input: string) => {
    log('info', 'Using fallback processing for input:', input);

    // Simple keyword-based processing
    const lowerInput = input.toLowerCase();

    if (lowerInput.includes('ubicación') || lowerInput.includes('estoy en') || lowerInput.includes('vivo en')) {
      const success = await processLocationInput(input);
      if (success) {
        speech.speak('Perfecto, he registrado tu ubicación. ¿En qué puedo ayudarte?', language);
      }
    } else if (lowerInput.includes('polux') || lowerInput.includes('producto')) {
      speech.speak('Te puedo ayudar con información sobre nuestros productos Polux40 y Polux40 Pro. ¿Cuál te interesa más?', language);
    } else if (lowerInput.includes('comprar') || lowerInput.includes('precio')) {
      if (userLocation) {
        speech.speak('Te voy a conectar con nuestro ejecutivo comercial para tu zona.', language);
      } else {
        speech.speak('Para conectarte con ventas, necesito saber tu ubicación. ¿En qué ciudad y departamento estás?', language);
      }
    } else {
      speech.speak('¿Podrías ser más específico? Puedo ayudarte con información de productos, ventas o soporte técnico.', language);
    }
  }, [userLocation, language, speech.speak]);

  // Update conversation context
  const updateContext = useCallback((updates: Partial<ConversationContext>) => {
    setContext(prev => ({ ...prev, ...updates }));
  }, []);

  // Process location input
  const processLocationInput = useCallback(async (input: string): Promise<boolean> => {
    if (!toolsRef.current) return false;

    try {
      // Extract location from input (simplified)
      const locationMatch = input.match(/(?:estoy en|vivo en|soy de)\s+(.+)/i);
      if (!locationMatch) return false;

      const locationText = locationMatch[1];
      const parts = locationText.split(',').map(p => p.trim());

      if (parts.length >= 2) {
        const result = await toolsRef.current.handleLocationInfo({
          city: parts[0],
          state_department: parts[1],
          country: parts[2] || 'colombia'
        });

        if (result.success) {
          setUserLocation(result.location);
          updateContext({ user_location: result.location });
          return true;
        }
      }

      return false;
    } catch (error) {
      log('error', 'Error processing location:', error);
      return false;
    }
  }, [updateContext]);

  // WhatsApp redirection
  const redirectToWhatsApp = useCallback((redirection: WhatsAppRedirection) => {
    const url = `${redirection.link}?text=${encodeURIComponent(redirection.message)}`;
    window.open(url, '_blank');

    log('info', 'WhatsApp redirection:', { executive: redirection.executive.name, url });
  }, []);

  // Main methods
  const connect = useCallback(async () => {
    try {
      setError(null);
      await webrtc.startSession();
      log('info', 'Connected to Lirvana system via WebRTC');
    } catch (error: any) {
      log('error', 'Connection failed:', error);
      setError(`Error de conexión: ${error.message}`);
      throw error;
    }
  }, [webrtc.startSession]);

  const disconnect = useCallback(() => {
    webrtc.stopSession();
    audio.cleanup();
    speech.cleanup();
    log('info', 'Disconnected from Lirvana system');
  }, [webrtc.stopSession, audio.cleanup, speech.cleanup]);

  const startListening = useCallback(async () => {
    try {
      setError(null);

      if (webrtc.isSessionActive) {
        // WebRTC handles audio automatically when session is active
        log('info', 'WebRTC session active - listening automatically');
      } else if (fallbackToSpeech && speech.isSupported) {
        // Use speech recognition fallback
        speech.start();
      } else {
        throw new Error('No hay método de escucha disponible');
      }

      setConversationState('listening');
      log('info', 'Started listening');
    } catch (error: any) {
      log('error', 'Failed to start listening:', error);
      setError(`Error iniciando escucha: ${error.message}`);
    }
  }, [webrtc.isSessionActive, speech.start, fallbackToSpeech]);

  const stopListening = useCallback(() => {
    // For WebRTC, stopping listening means stopping the session
    if (webrtc.isSessionActive) {
      webrtc.stopSession();
    }
    speech.stop();
    setConversationState('idle');
    log('info', 'Stopped listening');
  }, [webrtc.isSessionActive, webrtc.stopSession, speech.stop]);

  const sendMessage = useCallback((message: string) => {
    if (webrtc.isSessionActive) {
      // Use WebRTC text messaging when connected
      webrtc.sendTextMessage(message);
    } else {
      // Fallback to previous behavior
      handleUserInput(message);
    }
  }, [webrtc.isSessionActive, webrtc.sendTextMessage, handleUserInput]);

  const setLanguage = useCallback((lang: 'es' | 'en') => {
    setLanguageState(lang);
    speech.setLanguage(lang);
    log('info', `Language changed to: ${lang}`);
  }, [speech.setLanguage]);

  // Error handling
  const clearError = useCallback(() => {
    setError(null);
    webrtc.clearError();
    audio.clearError();
    speech.clearError();
  }, [webrtc.clearError, audio.clearError, speech.clearError]);

  // Cleanup
  const cleanup = useCallback(() => {
    disconnect();
    setUserLocation(null);
    setAssignedExecutive(null);
    setContext({
      products_discussed: [],
      intent: 'unknown',
      stage: 'greeting',
      metadata: {}
    });
    isInitializedRef.current = false;
  }, [disconnect]);

  // Update conversation state based on WebRTC state
  useEffect(() => {
    if (webrtc.isSessionActive) {
      // During WebRTC session, determine state based on activity
      if (webrtc.currentVolume > 0.1) {
        setConversationState('speaking'); // AI is speaking
      } else {
        setConversationState('listening'); // Listening for user input
      }
    } else if (speech.isRecognizing) {
      setConversationState('listening');
    } else if (speech.isSpeaking) {
      setConversationState('speaking');
    } else {
      setConversationState('idle');
    }
  }, [webrtc.isSessionActive, webrtc.currentVolume, speech.isRecognizing, speech.isSpeaking]);

  // Error aggregation
  const aggregatedError = error || webrtc.error ||
    (audio.error ? `Audio: ${audio.error.message}` : null);

  return {
    // Connection state
    isConnected: webrtc.isSessionActive,
    isConnecting: webrtc.connectionStatus === 'requesting_mic' ||
                 webrtc.connectionStatus === 'fetching_token' ||
                 webrtc.connectionStatus === 'establishing_connection',
    connectionError: webrtc.error,
    connectionStatus: webrtc.connectionStatus,

    // Conversation state
    conversationState,
    messages: webrtc.conversation.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.text,
      timestamp: new Date(msg.timestamp),
      type: 'text' as const
    })),

    // Audio state
    isListening: webrtc.isSessionActive || speech.isRecognizing,
    isSpeaking: webrtc.currentVolume > 0.1 || speech.isSpeaking,
    audioLevel: webrtc.currentVolume,
    currentTranscript: webrtc.currentTranscript || speech.currentTranscript,

    // User state
    userLocation,
    assignedExecutive,
    language,

    // Methods
    connect,
    disconnect,
    startListening,
    stopListening,
    sendMessage,
    setLanguage,

    // Business methods
    processLocationInput,
    redirectToWhatsApp,

    // Error handling
    error: aggregatedError,
    clearError,

    // Cleanup
    cleanup
  };
}