/**
 * LivenessDetectionModal Component
 * Minimalista modal para validación de liveness usando MediaPipe
 * 2 movimientos faciales consecutivos para validar identidad
 */

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Info, X, Eye, CheckCircle } from 'lucide-react';
import { useMediaPipeLiveness, type ChallengeType } from '@/hooks/useMediaPipeLiveness';
import { log } from '@/config/appConfig';

type ChallengeState =
  | 'instructions'    // Show instructions
  | 'permissions'     // Requesting permissions
  | 'ready'          // Ready to start first challenge
  | 'detecting'      // Detecting with MediaPipe
  | 'challenge_passed' // Challenge completed - show success feedback
  | 'success';       // Validation successful

interface AVSyncChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (result: any) => void;
  challengePhrase?: string;
  sessionId: string;
  onStateChange?: (state: ChallengeState, challengeInfo?: {index: number, total: number, instruction: string}) => void;
}

// Liveness challenges - Only 4 active challenges for optimal UX
const LIVENESS_CHALLENGES = [
  {
    id: 'blink_twice',
    instruction: 'Parpadea 2 veces',
    description: 'Cierra y abre los ojos dos veces',
    icon: '👁️',
  },
  {
    id: 'turn_left',
    instruction: 'Gira tu cabeza a la izquierda',
    description: 'Gira tu rostro lentamente hacia la izquierda',
    icon: '⬅️',
  },
  {
    id: 'turn_right',
    instruction: 'Gira tu cabeza a la derecha',
    description: 'Gira tu rostro lentamente hacia la derecha',
    icon: '➡️',
  },
  {
    id: 'smile',
    instruction: 'Sonríe',
    description: 'Muestra una sonrisa natural',
    icon: '😊',
  },
];

export const AVSyncChallengeModal: React.FC<AVSyncChallengeModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  sessionId,
  onStateChange,
}) => {
  // State
  const [state, setState] = useState<ChallengeState>('instructions');
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [challenges, setChallenges] = useState<typeof LIVENESS_CHALLENGES>([]);
  const [completedChallenges, setCompletedChallenges] = useState<number>(0);
  const [userConsent, setUserConsent] = useState(false);
  const [mediaPipeProgress, setMediaPipeProgress] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  // Refs
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  // Current challenge
  const currentChallenge = challenges[currentChallengeIndex];

  // MediaPipe liveness detection hook
  const {
    isReady: mediaPipeReady,
    detectionStatus: mediaPipeStatus,
    resetDetection: resetMediaPipeDetection,
  } = useMediaPipeLiveness({
    challengeType: currentChallenge?.id as ChallengeType,
    videoElement: videoElementRef.current,
    stream: stream,
    enabled: state === 'detecting',
    onChallengeComplete: handleChallengeComplete,
    onProgress: (progress) => {
      setMediaPipeProgress(progress);
    },
  });

  // Handle challenge complete
  function handleChallengeComplete() {
    log('info', '[LivenessDetection] Challenge', currentChallengeIndex + 1, 'completed!');

    const newCompleted = completedChallenges + 1;
    setCompletedChallenges(newCompleted);

    // Show "challenge passed" feedback
    setState('challenge_passed');

    if (newCompleted >= 2) {
      // All challenges completed!
      log('info', '[LivenessDetection] ✅ Validation successful!');

      // Show success feedback for 1.5 seconds, then auto-close
      setTimeout(() => {
        setState('success');
        setTimeout(() => {
          onComplete({ decision: 'ALLOW', score: 1.0 });
          onClose();
        }, 2000);
      }, 1500);
    } else {
      // Show success feedback for 1.5 seconds, then move to next challenge
      setTimeout(() => {
        setCurrentChallengeIndex(1);
        setMediaPipeProgress(0);
        resetMediaPipeDetection();
        setState('ready');
        log('info', '[LivenessDetection] Moving to challenge 2');
      }, 1500);
    }
  }

  // Reset when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      // Reset state when opening
      setState('instructions');
      setUserConsent(false);
      setMediaPipeProgress(0);
      setCurrentChallengeIndex(0);
      setCompletedChallenges(0);
      setCaptureError(null);

      // Stop any existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }

      // Select 2 random challenges for security
      const shuffled = [...LIVENESS_CHALLENGES].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, 2);
      setChallenges(selected);

      log('info', '[LivenessDetection] Challenges selected:', selected.map(c => c.id));
    } else {
      // Complete cleanup when closing
      if (stream) {
        log('info', '[LivenessDetection] Cleaning up stream on modal close');
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }

      // Clean video element
      if (videoElementRef.current) {
        videoElementRef.current.srcObject = null;
        videoElementRef.current.pause();
      }

      // Reset all state
      setState('instructions');
      setUserConsent(false);
      setMediaPipeProgress(0);
      setCurrentChallengeIndex(0);
      setCompletedChallenges(0);
      setHasPermissions(false);
      setCaptureError(null);
    }
  }, [isOpen]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Attach stream to video element whenever stream or state changes
  useEffect(() => {
    if (videoElementRef.current && stream) {
      videoElementRef.current.srcObject = stream;
      videoElementRef.current.play().catch(e => {
        log('error', '[LivenessDetection] Error playing video:', e);
      });
      log('info', '[LivenessDetection] Stream attached to video element, state:', state);
    }
  }, [stream, state]);

  // Notify agent of state changes - ONLY for key moments
  useEffect(() => {
    console.log('[LivenessDetection] State effect triggered - State:', state, 'ChallengeIndex:', currentChallengeIndex, 'CompletedChallenges:', completedChallenges);

    if (!onStateChange || !currentChallenge) {
      console.log('[LivenessDetection] No onStateChange or currentChallenge, skipping');
      return;
    }

    // Only notify in critical states to avoid repetition:
    // 1. 'ready' - Only for first challenge (index 0)
    // 2. 'challenge_passed' - Only when completing the LAST challenge
    // 3. 'success' - Final success state

    const shouldNotify =
      (state === 'ready' && currentChallengeIndex === 0) ||
      (state === 'challenge_passed' && completedChallenges >= 2) ||
      state === 'success';

    console.log('[LivenessDetection] ShouldNotify:', shouldNotify, 'Conditions:', {
      readyAndFirstChallenge: state === 'ready' && currentChallengeIndex === 0,
      challengePassedAndAllComplete: state === 'challenge_passed' && completedChallenges >= 2,
      isSuccess: state === 'success'
    });

    if (shouldNotify) {
      console.log('[LivenessDetection] 🔔 Notifying agent - State:', state);
      onStateChange(state, {
        index: currentChallengeIndex,
        total: challenges.length,
        instruction: currentChallenge.instruction
      });
      log('info', '[LivenessDetection] State changed, notifying agent:', state);
    } else {
      console.log('[LivenessDetection] Not notifying agent for state:', state);
    }
  }, [state, currentChallengeIndex, completedChallenges, onStateChange]);

  // Handle permissions request
  const handleRequestPermissions = async () => {
    try {
      setState('permissions');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });
      setStream(mediaStream);
      setHasPermissions(true);
      setState('ready');
      log('info', '[LivenessDetection] Permissions granted');
    } catch (error: any) {
      log('error', '[LivenessDetection] Permission error:', error);
      setCaptureError('No se pudo acceder a la cámara');
      setState('instructions');
    }
  };

  // Handle start detection
  const handleStartDetection = () => {
    setState('detecting');
    log('info', '[LivenessDetection] Starting challenge:', currentChallenge.id);
  };

  // Handle close
  const handleClose = () => {
    // Don't allow closing during active detection (prevents accidental closes)
    if (state === 'detecting' || state === 'challenge_passed') return;

    // Stop stream if active
    if (stream) {
      log('info', '[LivenessDetection] Stopping stream on close');
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    // Clean video element
    if (videoElementRef.current) {
      videoElementRef.current.srcObject = null;
      videoElementRef.current.pause();
    }

    // Notify parent to close
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-600" />
            <span>Verificación de Identidad</span>
            {state !== 'detecting' && state !== 'challenge_passed' && state !== 'success' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="ml-auto h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instructions State */}
          {state === 'instructions' && currentChallenge && (
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Para validar tu identidad, realiza 2 movimientos faciales sencillos.
                </AlertDescription>
              </Alert>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-6">
                <div className="text-center space-y-3">
                  <div className="text-6xl">{challenges[0]?.icon} {challenges[1]?.icon}</div>
                  <h3 className="font-bold text-lg text-blue-900">
                    Movimientos a realizar:
                  </h3>
                  <div className="space-y-2">
                    <p className="text-base font-medium text-indigo-700">
                      1. {challenges[0]?.instruction}
                    </p>
                    <p className="text-base font-medium text-indigo-700">
                      2. {challenges[1]?.instruction}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="consent"
                  checked={userConsent}
                  onChange={(e) => setUserConsent(e.target.checked)}
                  className="mt-1"
                />
                <label htmlFor="consent" className="text-sm text-gray-700 cursor-pointer">
                  Acepto el procesamiento de video para validación de identidad
                </label>
              </div>

              {captureError && (
                <Alert variant="destructive">
                  <AlertDescription>{captureError}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleRequestPermissions}
                disabled={!userConsent}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Continuar
              </Button>
            </div>
          )}

          {/* Permissions State */}
          {state === 'permissions' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600 mb-4" />
              <p className="text-gray-700">Solicitando permisos de cámara...</p>
            </div>
          )}

          {/* Challenge Passed State - Show success feedback */}
          {state === 'challenge_passed' && currentChallenge && (
            <div className="space-y-4">
              {/* Video Preview */}
              <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden">
                <video
                  ref={videoElementRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Success overlay */}
                <div className="absolute inset-0 bg-green-600/90 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <CheckCircle className="w-24 h-24 mx-auto text-white animate-bounce" />
                    <h2 className="text-4xl font-bold text-white">
                      ¡Completado!
                    </h2>
                  </div>
                </div>
              </div>

              {/* Challenge card */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-lg p-6">
                <div className="text-center space-y-2">
                  <div className="text-5xl">{currentChallenge.icon}</div>
                  <p className="text-sm text-gray-600">
                    Desafío {currentChallengeIndex + 1} de 2
                  </p>
                  <p className="font-bold text-xl text-green-700">
                    ✅ {currentChallenge.instruction}
                  </p>
                  <p className="text-sm text-green-600 font-medium">
                    {completedChallenges >= 2 ? 'Procesando...' : 'Preparando siguiente desafío...'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Ready and Detecting States - Single persistent video */}
          {(state === 'ready' || state === 'detecting') && currentChallenge && (
            <div className="space-y-4">
              {/* Video Preview - persists across ready and detecting states */}
              <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden">
                <video
                  ref={videoElementRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Face guide circle - only in ready state */}
                {state === 'ready' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-64 h-64 border-2 border-white/50 rounded-full" />
                  </div>
                )}

                {/* MediaPipe Status Overlay - only in detecting state */}
                {state === 'detecting' && (
                  <div className="absolute bottom-4 left-0 right-0 px-4">
                    <div className="bg-black/80 backdrop-blur-sm rounded-lg p-4 space-y-2">
                      <div className="text-white text-center font-medium text-lg">
                        {mediaPipeStatus}
                      </div>
                      <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
                          style={{ width: `${mediaPipeProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Challenge instruction card */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-6">
                <div className="text-center space-y-3">
                  <div className={`text-5xl ${state === 'detecting' ? 'animate-bounce' : ''}`}>
                    {currentChallenge.icon}
                  </div>
                  <p className="text-sm text-gray-600">
                    Desafío {currentChallengeIndex + 1} de 2
                  </p>
                  <p className="font-bold text-xl text-indigo-700">
                    {currentChallenge.instruction}
                  </p>
                  {state === 'ready' && (
                    <p className="text-sm text-gray-600">
                      {currentChallenge.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Start button - only in ready state */}
              {state === 'ready' && (
                <Button
                  onClick={handleStartDetection}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={!mediaPipeReady}
                >
                  {mediaPipeReady ? 'Iniciar' : 'Preparando...'}
                </Button>
              )}
            </div>
          )}

          {/* Success State */}
          {state === 'success' && (
            <div className="text-center py-12 space-y-4">
              <CheckCircle className="w-20 h-20 mx-auto text-green-500" />
              <h3 className="text-2xl font-bold text-green-700">
                ✅ ¡Validación Exitosa!
              </h3>
              <p className="text-gray-600">
                Tu identidad ha sido verificada correctamente
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AVSyncChallengeModal;
