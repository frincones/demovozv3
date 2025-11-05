/**
 * useMediaPipeLiveness Hook
 * Custom hook for MediaPipe-based facial liveness detection
 * Implements real-time detection of:
 * - Eye blinks (using Eye Aspect Ratio)
 * - Head movements (turn left, turn right, look up, nod)
 * - Smile detection (using blendshapes)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { FilesetResolver, FaceLandmarker, FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import { log } from '@/config/appConfig';

// Challenge types that can be detected
export type ChallengeType = 'blink_twice' | 'turn_left' | 'turn_right' | 'smile' | 'look_up' | 'nod';

interface UseMediaPipeLivenessOptions {
  challengeType: ChallengeType;
  videoElement: HTMLVideoElement | null;
  enabled: boolean;
  onChallengeComplete?: () => void;
  onProgress?: (progress: number) => void;
  stream: MediaStream | null; // Add stream to detect when video is ready
}

interface FaceLandmarks {
  landmarks: Array<{ x: number; y: number; z: number }>;
  blendshapes?: Array<{ categoryName: string; score: number }>;
}

// Eye landmarks indices for MediaPipe Face Landmarker
const LEFT_EYE_INDICES = {
  left: 263,
  right: 362,
  top: 386,
  bottom: 374,
};

const RIGHT_EYE_INDICES = {
  left: 133,
  right: 33,
  top: 159,
  bottom: 145,
};

// Thresholds for detection - OPTIMIZED for fast and consistent detection
const THRESHOLDS = {
  EAR_BLINK: 0.22, // Eye Aspect Ratio threshold for blink detection (WORKS GREAT - KEEP THIS!)
  HEAD_TURN_LEFT: -0.03, // Rotation threshold for left turn (less sensitive - requires clearer movement)
  HEAD_TURN_RIGHT: 0.03, // Rotation threshold for right turn (less sensitive - requires clearer movement)
  HEAD_LOOK_UP: -0.025, // Pitch threshold for looking up (less sensitive - requires clearer movement)
  HEAD_NOD_DOWN: 0.02, // Pitch threshold for nodding down (phase 1: tilt head down)
  HEAD_NOD_UP: -0.01, // Pitch threshold for nodding up (phase 2: return head to neutral/up position)
  SMILE: 0.15, // Smile intensity threshold (INCREASED from 0.08 for faster detection like blink)
};

export const useMediaPipeLiveness = ({
  challengeType,
  videoElement,
  enabled,
  onChallengeComplete,
  onProgress,
  stream,
}: UseMediaPipeLivenessOptions) => {
  const [isReady, setIsReady] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState<string>('Inicializando...');
  const [progress, setProgress] = useState(0);

  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef(-1);

  // Detection state refs
  const blinkCountRef = useRef(0);
  const wasEyeClosedRef = useRef(false);
  const headTurnDetectedRef = useRef(false);
  const smileDetectedRef = useRef(false);
  const lookUpDetectedRef = useRef(false);
  const nodStartedRef = useRef(false);
  const nodCompletedRef = useRef(false);

  /**
   * Initialize MediaPipe Face Landmarker
   */
  const initializeMediaPipe = useCallback(async () => {
    try {
      log('info', '[MediaPipe] Initializing Face Landmarker...');
      const startTime = performance.now();
      setDetectionStatus('Inicializando...');

      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      log('info', '[MediaPipe] Vision tasks loaded');

      setDetectionStatus('Cargando modelo...');
      const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        minFaceDetectionConfidence: 0.3, // Reduced from 0.5 for faster initial detection
        minFacePresenceConfidence: 0.3, // Reduced from 0.5 for faster initial detection
        minTrackingConfidence: 0.3, // Reduced from 0.5 for faster tracking
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
      });

      const loadTime = ((performance.now() - startTime) / 1000).toFixed(2);
      faceLandmarkerRef.current = faceLandmarker;
      setIsReady(true);
      setDetectionStatus('Listo para detectar');
      log('info', `[MediaPipe] Face Landmarker initialized successfully in ${loadTime}s`);
    } catch (error) {
      log('error', '[MediaPipe] Initialization failed:', error);
      setDetectionStatus('Error al cargar el modelo');
    }
  }, []);

  /**
   * Calculate Eye Aspect Ratio (EAR) for blink detection
   */
  const calculateEAR = (eyeIndices: typeof LEFT_EYE_INDICES, landmarks: FaceLandmarks['landmarks']): number => {
    const left = landmarks[eyeIndices.left];
    const right = landmarks[eyeIndices.right];
    const top = landmarks[eyeIndices.top];
    const bottom = landmarks[eyeIndices.bottom];

    if (!left || !right || !top || !bottom) return 0;

    // Calculate Euclidean distances
    const horizontalDist = Math.sqrt(
      Math.pow(right.x - left.x, 2) +
      Math.pow(right.y - left.y, 2)
    );

    const verticalDist = Math.sqrt(
      Math.pow(top.x - bottom.x, 2) +
      Math.pow(top.y - bottom.y, 2)
    );

    // EAR = vertical distance / horizontal distance
    return verticalDist / (2 * horizontalDist);
  };

  /**
   * Detect blink from face landmarks
   */
  const detectBlink = (landmarks: FaceLandmarks['landmarks']): boolean => {
    const leftEAR = calculateEAR(LEFT_EYE_INDICES, landmarks);
    const rightEAR = calculateEAR(RIGHT_EYE_INDICES, landmarks);
    const avgEAR = (leftEAR + rightEAR) / 2;

    // Eye is closed when EAR is below threshold
    const isEyeClosed = avgEAR < THRESHOLDS.EAR_BLINK;

    // Detect blink: transition from closed to open
    if (!wasEyeClosedRef.current && isEyeClosed) {
      wasEyeClosedRef.current = true;
    } else if (wasEyeClosedRef.current && !isEyeClosed) {
      wasEyeClosedRef.current = false;
      blinkCountRef.current += 1;
      log('info', `[MediaPipe] Blink detected! Count: ${blinkCountRef.current}`);
      return true;
    }

    return false;
  };

  /**
   * Estimate head rotation from facial transformation matrix
   */
  const estimateHeadRotation = (landmarks: FaceLandmarks['landmarks']): { yaw: number; pitch: number } => {
    // Simplified rotation estimation using nose and face geometry
    // Using landmarks: nose tip (1), left eye (33), right eye (263)
    const noseTip = landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];

    if (!noseTip || !leftEye || !rightEye) {
      return { yaw: 0, pitch: 0 };
    }

    // Calculate face center
    const faceCenterX = (leftEye.x + rightEye.x) / 2;

    // Yaw (left-right rotation): displacement of nose from face center
    // INVERTED: Negative sign to match user's perspective in selfie camera
    // When user turns right, nose moves left in image (negative), so we invert
    const yaw = -(noseTip.x - faceCenterX);

    // Pitch (up-down rotation): using z-coordinate of nose
    const pitch = noseTip.z;

    return { yaw, pitch };
  };

  /**
   * Detect smile from blendshapes
   */
  const detectSmile = (blendshapes?: FaceLandmarks['blendshapes']): boolean => {
    if (!blendshapes) return false;

    const mouthSmileLeft = blendshapes.find(b => b.categoryName === 'mouthSmileLeft');
    const mouthSmileRight = blendshapes.find(b => b.categoryName === 'mouthSmileRight');

    if (!mouthSmileLeft || !mouthSmileRight) return false;

    const avgSmile = (mouthSmileLeft.score + mouthSmileRight.score) / 2;
    return avgSmile > THRESHOLDS.SMILE;
  };

  /**
   * Process detected results based on challenge type
   */
  const processDetection = (result: FaceLandmarkerResult) => {
    if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
      setDetectionStatus('No se detectó rostro');
      log('warn', '[MediaPipe] ⚠️ NO FACE DETECTED - faceLandmarks:', result.faceLandmarks?.length || 0);
      return;
    }

    const landmarks = result.faceLandmarks[0];
    const blendshapes = result.faceBlendshapes?.[0]?.categories;

    log('info', `[MediaPipe] ✓ Face detected! Challenge: ${challengeType}`);

    switch (challengeType) {
      case 'blink_twice': {
        detectBlink(landmarks);
        const remaining = 2 - blinkCountRef.current;
        setDetectionStatus(remaining > 0 ? `Parpadea ${remaining} vez${remaining > 1 ? 'es' : ''} más` : '✅ ¡Perfecto!');
        const currentProgress = Math.min((blinkCountRef.current / 2) * 100, 100);
        setProgress(currentProgress);
        onProgress?.(currentProgress);

        if (blinkCountRef.current >= 2 && !headTurnDetectedRef.current) {
          headTurnDetectedRef.current = true;
          setTimeout(() => {
            onChallengeComplete?.();
          }, 300);
        }
        break;
      }

      case 'turn_left': {
        const { yaw } = estimateHeadRotation(landmarks);
        // Always log to debug
        log('info', `[MediaPipe] turn_left - yaw: ${yaw.toFixed(4)}, threshold: ${THRESHOLDS.HEAD_TURN_LEFT}, pass: ${(yaw < THRESHOLDS.HEAD_TURN_LEFT)}`);

        if (yaw < THRESHOLDS.HEAD_TURN_LEFT && !headTurnDetectedRef.current) {
          headTurnDetectedRef.current = true;
          log('info', `[MediaPipe] ✅ turn_left COMPLETED with yaw: ${yaw.toFixed(4)}`);
          setDetectionStatus('✅ ¡Perfecto!');
          setProgress(100);
          onProgress?.(100);
          setTimeout(() => {
            onChallengeComplete?.();
          }, 300);
        } else {
          setDetectionStatus('Gira tu cabeza hacia la izquierda');
          const currentProgress = Math.min(Math.abs(yaw / THRESHOLDS.HEAD_TURN_LEFT) * 100, 90);
          setProgress(currentProgress);
          onProgress?.(currentProgress);
        }
        break;
      }

      case 'turn_right': {
        const { yaw } = estimateHeadRotation(landmarks);
        // Always log to debug
        log('info', `[MediaPipe] turn_right - yaw: ${yaw.toFixed(4)}, threshold: ${THRESHOLDS.HEAD_TURN_RIGHT}, pass: ${(yaw > THRESHOLDS.HEAD_TURN_RIGHT)}`);

        if (yaw > THRESHOLDS.HEAD_TURN_RIGHT && !headTurnDetectedRef.current) {
          headTurnDetectedRef.current = true;
          log('info', `[MediaPipe] ✅ turn_right COMPLETED with yaw: ${yaw.toFixed(4)}`);
          setDetectionStatus('✅ ¡Perfecto!');
          setProgress(100);
          onProgress?.(100);
          setTimeout(() => {
            onChallengeComplete?.();
          }, 300);
        } else {
          setDetectionStatus('Gira tu cabeza hacia la derecha');
          const currentProgress = Math.min((yaw / THRESHOLDS.HEAD_TURN_RIGHT) * 100, 90);
          setProgress(currentProgress);
          onProgress?.(currentProgress);
        }
        break;
      }

      case 'smile': {
        const mouthSmileLeft = blendshapes?.find(b => b.categoryName === 'mouthSmileLeft');
        const mouthSmileRight = blendshapes?.find(b => b.categoryName === 'mouthSmileRight');
        const avgSmile = mouthSmileLeft && mouthSmileRight ? (mouthSmileLeft.score + mouthSmileRight.score) / 2 : 0;

        // Always log to debug
        log('info', `[MediaPipe] smile - avgSmile: ${avgSmile.toFixed(4)}, threshold: ${THRESHOLDS.SMILE}, pass: ${(avgSmile > THRESHOLDS.SMILE)}`);

        if (detectSmile(blendshapes) && !smileDetectedRef.current) {
          smileDetectedRef.current = true;
          log('info', `[MediaPipe] ✅ smile COMPLETED with avgSmile: ${avgSmile.toFixed(4)}`);
          setDetectionStatus('✅ ¡Perfecto!');
          setProgress(100);
          onProgress?.(100);
          setTimeout(() => {
            onChallengeComplete?.();
          }, 300);
        } else {
          setDetectionStatus('Sonríe naturalmente');
          if (mouthSmileLeft && mouthSmileRight) {
            const currentProgress = Math.min((avgSmile / THRESHOLDS.SMILE) * 100, 90);
            setProgress(currentProgress);
            onProgress?.(currentProgress);
          }
        }
        break;
      }

      case 'look_up': {
        const { pitch } = estimateHeadRotation(landmarks);
        // Always log to debug
        log('info', `[MediaPipe] look_up - pitch: ${pitch.toFixed(4)}, threshold: ${THRESHOLDS.HEAD_LOOK_UP}, pass: ${(pitch < THRESHOLDS.HEAD_LOOK_UP)}`);

        if (pitch < THRESHOLDS.HEAD_LOOK_UP && !lookUpDetectedRef.current) {
          lookUpDetectedRef.current = true;
          log('info', `[MediaPipe] ✅ look_up COMPLETED with pitch: ${pitch.toFixed(4)}`);
          setDetectionStatus('✅ ¡Perfecto!');
          setProgress(100);
          onProgress?.(100);
          setTimeout(() => {
            onChallengeComplete?.();
          }, 300);
        } else {
          setDetectionStatus('Mira hacia arriba');
          const currentProgress = Math.min(Math.abs(pitch / THRESHOLDS.HEAD_LOOK_UP) * 100, 90);
          setProgress(currentProgress);
          onProgress?.(currentProgress);
        }
        break;
      }

      case 'nod': {
        const { pitch } = estimateHeadRotation(landmarks);

        // Always log to debug
        log('info', `[MediaPipe] nod - pitch: ${pitch.toFixed(4)}, phase: ${nodStartedRef.current ? '2 (up)' : '1 (down)'}, down_threshold: ${THRESHOLDS.HEAD_NOD_DOWN}, up_threshold: ${THRESHOLDS.HEAD_NOD_UP}`);

        // Two-phase detection: down then up
        if (!nodStartedRef.current && pitch > THRESHOLDS.HEAD_NOD_DOWN) {
          // Phase 1 completed: head tilted down
          nodStartedRef.current = true;
          log('info', `[MediaPipe] ✅ nod PHASE 1 completed (head down) with pitch: ${pitch.toFixed(4)}`);
          setDetectionStatus('¡Bien! Ahora levanta la cabeza');
          setProgress(50);
          onProgress?.(50);
        } else if (nodStartedRef.current && pitch < THRESHOLDS.HEAD_NOD_UP && !nodCompletedRef.current) {
          // Phase 2 completed: head returned to neutral/up
          nodCompletedRef.current = true;
          log('info', `[MediaPipe] ✅ nod PHASE 2 completed (head up) with pitch: ${pitch.toFixed(4)}`);
          setDetectionStatus('✅ ¡Perfecto!');
          setProgress(100);
          onProgress?.(100);
          setTimeout(() => {
            onChallengeComplete?.();
          }, 300);
        } else if (!nodStartedRef.current) {
          // Still waiting for phase 1
          setDetectionStatus('Baja la cabeza (asiente)');
          const currentProgress = Math.min((pitch / THRESHOLDS.HEAD_NOD_DOWN) * 100, 45);
          setProgress(currentProgress);
          onProgress?.(currentProgress);
        } else if (nodStartedRef.current && !nodCompletedRef.current) {
          // Waiting for phase 2
          setDetectionStatus('Ahora levanta la cabeza');
          const upProgress = Math.min(50 + Math.abs(pitch / THRESHOLDS.HEAD_NOD_UP) * 50, 90);
          setProgress(upProgress);
          onProgress?.(upProgress);
        }
        break;
      }
    }
  };

  /**
   * Detect landmarks from video frame
   */
  const detectLandmarks = useCallback(() => {
    if (!faceLandmarkerRef.current || !videoElement || !enabled) {
      return;
    }

    const video = videoElement;

    // Skip if video hasn't advanced
    if (video.currentTime === lastVideoTimeRef.current) {
      animationFrameRef.current = requestAnimationFrame(detectLandmarks);
      return;
    }
    lastVideoTimeRef.current = video.currentTime;

    // Detect face landmarks
    const startTime = performance.now();
    const result = faceLandmarkerRef.current.detectForVideo(video, startTime);

    // Process detection results
    processDetection(result);

    // Continue detection loop
    animationFrameRef.current = requestAnimationFrame(detectLandmarks);
  }, [videoElement, enabled, challengeType, onChallengeComplete, onProgress]);

  /**
   * Start detection
   */
  const startDetection = useCallback(() => {
    if (!isReady || !videoElement || !enabled) {
      log('warn', '[MediaPipe] Cannot start detection - not ready');
      return;
    }

    log('info', '[MediaPipe] Starting detection for:', challengeType);
    setIsDetecting(true);

    // Reset detection state
    blinkCountRef.current = 0;
    wasEyeClosedRef.current = false;
    headTurnDetectedRef.current = false;
    smileDetectedRef.current = false;
    lookUpDetectedRef.current = false;
    nodStartedRef.current = false;
    nodCompletedRef.current = false;
    setProgress(0);

    // Start detection loop
    detectLandmarks();
  }, [isReady, videoElement, enabled, challengeType, detectLandmarks]);

  /**
   * Stop detection
   */
  const stopDetection = useCallback(() => {
    log('info', '[MediaPipe] Stopping detection');
    setIsDetecting(false);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  /**
   * Reset detection state
   */
  const resetDetection = useCallback(() => {
    log('info', '[MediaPipe] Resetting detection');
    stopDetection();
    blinkCountRef.current = 0;
    wasEyeClosedRef.current = false;
    headTurnDetectedRef.current = false;
    smileDetectedRef.current = false;
    lookUpDetectedRef.current = false;
    nodStartedRef.current = false;
    nodCompletedRef.current = false;
    lastVideoTimeRef.current = -1; // Reset video time tracking
    setProgress(0);
    setDetectionStatus('Listo para detectar');
  }, [stopDetection]);

  // Initialize on mount
  useEffect(() => {
    initializeMediaPipe();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
      }
    };
  }, [initializeMediaPipe]);

  // Auto-start detection when enabled and video/stream are available
  useEffect(() => {
    if (enabled && isReady && videoElement && stream && !isDetecting) {
      // Minimal delay to ensure video element is fully initialized (reduced from 500ms to 100ms)
      const timer = setTimeout(() => {
        if (videoElement && stream) {
          startDetection();
        }
      }, 100);
      return () => clearTimeout(timer);
    } else if (!enabled && isDetecting) {
      stopDetection();
    }
  }, [enabled, isReady, videoElement, stream, isDetecting, startDetection, stopDetection]);

  // Cleanup when disabled - reset everything for next use
  useEffect(() => {
    if (!enabled) {
      // Reset all detection state when disabled
      blinkCountRef.current = 0;
      wasEyeClosedRef.current = false;
      headTurnDetectedRef.current = false;
      smileDetectedRef.current = false;
      lookUpDetectedRef.current = false;
      nodStartedRef.current = false;
      nodCompletedRef.current = false;
      lastVideoTimeRef.current = -1;
      setProgress(0);
    }
  }, [enabled]);

  return {
    isReady,
    isDetecting,
    detectionStatus,
    progress,
    startDetection,
    stopDetection,
    resetDetection,
  };
};
