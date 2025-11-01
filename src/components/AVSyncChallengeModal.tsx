/**
 * AVSyncChallengeModal Component
 * Main modal for AV-Sync deepfake detection challenge
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Info, X } from 'lucide-react';
import { useVideoCapture } from '@/hooks/useVideoCapture';
import avSyncService, { type AVSyncScoreResponse } from '@/services/avSyncService';
import VideoPreview from './VideoPreview';
import ResultFeedback from './ResultFeedback';
import { log } from '@/config/appConfig';

type ChallengeState =
  | 'instructions'    // Show instructions
  | 'permissions'     // Requesting permissions
  | 'ready'          // Ready to start
  | 'countdown'      // 3-2-1 countdown
  | 'recording'      // Recording video
  | 'processing'     // Analyzing video
  | 'result';        // Showing result

interface AVSyncChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (result: AVSyncScoreResponse) => void;
  challengePhrase?: string;
  sessionId: string;
}

const DEFAULT_PHRASES = [
  'Para Paco pinta picos',
  'Tres tristes tigres',
  'El perro de San Roque',
  'Pablito clavó un clavito',
  'La gallina degollada',
];

export const AVSyncChallengeModal: React.FC<AVSyncChallengeModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  challengePhrase,
  sessionId,
}) => {
  // State
  const [state, setState] = useState<ChallengeState>('instructions');
  const [phrase, setPhrase] = useState(challengePhrase || DEFAULT_PHRASES[0]);
  const [result, setResult] = useState<AVSyncScoreResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [userConsent, setUserConsent] = useState(false);

  // Video capture hook
  const {
    stream,
    isCapturing,
    countdown,
    recordedBlob,
    error: captureError,
    hasPermissions,
    requestPermissions,
    startCapture,
    resetCapture,
  } = useVideoCapture({
    duration: 4000, // 4 seconds
  });

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setState('instructions');
      setResult(null);
      setApiError(null);
      setUserConsent(false);
      resetCapture();

      // Randomize phrase
      if (!challengePhrase) {
        const randomPhrase = DEFAULT_PHRASES[
          Math.floor(Math.random() * DEFAULT_PHRASES.length)
        ];
        setPhrase(randomPhrase);
      }
    }
  }, [isOpen, challengePhrase, resetCapture]);

  // Handle permissions request
  const handleRequestPermissions = async () => {
    try {
      setState('permissions');
      await requestPermissions();
      setState('ready');
      log('info', '[AVSyncChallenge] Permissions granted');
    } catch (error: any) {
      log('error', '[AVSyncChallenge] Permission error:', error);
      setState('instructions');
    }
  };

  // Handle start recording
  const handleStartRecording = async () => {
    try {
      setState('countdown');
      await startCapture();
      setState('recording');
      log('info', '[AVSyncChallenge] Recording started');
    } catch (error: any) {
      log('error', '[AVSyncChallenge] Recording error:', error);
      setState('ready');
    }
  };

  // Process video when recording completes
  useEffect(() => {
    if (recordedBlob && state === 'recording') {
      handleProcessVideo();
    }
  }, [recordedBlob, state]);

  // Handle video processing
  const handleProcessVideo = async () => {
    if (!recordedBlob) return;

    try {
      setState('processing');
      setApiError(null);

      log('info', '[AVSyncChallenge] Processing video...', {
        size: recordedBlob.size,
        type: recordedBlob.type,
      });

      const response = await avSyncService.scoreVideo({
        videoBlob: recordedBlob,
        sessionId: sessionId,
        userConsent: true,
        metadata: {
          challengePhrase: phrase,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        },
      });

      log('info', '[AVSyncChallenge] Analysis complete', {
        score: response.score,
        decision: response.decision,
      });

      setResult(response);
      setState('result');

    } catch (error: any) {
      log('error', '[AVSyncChallenge] Processing error:', error);
      setApiError(error.message || 'Error procesando video');
      setState('ready');
    }
  };

  // Handle retry
  const handleRetry = () => {
    setResult(null);
    setApiError(null);
    resetCapture();
    setState('ready');
  };

  // Handle continue
  const handleContinue = () => {
    if (result) {
      onComplete(result);
      onClose();
    }
  };

  // Handle close
  const handleClose = () => {
    if (state === 'recording' || state === 'processing') {
      // Don't allow closing during recording/processing
      return;
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Verificación de Identidad</span>
            {state !== 'recording' && state !== 'processing' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Instructions State */}
          {state === 'instructions' && (
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Para verificar tu identidad, necesitamos grabar un breve video (4 segundos)
                  donde repitas una frase en voz alta. Esto nos ayuda a confirmar que eres
                  una persona real.
                </AlertDescription>
              </Alert>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">
                  Frase a repetir:
                </h3>
                <p className="text-2xl font-bold text-blue-700 text-center py-4">
                  "{phrase}"
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm text-gray-700">
                <h4 className="font-semibold text-gray-900">Instrucciones:</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Asegúrate de estar en un lugar bien iluminado</li>
                  <li>Posiciona tu rostro frente a la cámara</li>
                  <li>Habla claramente la frase completa</li>
                  <li>El video se grabará automáticamente durante 4 segundos</li>
                </ul>
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
                  Acepto que se procese mi video para verificación de identidad.
                  El video se eliminará automáticamente después del análisis.
                </label>
              </div>

              <Button
                onClick={handleRequestPermissions}
                disabled={!userConsent}
                className="w-full"
              >
                Comenzar Verificación
              </Button>
            </div>
          )}

          {/* Permissions State */}
          {state === 'permissions' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600 mb-4" />
              <p className="text-gray-700">Solicitando permisos de cámara y micrófono...</p>
            </div>
          )}

          {/* Ready State */}
          {state === 'ready' && (
            <div className="space-y-4">
              <VideoPreview
                stream={stream}
                isRecording={false}
                countdown={null}
              />

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-center text-blue-900">
                  Cuando estés listo, presiona el botón para comenzar la grabación.
                  <br />
                  <span className="font-semibold">Recuerda decir: "{phrase}"</span>
                </p>
              </div>

              {captureError && (
                <Alert variant="destructive">
                  <AlertDescription>{captureError}</AlertDescription>
                </Alert>
              )}

              {apiError && (
                <Alert variant="destructive">
                  <AlertDescription>{apiError}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleStartRecording}
                className="w-full"
                disabled={!hasPermissions}
              >
                Iniciar Grabación
              </Button>
            </div>
          )}

          {/* Countdown/Recording State */}
          {(state === 'countdown' || state === 'recording') && (
            <div className="space-y-4">
              <VideoPreview
                stream={stream}
                isRecording={isCapturing}
                countdown={countdown}
              />

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-center text-green-900 font-semibold">
                  {countdown !== null
                    ? 'Prepárate...'
                    : `Di ahora: "${phrase}"`
                  }
                </p>
              </div>
            </div>
          )}

          {/* Processing State */}
          {state === 'processing' && (
            <div className="text-center py-8 space-y-4">
              <Loader2 className="w-16 h-16 animate-spin mx-auto text-blue-600" />
              <div>
                <p className="text-lg font-semibold text-gray-900 mb-2">
                  Analizando sincronía audio-visual...
                </p>
                <p className="text-sm text-gray-600">
                  Esto puede tardar unos segundos
                </p>
              </div>
            </div>
          )}

          {/* Result State */}
          {state === 'result' && result && (
            <ResultFeedback
              result={result}
              onRetry={handleRetry}
              onContinue={handleContinue}
              onAlternativeAuth={() => {
                // TODO: Implement alternative auth methods
                log('info', '[AVSyncChallenge] Alternative auth requested');
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AVSyncChallengeModal;
