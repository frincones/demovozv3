import type {
  SpeechRecognitionResult,
  VoiceSynthesisConfig,
  AudioError
} from '@/types/audio';

// Extend Window interface for browser compatibility
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

class SpeechService {
  private recognition: any = null;
  private synthesis: SpeechSynthesis;
  private isRecognizing = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private recognitionConfig = {
    continuous: true,
    interimResults: true,
    lang: 'es-ES'
  };

  // Event callbacks
  private onResultCallback?: (result: SpeechRecognitionResult) => void;
  private onErrorCallback?: (error: AudioError) => void;
  private onStartCallback?: () => void;
  private onEndCallback?: () => void;

  constructor() {
    this.synthesis = window.speechSynthesis;
    this.initializeSpeechRecognition();
  }

  // Initialize speech recognition
  private initializeSpeechRecognition(): void {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.configureSpeechRecognition();
    this.setupRecognitionEvents();
  }

  // Configure speech recognition
  private configureSpeechRecognition(): void {
    if (!this.recognition) return;

    this.recognition.continuous = this.recognitionConfig.continuous;
    this.recognition.interimResults = this.recognitionConfig.interimResults;
    this.recognition.lang = this.recognitionConfig.lang;
    this.recognition.maxAlternatives = 3;
  }

  // Setup speech recognition event listeners
  private setupRecognitionEvents(): void {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      this.isRecognizing = true;
      this.onStartCallback?.();
    };

    this.recognition.onresult = (event: any) => {
      const results = Array.from(event.results);
      const lastResult = results[results.length - 1] as any;

      if (lastResult) {
        const transcript = lastResult[0].transcript;
        const confidence = lastResult[0].confidence || 0;
        const isFinal = lastResult.isFinal;

        const result: SpeechRecognitionResult = {
          text: transcript,
          confidence,
          isFinal,
          alternatives: Array.from(lastResult).map((alt: any) => ({
            text: alt.transcript,
            confidence: alt.confidence || 0
          }))
        };

        this.onResultCallback?.(result);
      }
    };

    this.recognition.onerror = (event: any) => {
      const error: AudioError = {
        type: this.mapRecognitionError(event.error),
        message: `Speech recognition error: ${event.error}`,
        details: event
      };
      this.onErrorCallback?.(error);
    };

    this.recognition.onend = () => {
      this.isRecognizing = false;
      this.onEndCallback?.();
    };
  }

  // Map recognition errors to our error types
  private mapRecognitionError(error: string): AudioError['type'] {
    switch (error) {
      case 'not-allowed':
      case 'permission-denied':
        return 'permission_denied';
      case 'no-speech':
      case 'audio-capture':
        return 'device_not_found';
      case 'network':
        return 'network_error';
      case 'not-supported':
        return 'not_supported';
      default:
        return 'unknown';
    }
  }

  // Start speech recognition
  startRecognition(language: 'es' | 'en' = 'es'): void {
    if (!this.recognition) {
      const error: AudioError = {
        type: 'not_supported',
        message: 'Speech recognition not supported in this browser'
      };
      this.onErrorCallback?.(error);
      return;
    }

    if (this.isRecognizing) {
      this.stopRecognition();
    }

    // Set language
    this.recognition.lang = language === 'es' ? 'es-ES' : 'en-US';

    try {
      this.recognition.start();
    } catch (error) {
      const audioError: AudioError = {
        type: 'unknown',
        message: 'Failed to start speech recognition',
        details: error
      };
      this.onErrorCallback?.(audioError);
    }
  }

  // Stop speech recognition
  stopRecognition(): void {
    if (this.recognition && this.isRecognizing) {
      this.recognition.stop();
    }
  }

  // Get available voices
  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.synthesis.getVoices();
  }

  // Get voice by language and gender preference
  getVoiceByLanguage(language: 'es' | 'en', preferFemale = true): SpeechSynthesisVoice | null {
    const voices = this.getAvailableVoices();
    const langCode = language === 'es' ? 'es' : 'en';

    // Filter by language
    const languageVoices = voices.filter(voice =>
      voice.lang.toLowerCase().startsWith(langCode)
    );

    if (languageVoices.length === 0) return null;

    // Try to find preferred gender
    const femaleVoices = languageVoices.filter(voice =>
      voice.name.toLowerCase().includes('female') ||
      voice.name.toLowerCase().includes('woman') ||
      voice.name.toLowerCase().includes('maria') ||
      voice.name.toLowerCase().includes('sofia') ||
      voice.name.toLowerCase().includes('sara')
    );

    const maleVoices = languageVoices.filter(voice =>
      voice.name.toLowerCase().includes('male') ||
      voice.name.toLowerCase().includes('man') ||
      voice.name.toLowerCase().includes('carlos') ||
      voice.name.toLowerCase().includes('diego')
    );

    if (preferFemale && femaleVoices.length > 0) {
      return femaleVoices[0];
    } else if (!preferFemale && maleVoices.length > 0) {
      return maleVoices[0];
    }

    // Return first available voice for the language
    return languageVoices[0];
  }

  // Speak text
  speak(text: string, config?: Partial<VoiceSynthesisConfig>): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Stop any current speech
      this.stopSpeaking();

      const utterance = new SpeechSynthesisUtterance(text);

      // Apply configuration
      if (config?.voice) {
        utterance.voice = config.voice;
      } else {
        // Use default voice based on language
        const defaultVoice = this.getVoiceByLanguage(
          config?.language === 'en-US' ? 'en' : 'es',
          true
        );
        if (defaultVoice) utterance.voice = defaultVoice;
      }

      utterance.rate = config?.rate || 1.0;
      utterance.pitch = config?.pitch || 1.0;
      utterance.volume = config?.volume || 1.0;
      utterance.lang = config?.language || 'es-ES';

      // Event handlers
      utterance.onend = () => {
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = (event) => {
        this.currentUtterance = null;
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      this.currentUtterance = utterance;
      this.synthesis.speak(utterance);
    });
  }

  // Stop current speech
  stopSpeaking(): void {
    if (this.synthesis.speaking) {
      this.synthesis.cancel();
    }
    this.currentUtterance = null;
  }

  // Pause current speech
  pauseSpeaking(): void {
    if (this.synthesis.speaking && !this.synthesis.paused) {
      this.synthesis.pause();
    }
  }

  // Resume paused speech
  resumeSpeaking(): void {
    if (this.synthesis.paused) {
      this.synthesis.resume();
    }
  }

  // Update recognition language
  setRecognitionLanguage(language: 'es' | 'en'): void {
    this.recognitionConfig.lang = language === 'es' ? 'es-ES' : 'en-US';
    if (this.recognition) {
      this.recognition.lang = this.recognitionConfig.lang;
    }
  }

  // Event handlers
  onRecognitionResult(callback: (result: SpeechRecognitionResult) => void): void {
    this.onResultCallback = callback;
  }

  onRecognitionError(callback: (error: AudioError) => void): void {
    this.onErrorCallback = callback;
  }

  onRecognitionStart(callback: () => void): void {
    this.onStartCallback = callback;
  }

  onRecognitionEnd(callback: () => void): void {
    this.onEndCallback = callback;
  }

  // Getters
  get isSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition) &&
           !!window.speechSynthesis;
  }

  get recognitionSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  get synthesisSupported(): boolean {
    return !!window.speechSynthesis;
  }

  get recognizing(): boolean {
    return this.isRecognizing;
  }

  get speaking(): boolean {
    return this.synthesis ? this.synthesis.speaking : false;
  }

  get paused(): boolean {
    return this.synthesis ? this.synthesis.paused : false;
  }

  // Cleanup
  cleanup(): void {
    this.stopRecognition();
    this.stopSpeaking();
    this.onResultCallback = undefined;
    this.onErrorCallback = undefined;
    this.onStartCallback = undefined;
    this.onEndCallback = undefined;
  }
}

export default SpeechService;