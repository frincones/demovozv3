import type { AppConfig } from '@/types';

// Load configuration from environment variables
export const appConfig: AppConfig = {
  openai: {
    apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
    model: import.meta.env.VITE_REALTIME_MODEL || 'gpt-4o-realtime-preview',
    voice: import.meta.env.VITE_REALTIME_VOICE || 'nova',
    temperature: parseFloat(import.meta.env.VITE_REALTIME_TEMPERATURE) || 0.7,
    maxTokens: parseInt(import.meta.env.VITE_REALTIME_MAX_TOKENS) || 150
  },
  audio: {
    sampleRate: parseInt(import.meta.env.VITE_AUDIO_SAMPLE_RATE) || 24000,
    channels: parseInt(import.meta.env.VITE_AUDIO_CHANNELS) || 1,
    echoCancellation: import.meta.env.VITE_AUDIO_ECHO_CANCELLATION !== 'false',
    noiseSuppression: import.meta.env.VITE_AUDIO_NOISE_SUPPRESSION !== 'false',
    autoGainControl: import.meta.env.VITE_AUDIO_AUTO_GAIN_CONTROL !== 'false'
  },
  app: {
    name: import.meta.env.VITE_APP_NAME || 'Kike',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    debugMode: import.meta.env.VITE_DEBUG_MODE === 'true',
    logLevel: (import.meta.env.VITE_LOG_LEVEL as any) || 'info'
  },
  business: {
    companyName: import.meta.env.VITE_COMPANY_NAME || 'Fasecolda',
    companyUrl: import.meta.env.VITE_COMPANY_URL || 'https://fasecolda.com',
    exposolarStand: import.meta.env.VITE_EXPOSOLAR_STAND || '256'
  }
};

// Validation
export function validateConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required OpenAI configuration
  if (!appConfig.openai.apiKey) {
    errors.push('VITE_OPENAI_API_KEY is required');
  }

  if (!appConfig.openai.model) {
    errors.push('VITE_REALTIME_MODEL is required');
  }

  // Validate audio configuration
  if (appConfig.audio.sampleRate < 8000 || appConfig.audio.sampleRate > 48000) {
    errors.push('Invalid audio sample rate (must be between 8000 and 48000)');
  }

  if (appConfig.audio.channels < 1 || appConfig.audio.channels > 2) {
    errors.push('Invalid audio channels (must be 1 or 2)');
  }

  // Validate OpenAI configuration
  if (appConfig.openai.temperature < 0 || appConfig.openai.temperature > 2) {
    errors.push('Invalid temperature (must be between 0 and 2)');
  }

  if (appConfig.openai.maxTokens < 1 || appConfig.openai.maxTokens > 4096) {
    errors.push('Invalid maxTokens (must be between 1 and 4096)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Get environment info
export function getEnvironmentInfo() {
  return {
    mode: import.meta.env.MODE,
    dev: import.meta.env.DEV,
    prod: import.meta.env.PROD,
    baseUrl: import.meta.env.BASE_URL
  };
}

// Development helpers
export function isDevelopment(): boolean {
  return import.meta.env.DEV || appConfig.app.debugMode;
}

export function isProduction(): boolean {
  return import.meta.env.PROD && !appConfig.app.debugMode;
}

// Logging utility
export function log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any) {
  if (!isDevelopment() && level === 'debug') return;

  const logLevels = { debug: 0, info: 1, warn: 2, error: 3 };
  const configLevel = logLevels[appConfig.app.logLevel];
  const messageLevel = logLevels[level];

  if (messageLevel >= configLevel) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [Kike]`;

    switch (level) {
      case 'debug':
        console.debug(prefix, message, data);
        break;
      case 'info':
        console.info(prefix, message, data);
        break;
      case 'warn':
        console.warn(prefix, message, data);
        break;
      case 'error':
        console.error(prefix, message, data);
        break;
    }
  }
}

export default appConfig;