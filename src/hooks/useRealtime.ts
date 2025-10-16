import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  RealtimeSessionConfig,
  ConnectionState,
  ConversationState,
  RealtimeTool
} from '@/types/realtime';
import type { AppConfig } from '@/types';
import RealtimeService from '@/services/realtimeService';

interface UseRealtimeConfig extends Partial<RealtimeSessionConfig> {
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

interface UseRealtimeReturn {
  // Connection state
  connectionState: ConnectionState;
  conversationState: ConversationState;
  isConnected: boolean;
  isConnecting: boolean;

  // Connection methods
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;

  // Conversation methods
  sendMessage: (message: string) => void;
  sendAudioData: (audioData: ArrayBuffer) => void;
  createResponse: () => void;
  cancelResponse: () => void;

  // Tool management
  addTool: (tool: RealtimeTool, handler: Function) => void;
  removeTool: (toolName: string) => void;

  // Audio state
  isListening: boolean;
  isSpeaking: boolean;

  // Conversation data
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    type: 'text' | 'audio';
  }>;
  currentTranscript: string;

  // Error handling
  error: string | null;
  clearError: () => void;
}

export function useRealtime(config: UseRealtimeConfig): UseRealtimeReturn {
  // State
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [conversationState, setConversationState] = useState<ConversationState>('idle');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<UseRealtimeReturn['messages']>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Refs
  const serviceRef = useRef<RealtimeService | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingAudioRef = useRef(false);

  // Configuration with defaults
  const finalConfig: RealtimeSessionConfig = {
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    model: import.meta.env.VITE_REALTIME_MODEL || 'gpt-4o-realtime-preview',
    voice: import.meta.env.VITE_REALTIME_VOICE || 'nova',
    temperature: parseFloat(import.meta.env.VITE_REALTIME_TEMPERATURE) || 0.7,
    maxTokens: parseInt(import.meta.env.VITE_REALTIME_MAX_TOKENS) || 150,
    ...config
  };

  const maxReconnectAttempts = config.reconnectAttempts || 3;
  const reconnectDelay = config.reconnectDelay || 2000;

  // Initialize service
  useEffect(() => {
    if (!serviceRef.current) {
      serviceRef.current = new RealtimeService(finalConfig);
      setupEventHandlers();
    }

    // Auto-connect if configured
    if (config.autoConnect && connectionState === 'disconnected') {
      connect();
    }

    return () => {
      if (serviceRef.current) {
        serviceRef.current.disconnect();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Setup event handlers
  const setupEventHandlers = useCallback(() => {
    const service = serviceRef.current;
    if (!service) return;

    // Connection events
    service.on('connected', () => {
      setConnectionState('connected');
      setError(null);
      reconnectAttemptsRef.current = 0;
    });

    service.on('disconnected', () => {
      setConnectionState('disconnected');
      setConversationState('idle');
      setIsListening(false);
      setIsSpeaking(false);
    });

    service.on('error', (error: any) => {
      setConnectionState('error');
      setError(error.message || 'Connection error');

      // Auto-reconnect if configured
      if (config.autoConnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
        scheduleReconnect();
      }
    });

    // Speech events
    service.on('speech.started', () => {
      setIsListening(true);
      setConversationState('listening');
    });

    service.on('speech.stopped', () => {
      setIsListening(false);
      setConversationState('processing');
    });

    // Response events
    service.on('response.started', () => {
      setConversationState('thinking');
    });

    service.on('response.completed', () => {
      setConversationState('idle');

      // Wait a bit for audio to finish playing
      setTimeout(() => {
        setIsSpeaking(false);
        isPlayingAudioRef.current = false;
        audioQueueRef.current = [];
      }, 1000);
    });

    // Message events
    service.on('message.received', (message: any) => {
      if (message.role === 'assistant' && message.content) {
        const newMessage = {
          id: message.id || Date.now().toString(),
          role: 'assistant' as const,
          content: message.content[0]?.text || '',
          timestamp: new Date(),
          type: 'text' as const
        };
        setMessages(prev => [...prev, newMessage]);
      }
    });

    // Audio events
    service.on('audio.delta', (delta: ArrayBuffer) => {
      setIsSpeaking(true);
      setConversationState('speaking');

      // Queue audio for playback
      if (delta && delta.byteLength > 0) {
        console.log('[REALTIME] Queuing audio delta for playback, size:', delta.byteLength);
        audioQueueRef.current.push(delta);
        processAudioQueue();
      }
    });

    // Text and transcript events
    service.on('text.delta', (delta: string) => {
      console.log('[REALTIME] Text delta received:', delta);
      setCurrentTranscript(prev => prev + delta);
    });

    service.on('text.done', (text: string) => {
      console.log('[REALTIME] Text completed:', text);
      setCurrentTranscript('');
    });

    service.on('transcript.delta', (delta: string) => {
      console.log('[REALTIME] Audio transcript delta:', delta);
      setCurrentTranscript(prev => prev + delta);
    });

    // Conversation updates
    service.on('conversation.updated', (items: any[]) => {
      const formattedMessages = items
        .filter(item => item.type === 'message')
        .map(item => ({
          id: item.id,
          role: item.role as 'user' | 'assistant',
          content: item.content?.[0]?.text || item.content?.[0]?.transcript || '',
          timestamp: new Date(),
          type: item.content?.[0]?.type === 'input_audio' ? 'audio' as const : 'text' as const
        }));

      setMessages(formattedMessages);
    });
  }, [config.autoConnect, maxReconnectAttempts]);

  // Schedule reconnection
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(async () => {
      reconnectAttemptsRef.current++;
      try {
        await connect();
      } catch (error) {
        console.error('Reconnection failed:', error);
      }
    }, reconnectDelay);
  }, [reconnectDelay]);

  // Audio playback functions
  const initializeAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000
      });
    }
    return audioContextRef.current;
  }, []);

  const playAudioChunk = useCallback(async (audioData: ArrayBuffer) => {
    try {
      const audioContext = initializeAudioContext();

      // Decode the audio data
      const audioBuffer = await audioContext.decodeAudioData(audioData.slice(0));

      // Create a buffer source
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;

      // Connect to output
      source.connect(audioContext.destination);

      // Play the audio
      source.start();
      console.log('[AUDIO] Playing audio chunk, duration:', audioBuffer.duration);

      return new Promise<void>((resolve) => {
        source.onended = () => {
          resolve();
        };
      });
    } catch (error) {
      console.error('[AUDIO] Error playing audio chunk:', error);
    }
  }, [initializeAudioContext]);

  const processAudioQueue = useCallback(async () => {
    if (isPlayingAudioRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    isPlayingAudioRef.current = true;

    while (audioQueueRef.current.length > 0) {
      const audioData = audioQueueRef.current.shift();
      if (audioData) {
        await playAudioChunk(audioData);
      }
    }

    isPlayingAudioRef.current = false;
  }, [playAudioChunk]);

  // Connection methods
  const connect = useCallback(async () => {
    if (!serviceRef.current || connectionState === 'connected' || connectionState === 'connecting') {
      return;
    }

    try {
      setConnectionState('connecting');
      setError(null);

      // Initialize audio context (required by user interaction)
      initializeAudioContext();

      await serviceRef.current.connect();
    } catch (error: any) {
      setConnectionState('error');
      setError(error.message || 'Failed to connect');
      throw error;
    }
  }, [connectionState, initializeAudioContext]);

  const disconnect = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.disconnect();
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Clean up audio
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingAudioRef.current = false;

    reconnectAttemptsRef.current = 0;
  }, []);

  const reconnect = useCallback(async () => {
    disconnect();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    await connect();
  }, [connect, disconnect]);

  // Conversation methods
  const sendMessage = useCallback((message: string) => {
    if (!serviceRef.current || connectionState !== 'connected') {
      throw new Error('Not connected');
    }

    // Add user message to local state
    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: message,
      timestamp: new Date(),
      type: 'text' as const
    };
    setMessages(prev => [...prev, userMessage]);

    // Clear current transcript
    setCurrentTranscript('');

    // Send to service
    serviceRef.current.sendUserMessage(message);
  }, [connectionState]);

  const sendAudioData = useCallback((audioData: ArrayBuffer) => {
    if (!serviceRef.current || connectionState !== 'connected') {
      throw new Error('Not connected');
    }

    serviceRef.current.sendAudioData(audioData);
  }, [connectionState]);

  const createResponse = useCallback(() => {
    if (!serviceRef.current || connectionState !== 'connected') {
      throw new Error('Not connected');
    }

    serviceRef.current.createResponse();
  }, [connectionState]);

  const cancelResponse = useCallback(() => {
    if (!serviceRef.current) return;

    serviceRef.current.cancelResponse();
    setConversationState('idle');
    setIsSpeaking(false);
  }, []);

  // Tool management
  const addTool = useCallback((tool: RealtimeTool, handler: Function) => {
    if (!serviceRef.current) return;
    serviceRef.current.addTool(tool, handler);
  }, []);

  const removeTool = useCallback((toolName: string) => {
    if (!serviceRef.current) return;
    serviceRef.current.removeTool(toolName);
  }, []);

  // Error handling
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Computed state
  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';

  return {
    // Connection state
    connectionState,
    conversationState,
    isConnected,
    isConnecting,

    // Connection methods
    connect,
    disconnect,
    reconnect,

    // Conversation methods
    sendMessage,
    sendAudioData,
    createResponse,
    cancelResponse,

    // Tool management
    addTool,
    removeTool,

    // Audio state
    isListening,
    isSpeaking,

    // Conversation data
    messages,
    currentTranscript,

    // Error handling
    error,
    clearError
  };
}