import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  AudioLevel,
  AudioDevice,
  AudioPermissions,
  AudioError,
  AudioChunk,
  BrowserAudioSupport
} from '@/types/audio';
import AudioService from '@/services/audioService';

interface UseAudioConfig {
  sampleRate?: number;
  channels?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  autoStart?: boolean;
  onData?: (chunk: AudioChunk) => void;
  onError?: (error: AudioError) => void;
}

interface UseAudioReturn {
  // State
  isRecording: boolean;
  hasPermission: boolean;
  isSupported: BrowserAudioSupport;
  devices: AudioDevice[];
  permissions: AudioPermissions;
  currentLevel: AudioLevel;
  error: AudioError | null;

  // Methods
  requestPermission: () => Promise<boolean>;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  getDevices: () => Promise<AudioDevice[]>;
  checkPermissions: () => Promise<AudioPermissions>;

  // Cleanup
  cleanup: () => void;

  // Error handling
  clearError: () => void;
}

export function useAudio(config: UseAudioConfig = {}): UseAudioReturn {
  // State
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [permissions, setPermissions] = useState<AudioPermissions>({
    microphone: 'prompt',
    speaker: 'granted'
  });
  const [currentLevel, setCurrentLevel] = useState<AudioLevel>({
    instant: 0,
    average: 0,
    peak: 0,
    timestamp: Date.now()
  });
  const [error, setError] = useState<AudioError | null>(null);

  // Refs
  const serviceRef = useRef<AudioService | null>(null);
  const isInitializedRef = useRef(false);

  // Browser support (static)
  const isSupported = AudioService.getBrowserSupport();

  // Initialize audio service
  useEffect(() => {
    if (!isInitializedRef.current) {
      const audioConfig = {
        sampleRate: config.sampleRate || parseInt(import.meta.env.VITE_AUDIO_SAMPLE_RATE) || 24000,
        channels: config.channels || parseInt(import.meta.env.VITE_AUDIO_CHANNELS) || 1,
        echoCancellation: config.echoCancellation ?? true,
        noiseSuppression: config.noiseSuppression ?? true,
        autoGainControl: config.autoGainControl ?? true,
        mimeType: 'audio/webm;codecs=opus',
        bitsPerSample: 16
      };

      serviceRef.current = new AudioService(audioConfig);
      setupEventHandlers();
      isInitializedRef.current = true;

      // Check initial permissions
      checkPermissions();

      // Auto-start if configured
      if (config.autoStart) {
        requestPermission();
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

    // Data handler
    service.onData((chunk: AudioChunk) => {
      config.onData?.(chunk);
    });

    // Level handler
    service.onLevel((level: AudioLevel) => {
      setCurrentLevel(level);
    });

    // Error handler
    service.onError((error: AudioError) => {
      setError(error);
      setIsRecording(false);
      setHasPermission(false);
      config.onError?.(error);
    });
  }, [config.onData, config.onError]);

  // Request microphone permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!serviceRef.current) return false;

    try {
      setError(null);
      const granted = await serviceRef.current.requestMicrophoneAccess();
      setHasPermission(granted);

      if (granted) {
        // Update permissions state
        await checkPermissions();
        // Update devices list
        await getDevices();
      }

      return granted;
    } catch (error: any) {
      const audioError: AudioError = {
        type: 'permission_denied',
        message: error.message || 'Failed to request microphone permission'
      };
      setError(audioError);
      return false;
    }
  }, []);

  // Start recording
  const startRecording = useCallback(async (): Promise<void> => {
    if (!serviceRef.current) {
      throw new Error('Audio service not initialized');
    }

    if (isRecording) {
      return; // Already recording
    }

    try {
      setError(null);

      // Ensure we have permission
      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) {
          throw new Error('Microphone permission required');
        }
      }

      await serviceRef.current.startRecording();
      setIsRecording(true);
    } catch (error: any) {
      const audioError: AudioError = {
        type: 'unknown',
        message: error.message || 'Failed to start recording'
      };
      setError(audioError);
      throw error;
    }
  }, [isRecording, hasPermission, requestPermission]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (!serviceRef.current || !isRecording) return;

    serviceRef.current.stopRecording();
    setIsRecording(false);
  }, [isRecording]);

  // Get available devices
  const getDevices = useCallback(async (): Promise<AudioDevice[]> => {
    if (!serviceRef.current) return [];

    try {
      const deviceList = await serviceRef.current.getAudioDevices();
      setDevices(deviceList);
      return deviceList;
    } catch (error) {
      console.error('Failed to get audio devices:', error);
      return [];
    }
  }, []);

  // Check permissions
  const checkPermissions = useCallback(async (): Promise<AudioPermissions> => {
    if (!serviceRef.current) {
      return { microphone: 'prompt', speaker: 'granted' };
    }

    try {
      const perms = await serviceRef.current.checkPermissions();
      setPermissions(perms);
      setHasPermission(perms.microphone === 'granted');
      return perms;
    } catch (error) {
      console.error('Failed to check permissions:', error);
      return { microphone: 'prompt', speaker: 'granted' };
    }
  }, []);

  // Cleanup
  const cleanup = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.cleanup();
      serviceRef.current = null;
    }
    setIsRecording(false);
    setHasPermission(false);
    isInitializedRef.current = false;
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Monitor permission changes
  useEffect(() => {
    const handlePermissionChange = () => {
      checkPermissions();
    };

    // Listen for permission changes
    navigator.permissions?.query({ name: 'microphone' as PermissionName })
      .then(permission => {
        permission.addEventListener('change', handlePermissionChange);
        return () => permission.removeEventListener('change', handlePermissionChange);
      })
      .catch(() => {
        // Ignore errors - some browsers don't support this
      });
  }, [checkPermissions]);

  // Monitor device changes
  useEffect(() => {
    const handleDeviceChange = () => {
      getDevices();
    };

    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [getDevices]);

  return {
    // State
    isRecording,
    hasPermission,
    isSupported,
    devices,
    permissions,
    currentLevel,
    error,

    // Methods
    requestPermission,
    startRecording,
    stopRecording,
    getDevices,
    checkPermissions,

    // Cleanup
    cleanup,

    // Error handling
    clearError
  };
}