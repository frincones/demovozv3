import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  SpeechRecognitionResult,
  AudioError
} from '@/types/audio';
import SpeechService from '@/services/speechService';

interface UseSpeechRecognitionConfig {
  language?: 'es' | 'en';
  continuous?: boolean;
  interimResults?: boolean;
  autoStart?: boolean;
  onResult?: (result: SpeechRecognitionResult) => void;
  onError?: (error: AudioError) => void;
}

interface UseSpeechRecognitionReturn {
  // State
  isRecognizing: boolean;
  isSupported: boolean;
  currentTranscript: string;
  finalTranscript: string;
  confidence: number;
  error: AudioError | null;

  // Methods
  start: () => void;
  stop: () => void;
  toggle: () => void;
  setLanguage: (language: 'es' | 'en') => void;

  // Speech synthesis
  speak: (text: string, language?: 'es' | 'en') => Promise<void>;
  stopSpeaking: () => void;
  isSpeaking: boolean;

  // Cleanup
  cleanup: () => void;
  clearError: () => void;
}

export function useSpeechRecognition(config: UseSpeechRecognitionConfig = {}): UseSpeechRecognitionReturn {
  // State
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<AudioError | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [language, setLanguageState] = useState<'es' | 'en'>(config.language || 'es');

  // Refs
  const serviceRef = useRef<SpeechService | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize speech service
  useEffect(() => {
    if (!isInitializedRef.current) {
      serviceRef.current = new SpeechService();
      setupEventHandlers();
      isInitializedRef.current = true;

      // Auto-start if configured
      if (config.autoStart && serviceRef.current.isSupported) {
        start();
      }
    }

    return () => {
      cleanup();
    };
  }, []);

  // Setup event handlers
  const setupEventHandlers = useCallback(() => {
    const service = serviceRef.current;
    if (!service) return;

    // Recognition result handler
    service.onRecognitionResult((result: SpeechRecognitionResult) => {
      setConfidence(result.confidence);

      if (result.isFinal) {
        setFinalTranscript(prev => prev + result.text + ' ');
        setCurrentTranscript('');
        config.onResult?.(result);
      } else {
        setCurrentTranscript(result.text);
      }
    });

    // Recognition error handler
    service.onRecognitionError((error: AudioError) => {
      setError(error);
      setIsRecognizing(false);
      config.onError?.(error);
    });

    // Recognition start handler
    service.onRecognitionStart(() => {
      setIsRecognizing(true);
      setError(null);
    });

    // Recognition end handler
    service.onRecognitionEnd(() => {
      setIsRecognizing(false);
    });
  }, [config.onResult, config.onError]);

  // Start recognition
  const start = useCallback(() => {
    if (!serviceRef.current) return;

    if (!serviceRef.current.recognitionSupported) {
      const error: AudioError = {
        type: 'not_supported',
        message: 'Speech recognition not supported in this browser'
      };
      setError(error);
      return;
    }

    try {
      setError(null);
      setCurrentTranscript('');
      serviceRef.current.startRecognition(language);
    } catch (error: any) {
      const audioError: AudioError = {
        type: 'unknown',
        message: error.message || 'Failed to start speech recognition'
      };
      setError(audioError);
    }
  }, [language]);

  // Stop recognition
  const stop = useCallback(() => {
    if (!serviceRef.current) return;

    serviceRef.current.stopRecognition();
    setIsRecognizing(false);
  }, []);

  // Toggle recognition
  const toggle = useCallback(() => {
    if (isRecognizing) {
      stop();
    } else {
      start();
    }
  }, [isRecognizing, start, stop]);

  // Set language
  const setLanguage = useCallback((newLanguage: 'es' | 'en') => {
    setLanguageState(newLanguage);

    if (serviceRef.current) {
      serviceRef.current.setRecognitionLanguage(newLanguage);

      // Restart recognition if active
      if (isRecognizing) {
        serviceRef.current.stopRecognition();
        setTimeout(() => {
          serviceRef.current?.startRecognition(newLanguage);
        }, 100);
      }
    }
  }, [isRecognizing]);

  // Speech synthesis
  const speak = useCallback(async (text: string, speakLanguage?: 'es' | 'en'): Promise<void> => {
    if (!serviceRef.current) {
      throw new Error('Speech service not initialized');
    }

    if (!serviceRef.current.synthesisSupported) {
      throw new Error('Speech synthesis not supported');
    }

    try {
      setIsSpeaking(true);
      setError(null);

      const voice = serviceRef.current.getVoiceByLanguage(speakLanguage || language, true);

      await serviceRef.current.speak(text, {
        voice: voice || undefined,
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        language: speakLanguage === 'en' ? 'en-US' : 'es-ES'
      });
    } catch (error: any) {
      const audioError: AudioError = {
        type: 'unknown',
        message: error.message || 'Failed to speak text'
      };
      setError(audioError);
      throw error;
    } finally {
      setIsSpeaking(false);
    }
  }, [language]);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (!serviceRef.current) return;

    serviceRef.current.stopSpeaking();
    setIsSpeaking(false);
  }, []);

  // Monitor speech synthesis state
  useEffect(() => {
    const monitorSpeaking = () => {
      if (serviceRef.current) {
        setIsSpeaking(serviceRef.current.speaking);
      }
    };

    const interval = setInterval(monitorSpeaking, 100);

    return () => clearInterval(interval);
  }, []);

  // Cleanup
  const cleanup = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.cleanup();
      serviceRef.current = null;
    }
    setIsRecognizing(false);
    setIsSpeaking(false);
    setCurrentTranscript('');
    setFinalTranscript('');
    isInitializedRef.current = false;
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Clear transcripts when language changes
  useEffect(() => {
    setCurrentTranscript('');
    setFinalTranscript('');
  }, [language]);

  const isSupported = serviceRef.current?.isSupported || false;

  return {
    // State
    isRecognizing,
    isSupported,
    currentTranscript,
    finalTranscript,
    confidence,
    error,

    // Methods
    start,
    stop,
    toggle,
    setLanguage,

    // Speech synthesis
    speak,
    stopSpeaking,
    isSpeaking,

    // Cleanup
    cleanup,
    clearError
  };
}