// Audio Processing Types

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
  groupId: string;
}

export interface AudioPermissions {
  microphone: PermissionState;
  speaker: PermissionState;
}

export interface AudioRecorderConfig {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  mimeType: string;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}

export interface AudioRecording {
  id: string;
  data: Blob;
  duration: number;
  timestamp: Date;
  config: AudioRecorderConfig;
}

export interface AudioLevel {
  instant: number;
  average: number;
  peak: number;
  timestamp: number;
}

export interface AudioProcessor {
  start(): Promise<void>;
  stop(): void;
  pause(): void;
  resume(): void;
  getLevel(): AudioLevel;
  onDataAvailable: (data: ArrayBuffer) => void;
  onLevelUpdate: (level: AudioLevel) => void;
  onError: (error: Error) => void;
}

export interface SpeechRecognitionResult {
  text: string;
  confidence: number;
  isFinal: boolean;
  alternatives?: Array<{
    text: string;
    confidence: number;
  }>;
}

export interface VoiceSynthesisConfig {
  voice: SpeechSynthesisVoice;
  rate: number;
  pitch: number;
  volume: number;
  language: string;
}

export interface AudioQualityMetrics {
  snr: number; // Signal-to-noise ratio
  volume: number;
  clarity: number;
  timestamp: number;
}

export interface EchoCancellationConfig {
  enabled: boolean;
  suppressionLevel: number;
  adaptationRate: number;
}

export interface NoiseSuppressionConfig {
  enabled: boolean;
  aggressiveness: 'low' | 'medium' | 'high';
  preserveSpeech: boolean;
}

export interface AudioEffects {
  echoCancellation: EchoCancellationConfig;
  noiseSuppression: NoiseSuppressionConfig;
  autoGainControl: boolean;
  highpassFilter: boolean;
}

// Web Audio API Types Extensions
export interface AudioContextWithWorklet extends AudioContext {
  audioWorklet: AudioWorklet;
}

export interface AudioWorkletProcessorOptions {
  processorOptions?: {
    sampleRate: number;
    channels: number;
    bufferSize: number;
  };
}

// Browser Compatibility Types
export interface BrowserAudioSupport {
  mediaRecorder: boolean;
  audioWorklet: boolean;
  webRTC: boolean;
  speechRecognition: boolean;
  speechSynthesis: boolean;
  getUserMedia: boolean;
}

export interface AudioError {
  type: 'permission_denied' | 'device_not_found' | 'not_supported' | 'network_error' | 'unknown';
  message: string;
  code?: number;
  details?: any;
}

// Real-time Audio Processing Types
export interface AudioChunk {
  data: Float32Array;
  timestamp: number;
  sequenceNumber: number;
  channels: number;
  sampleRate: number;
}

export interface AudioStream {
  id: string;
  mediaStream: MediaStream;
  isActive: boolean;
  config: AudioRecorderConfig;
  onChunk: (chunk: AudioChunk) => void;
  onEnd: () => void;
  onError: (error: AudioError) => void;
}