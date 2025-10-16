import type {
  AudioRecorderConfig,
  AudioLevel,
  AudioDevice,
  AudioPermissions,
  AudioError,
  AudioChunk,
  BrowserAudioSupport
} from '@/types/audio';

class AudioService {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private isRecording = false;
  private config: AudioRecorderConfig;
  private onDataCallback?: (chunk: AudioChunk) => void;
  private onLevelCallback?: (level: AudioLevel) => void;
  private onErrorCallback?: (error: AudioError) => void;

  constructor(config?: Partial<AudioRecorderConfig>) {
    this.config = {
      sampleRate: 24000,
      channels: 1,
      bitsPerSample: 16,
      mimeType: 'audio/webm;codecs=opus',
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      ...config
    };
  }

  // Check browser support
  static getBrowserSupport(): BrowserAudioSupport {
    return {
      mediaRecorder: typeof MediaRecorder !== 'undefined',
      audioWorklet: typeof AudioWorklet !== 'undefined',
      webRTC: typeof RTCPeerConnection !== 'undefined',
      speechRecognition: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
      speechSynthesis: 'speechSynthesis' in window,
      getUserMedia: navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function'
    };
  }

  // Get available audio devices
  async getAudioDevices(): Promise<AudioDevice[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter(device => device.kind === 'audioinput' || device.kind === 'audiooutput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label,
          kind: device.kind as 'audioinput' | 'audiooutput',
          groupId: device.groupId
        }));
    } catch (error) {
      console.error('Error getting audio devices:', error);
      return [];
    }
  }

  // Check audio permissions
  async checkPermissions(): Promise<AudioPermissions> {
    try {
      const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return {
        microphone: micPermission.state,
        speaker: 'granted' as PermissionState // Speaker doesn't require permission
      };
    } catch (error) {
      console.error('Error checking permissions:', error);
      return {
        microphone: 'prompt' as PermissionState,
        speaker: 'granted' as PermissionState
      };
    }
  }

  // Request microphone access
  async requestMicrophoneAccess(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channels,
          echoCancellation: this.config.echoCancellation,
          noiseSuppression: this.config.noiseSuppression,
          autoGainControl: this.config.autoGainControl
        }
      });

      this.mediaStream = stream;
      return true;
    } catch (error) {
      const audioError: AudioError = {
        type: 'permission_denied',
        message: 'Microphone access denied',
        details: error
      };
      this.onErrorCallback?.(audioError);
      return false;
    }
  }

  // Initialize audio context and analyser
  private async initializeAudioContext(): Promise<void> {
    if (!this.mediaStream) {
      throw new Error('No media stream available');
    }

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: this.config.sampleRate
    });

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;

    this.microphone = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.microphone.connect(this.analyser);
  }

  // Get current audio level
  getAudioLevel(): AudioLevel {
    if (!this.analyser) {
      return { instant: 0, average: 0, peak: 0, timestamp: Date.now() };
    }

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    let peak = 0;
    for (let i = 0; i < bufferLength; i++) {
      const value = dataArray[i];
      sum += value;
      if (value > peak) peak = value;
    }

    const average = sum / bufferLength;
    const instant = dataArray[0];

    return {
      instant: instant / 255,
      average: average / 255,
      peak: peak / 255,
      timestamp: Date.now()
    };
  }

  // Start recording
  async startRecording(): Promise<void> {
    try {
      if (!this.mediaStream) {
        const hasAccess = await this.requestMicrophoneAccess();
        if (!hasAccess) {
          throw new Error('Microphone access required');
        }
      }

      await this.initializeAudioContext();

      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.mediaStream!, {
        mimeType: this.config.mimeType
      });

      // Handle data available
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && this.onDataCallback) {
          // Convert blob to ArrayBuffer for processing
          event.data.arrayBuffer().then(buffer => {
            // Ensure the buffer size is a multiple of 4 for Float32Array
            const alignedSize = Math.floor(buffer.byteLength / 4) * 4;
            const alignedBuffer = buffer.slice(0, alignedSize);

            const chunk: AudioChunk = {
              data: new Float32Array(alignedBuffer),
              timestamp: Date.now(),
              sequenceNumber: Math.floor(Date.now() / 1000),
              channels: this.config.channels,
              sampleRate: this.config.sampleRate
            };
            this.onDataCallback?.(chunk);
          });
        }
      };

      // Start recording
      this.mediaRecorder.start(100); // Collect data every 100ms
      this.isRecording = true;

      // Start level monitoring
      this.startLevelMonitoring();

    } catch (error) {
      const audioError: AudioError = {
        type: 'unknown',
        message: 'Failed to start recording',
        details: error
      };
      this.onErrorCallback?.(audioError);
      throw error;
    }
  }

  // Stop recording
  stopRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
    }

    this.stopLevelMonitoring();
  }

  // Start level monitoring
  private startLevelMonitoring(): void {
    const monitor = () => {
      if (this.isRecording && this.onLevelCallback) {
        const level = this.getAudioLevel();
        this.onLevelCallback(level);
      }

      if (this.isRecording) {
        requestAnimationFrame(monitor);
      }
    };
    requestAnimationFrame(monitor);
  }

  // Stop level monitoring
  private stopLevelMonitoring(): void {
    // Level monitoring will stop automatically when isRecording becomes false
  }

  // Clean up resources
  cleanup(): void {
    this.stopRecording();

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.microphone = null;
    this.mediaRecorder = null;
  }

  // Event handlers
  onData(callback: (chunk: AudioChunk) => void): void {
    this.onDataCallback = callback;
  }

  onLevel(callback: (level: AudioLevel) => void): void {
    this.onLevelCallback = callback;
  }

  onError(callback: (error: AudioError) => void): void {
    this.onErrorCallback = callback;
  }

  // Getters
  get recording(): boolean {
    return this.isRecording;
  }

  get hasStream(): boolean {
    return this.mediaStream !== null;
  }

  get configuration(): AudioRecorderConfig {
    return { ...this.config };
  }
}

export default AudioService;