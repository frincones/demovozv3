// Main types export file
export * from './realtime';
export * from './business';
export * from './audio';

// Global App Types
export interface AppConfig {
  openai: {
    apiKey: string;
    model: string;
    voice: string;
    temperature: number;
    maxTokens: number;
  };
  audio: {
    sampleRate: number;
    channels: number;
    echoCancellation: boolean;
    noiseSuppression: boolean;
    autoGainControl: boolean;
  };
  app: {
    name: string;
    version: string;
    debugMode: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
  business: {
    companyName: string;
    companyUrl: string;
    exposolarStand: string;
  };
}

export interface AppState {
  isInitialized: boolean;
  connection: {
    status: 'disconnected' | 'connecting' | 'connected' | 'error';
    error?: string;
  };
  audio: {
    isRecording: boolean;
    isPlaying: boolean;
    hasPermission: boolean;
    level: number;
  };
  conversation: {
    isActive: boolean;
    stage: 'idle' | 'listening' | 'processing' | 'speaking';
    messages: Array<{
      id: string;
      role: 'user' | 'assistant';
      content: string;
      timestamp: Date;
      type: 'text' | 'audio';
    }>;
  };
  user: {
    location?: import('./business').UserLocation;
    preferences: {
      language: 'es' | 'en';
      voiceEnabled: boolean;
      showCaptions: boolean;
    };
  };
}

export interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// Event Types
export interface AppEvent {
  type: string;
  payload: any;
  timestamp: Date;
}

// Error Types
export interface AppError {
  id: string;
  type: 'audio' | 'connection' | 'permission' | 'validation' | 'business';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: any;
  timestamp: Date;
  resolved: boolean;
}