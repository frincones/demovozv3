/**
 * useVideoCapture Hook
 * Captures audio+video from user's camera/microphone
 * Used for AV-Sync deepfake detection challenge
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { log } from '@/config/appConfig';

export interface UseVideoCaptureConfig {
  duration?: number;          // Capture duration in ms (default: 4000)
  mimeType?: string;          // Video MIME type (default: auto-detect)
  videoBitsPerSecond?: number; // Video bitrate (default: 1500000 = 1.5 Mbps)
  constraints?: MediaStreamConstraints;
}

export interface UseVideoCaptureReturn {
  // State
  stream: MediaStream | null;
  isCapturing: boolean;
  isPaused: boolean;
  countdown: number | null;
  recordedBlob: Blob | null;
  error: string | null;
  hasPermissions: boolean;

  // Methods
  requestPermissions: () => Promise<void>;
  startCapture: () => Promise<void>;
  stopCapture: () => void;
  pauseCapture: () => void;
  resumeCapture: () => void;
  resetCapture: () => void;

  // Utils
  downloadBlob: () => void;
  getVideoUrl: () => string | null;
  getBlobSize: () => number;
}

const DEFAULT_CONFIG: Required<UseVideoCaptureConfig> = {
  duration: 4000,
  mimeType: '', // Auto-detect
  videoBitsPerSecond: 1500000,
  constraints: {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      sampleRate: 24000,
    },
    video: {
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 30 },
      facingMode: 'user',
    },
  },
};

/**
 * Detect best supported MIME type
 */
function detectMimeType(): string {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      log('info', `[useVideoCapture] Using MIME type: ${type}`);
      return type;
    }
  }

  log('warn', '[useVideoCapture] No preferred MIME type supported, using default');
  return '';
}

/**
 * Sleep utility
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function useVideoCapture(
  userConfig: UseVideoCaptureConfig = {}
): UseVideoCaptureReturn {
  // Merge config
  const config = { ...DEFAULT_CONFIG, ...userConfig };

  // Auto-detect MIME type if not provided
  if (!config.mimeType) {
    config.mimeType = detectMimeType();
  }

  // State
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPermissions, setHasPermissions] = useState(false);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Request camera and microphone permissions
   */
  const requestPermissions = useCallback(async () => {
    try {
      setError(null);

      log('info', '[useVideoCapture] Requesting permissions...');

      const mediaStream = await navigator.mediaDevices.getUserMedia(
        config.constraints
      );

      setStream(mediaStream);
      setHasPermissions(true);

      log('info', '[useVideoCapture] Permissions granted', {
        audioTracks: mediaStream.getAudioTracks().length,
        videoTracks: mediaStream.getVideoTracks().length,
      });

    } catch (err: any) {
      const errorMessage = err.name === 'NotAllowedError'
        ? 'Permisos de cámara/micrófono denegados'
        : err.name === 'NotFoundError'
        ? 'No se encontró cámara o micrófono'
        : `Error de permisos: ${err.message}`;

      log('error', '[useVideoCapture] Permission error:', err);
      setError(errorMessage);
      setHasPermissions(false);
      throw new Error(errorMessage);
    }
  }, [config.constraints]);

  /**
   * Start capture with countdown
   */
  const startCapture = useCallback(async () => {
    try {
      setError(null);

      // Ensure we have permissions
      if (!stream) {
        await requestPermissions();
      }

      if (!stream) {
        throw new Error('No hay stream de medios disponible');
      }

      log('info', '[useVideoCapture] Starting countdown...');

      // Countdown: 3... 2... 1...
      for (let i = 3; i > 0; i--) {
        setCountdown(i);
        await sleep(1000);
      }
      setCountdown(null);

      log('info', '[useVideoCapture] Starting recording...', {
        mimeType: config.mimeType,
        duration: config.duration,
      });

      // Create MediaRecorder
      const options: MediaRecorderOptions = {
        mimeType: config.mimeType,
        videoBitsPerSecond: config.videoBitsPerSecond,
      };

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      // Handle data available
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
          log('debug', '[useVideoCapture] Data chunk', {
            size: event.data.size,
            totalChunks: chunksRef.current.length,
          });
        }
      };

      // Handle recording stop
      recorder.onstop = () => {
        log('info', '[useVideoCapture] Recording stopped', {
          chunks: chunksRef.current.length,
        });

        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, {
            type: config.mimeType,
          });

          setRecordedBlob(blob);

          log('info', '[useVideoCapture] Blob created', {
            size: blob.size,
            type: blob.type,
          });
        }

        setIsCapturing(false);
      };

      // Handle errors
      recorder.onerror = (event: any) => {
        log('error', '[useVideoCapture] Recorder error:', event.error);
        setError(`Error de grabación: ${event.error?.message || 'Desconocido'}`);
        setIsCapturing(false);
      };

      // Start recording
      recorder.start(100); // Collect data every 100ms
      setIsCapturing(true);

      // Auto-stop after duration
      timeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          log('info', '[useVideoCapture] Auto-stopping after duration');
          mediaRecorderRef.current.stop();
        }
      }, config.duration);

    } catch (err: any) {
      log('error', '[useVideoCapture] Capture error:', err);
      setError(err.message || 'Error iniciando captura');
      setIsCapturing(false);
      setCountdown(null);
      throw err;
    }
  }, [stream, config, requestPermissions]);

  /**
   * Stop capture manually
   */
  const stopCapture = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      log('info', '[useVideoCapture] Stopping capture manually');
      mediaRecorderRef.current.stop();
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setIsCapturing(false);
    setCountdown(null);
  }, []);

  /**
   * Pause capture
   */
  const pauseCapture = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      log('info', '[useVideoCapture] Pausing capture');
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  }, []);

  /**
   * Resume capture
   */
  const resumeCapture = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      log('info', '[useVideoCapture] Resuming capture');
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  }, []);

  /**
   * Reset everything
   */
  const resetCapture = useCallback(() => {
    log('info', '[useVideoCapture] Resetting capture');

    stopCapture();
    setRecordedBlob(null);
    setError(null);
    setCountdown(null);
    chunksRef.current = [];
  }, [stopCapture]);

  /**
   * Download recorded blob
   */
  const downloadBlob = useCallback(() => {
    if (!recordedBlob) return;

    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `video-capture-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    log('info', '[useVideoCapture] Blob downloaded');
  }, [recordedBlob]);

  /**
   * Get video URL for preview
   */
  const getVideoUrl = useCallback((): string | null => {
    if (!recordedBlob) return null;
    return URL.createObjectURL(recordedBlob);
  }, [recordedBlob]);

  /**
   * Get blob size in bytes
   */
  const getBlobSize = useCallback((): number => {
    return recordedBlob?.size || 0;
  }, [recordedBlob]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Stop all tracks
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop();
          log('debug', '[useVideoCapture] Stopped track:', track.kind);
        });
      }

      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Stop recorder
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }

      log('info', '[useVideoCapture] Cleanup complete');
    };
  }, [stream]);

  return {
    // State
    stream,
    isCapturing,
    isPaused,
    countdown,
    recordedBlob,
    error,
    hasPermissions,

    // Methods
    requestPermissions,
    startCapture,
    stopCapture,
    pauseCapture,
    resumeCapture,
    resetCapture,

    // Utils
    downloadBlob,
    getVideoUrl,
    getBlobSize,
  };
}
