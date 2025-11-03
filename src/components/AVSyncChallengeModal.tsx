/**
 * LivenessDetectionModal Component
 * Modal for facial liveness verification challenges
 * Based on 2025 best practices for active liveness detection
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Info, X, Upload, Eye } from 'lucide-react';
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
  | 'file-select'    // Select file to upload (upload mode)
  | 'preview'        // Preview uploaded file (upload mode)
  | 'processing'     // Analyzing video
  | 'result';        // Showing result

type UploadMode = 'live' | 'upload';

interface AVSyncChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (result: AVSyncScoreResponse) => void;
  challengePhrase?: string;
  sessionId: string;
}

// Liveness challenges based on 2025 best practices
const LIVENESS_CHALLENGES = [
  {
    id: 'blink_twice',
    instruction: 'Parpadea 2 veces',
    description: 'Cierra y abre los ojos dos veces de forma natural',
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
  {
    id: 'look_up',
    instruction: 'Mira hacia arriba',
    description: 'Levanta tu mirada hacia arriba sin mover la cabeza',
    icon: '⬆️',
  },
  {
    id: 'nod',
    instruction: 'Asiente con la cabeza',
    description: 'Mueve tu cabeza arriba y abajo una vez',
    icon: '↕️',
  },
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
  const [challenge, setChallenge] = useState(LIVENESS_CHALLENGES[0]);
  const [result, setResult] = useState<AVSyncScoreResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [userConsent, setUserConsent] = useState(false);
  const [uploadMode, setUploadMode] = useState<UploadMode>('live');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

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
    duration: 5000, // 5 seconds for liveness check
  });

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setState('instructions');
      setResult(null);
      setApiError(null);
      setUserConsent(false);
      setUploadMode('live');
      setUploadedFile(null);
      resetCapture();

      // Randomize challenge for security (best practice 2025)
      const randomChallenge = LIVENESS_CHALLENGES[
        Math.floor(Math.random() * LIVENESS_CHALLENGES.length)
      ];
      setChallenge(randomChallenge);

      log('info', '[LivenessDetection] Challenge selected:', randomChallenge.id);
    }
  }, [isOpen, resetCapture]);

  // Handle permissions request
  const handleRequestPermissions = async () => {
    try {
      setState('permissions');
      await requestPermissions();
      setState('ready');
      log('info', '[LivenessDetection] Permissions granted');
    } catch (error: any) {
      log('error', '[LivenessDetection] Permission error:', error);
      setState('instructions');
    }
  };

  // Handle file selection for upload mode
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      setApiError('Por favor selecciona un archivo de video válido');
      log('error', '[LivenessDetection] Invalid file type:', file.type);
      return;
    }

    // Validate file size (10 MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setApiError(`El video no debe superar 10 MB (tamaño actual: ${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      log('error', '[LivenessDetection] File too large:', file.size);
      return;
    }

    log('info', '[LivenessDetection] File selected', {
      name: file.name,
      size: `${(file.size / 1024).toFixed(2)} KB`,
      type: file.type,
    });

    setUploadedFile(file);
    setState('preview');
    setApiError(null);
  };

  // Handle start recording
  const handleStartRecording = async () => {
    try {
      setState('countdown');
      await startCapture();
      setState('recording');
      log('info', '[LivenessDetection] Recording started');
    } catch (error: any) {
      log('error', '[LivenessDetection] Recording error:', error);
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
    // Determine which blob to use based on upload mode
    let videoBlob: Blob;

    if (uploadMode === 'live') {
      if (!recordedBlob) return;
      videoBlob = recordedBlob;
    } else {
      if (!uploadedFile) return;
      videoBlob = uploadedFile; // File extends Blob
    }

    try {
      setState('processing');
      setApiError(null);

      log('info', '[LivenessDetection] Processing video...', {
        mode: uploadMode,
        size: videoBlob.size,
        type: videoBlob.type,
        challenge: challenge.id,
      });

      const response = await avSyncService.scoreVideo({
        videoBlob: videoBlob,
        sessionId: sessionId,
        userConsent: true,
        metadata: {
          challengePhrase: uploadMode === 'live' ? challenge.instruction : 'archivo_cargado',
          uploadMode: uploadMode,
          livenessChallenge: challenge.id,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        },
      });

      log('info', '[LivenessDetection] Analysis complete', {
        mode: uploadMode,
        score: response.score,
        decision: response.decision,
      });

      setResult(response);
      setState('result');

    } catch (error: any) {
      log('error', '[LivenessDetection] Processing error:', error);
      setApiError(error.message || 'Error procesando video');

      // Return to appropriate state based on mode
      setState(uploadMode === 'live' ? 'ready' : 'preview');
    }
  };

  // Handle retry
  const handleRetry = () => {
    setResult(null);
    setApiError(null);
    setUploadedFile(null);
    resetCapture();

    // Randomize new challenge
    const randomChallenge = LIVENESS_CHALLENGES[
      Math.floor(Math.random() * LIVENESS_CHALLENGES.length)
    ];
    setChallenge(randomChallenge);

    // Return to appropriate state based on mode
    if (uploadMode === 'live') {
      setState('ready');
    } else {
      setState('file-select');
    }
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
      <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sticky top-0 bg-white z-10 pb-4">
          <DialogTitle className="flex items-center justify-between text-base sm:text-lg">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              <span className="truncate">Verificación de Liveness</span>
            </div>
            {state !== 'recording' && state !== 'processing' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0 flex-shrink-0 ml-2"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Instructions State */}
          {state === 'instructions' && (
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Para verificar que eres una persona real y no un deepfake, realizaremos una prueba de
                  detección de vida (liveness) mediante movimientos faciales naturales.
                </AlertDescription>
              </Alert>

              {/* Mode selector */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-gray-900">
                  ¿Cómo deseas realizar la verificación?
                </h3>

                <div className="space-y-2">
                  <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                    style={{ borderColor: uploadMode === 'live' ? '#3b82f6' : '#e5e7eb' }}>
                    <input
                      type="radio"
                      name="uploadMode"
                      value="live"
                      checked={uploadMode === 'live'}
                      onChange={() => setUploadMode('live')}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Verificación en vivo (Recomendado)</div>
                      <div className="text-sm text-gray-600">
                        Graba un video de 5 segundos realizando un movimiento facial
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                    style={{ borderColor: uploadMode === 'upload' ? '#3b82f6' : '#e5e7eb' }}>
                    <input
                      type="radio"
                      name="uploadMode"
                      value="upload"
                      checked={uploadMode === 'upload'}
                      onChange={() => setUploadMode('upload')}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Subir video grabado</div>
                      <div className="text-sm text-gray-600">
                        Sube un archivo de video (.mp4, .webm, .avi, .mov) de hasta 10 MB
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Challenge instruction */}
              {uploadMode === 'live' && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-6">
                  <div className="text-center space-y-3">
                    <div className="text-5xl">{challenge.icon}</div>
                    <h3 className="font-bold text-blue-900 text-xl">
                      Tu desafío:
                    </h3>
                    <p className="text-3xl font-bold text-indigo-700">
                      {challenge.instruction}
                    </p>
                    <p className="text-sm text-gray-700">
                      {challenge.description}
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm text-gray-700">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  {uploadMode === 'live' ? 'Consejos para la verificación:' : 'Requisitos del video:'}
                </h4>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  {uploadMode === 'live' ? (
                    <>
                      <li>Asegúrate de estar en un lugar bien iluminado</li>
                      <li>Posiciona tu rostro frente a la cámara</li>
                      <li>Realiza el movimiento de forma natural y clara</li>
                      <li>El video se grabará automáticamente durante 5 segundos</li>
                      <li>No uses fotos, videos pregrabados o máscaras</li>
                    </>
                  ) : (
                    <>
                      <li>El video debe mostrar tu rostro claramente</li>
                      <li>Duración mínima: 5 segundos</li>
                      <li>Buena iluminación y calidad</li>
                      <li>Formatos aceptados: MP4, WebM, AVI, MOV (máx. 10 MB)</li>
                    </>
                  )}
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
                  Acepto que se procese mi video para verificación de liveness.
                  El video se eliminará automáticamente después del análisis y no será almacenado.
                </label>
              </div>

              <Button
                onClick={() => {
                  if (uploadMode === 'live') {
                    handleRequestPermissions();
                  } else {
                    setState('file-select');
                  }
                }}
                disabled={!userConsent}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {uploadMode === 'live' ? 'Iniciar Verificación' : 'Seleccionar Video'}
              </Button>
            </div>
          )}

          {/* Permissions State */}
          {state === 'permissions' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600 mb-4" />
              <p className="text-gray-700">Solicitando permisos de cámara...</p>
              <p className="text-sm text-gray-500 mt-2">Por favor, permite el acceso a tu cámara para continuar</p>
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

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-6">
                <div className="text-center space-y-3">
                  <div className="text-5xl">{challenge.icon}</div>
                  <p className="text-gray-800">
                    Cuando estés listo, presiona el botón para comenzar la grabación.
                  </p>
                  <p className="font-bold text-xl text-indigo-700">
                    Recuerda: {challenge.instruction}
                  </p>
                  <p className="text-sm text-gray-600">
                    {challenge.description}
                  </p>
                </div>
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
                className="w-full bg-blue-600 hover:bg-blue-700"
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

              <div className="bg-green-50 border-2 border-green-400 rounded-lg p-6">
                <div className="text-center space-y-2">
                  <div className="text-5xl animate-bounce">{challenge.icon}</div>
                  <p className="text-center text-green-900 font-bold text-xl">
                    {countdown !== null
                      ? 'Prepárate...'
                      : `¡Ahora! ${challenge.instruction}`
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* File Select State */}
          {state === 'file-select' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  accept="video/webm,video/mp4,video/avi,video/x-msvideo,video/quicktime,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="video-upload"
                />
                <label
                  htmlFor="video-upload"
                  className="flex flex-col items-center cursor-pointer"
                >
                  <Upload className="w-16 h-16 text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    Selecciona un archivo de video
                  </p>
                  <p className="text-sm text-gray-600 text-center">
                    Formatos: MP4, WebM, AVI, MOV
                    <br />
                    Tamaño máximo: 10 MB
                  </p>
                </label>
              </div>

              {apiError && (
                <Alert variant="destructive">
                  <AlertDescription>{apiError}</AlertDescription>
                </Alert>
              )}

              <Button
                variant="outline"
                onClick={() => setState('instructions')}
                className="w-full"
              >
                Volver
              </Button>
            </div>
          )}

          {/* Preview State */}
          {state === 'preview' && uploadedFile && (
            <div className="space-y-4">
              {/* Video preview */}
              <div className="bg-black rounded-lg overflow-hidden">
                <video
                  src={URL.createObjectURL(uploadedFile)}
                  controls
                  className="w-full max-h-96"
                />
              </div>

              {/* File info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">
                  Información del archivo:
                </h3>
                <div className="text-sm text-gray-700 space-y-1">
                  <p><strong>Nombre:</strong> {uploadedFile.name}</p>
                  <p><strong>Tamaño:</strong> {(uploadedFile.size / 1024).toFixed(2)} KB</p>
                  <p><strong>Tipo:</strong> {uploadedFile.type}</p>
                </div>
              </div>

              {apiError && (
                <Alert variant="destructive">
                  <AlertDescription>{apiError}</AlertDescription>
                </Alert>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setUploadedFile(null);
                    setState('file-select');
                  }}
                  className="flex-1"
                >
                  Cambiar Video
                </Button>

                <Button
                  onClick={handleProcessVideo}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Analizar Video
                </Button>
              </div>
            </div>
          )}

          {/* Processing State */}
          {state === 'processing' && (
            <div className="text-center py-8 space-y-4">
              <Loader2 className="w-16 h-16 animate-spin mx-auto text-blue-600" />
              <div>
                <p className="text-lg font-semibold text-gray-900 mb-2">
                  Analizando verificación de liveness...
                </p>
                <p className="text-sm text-gray-600">
                  Verificando que eres una persona real
                </p>
                <p className="text-xs text-gray-500 mt-2">
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
                log('info', '[LivenessDetection] Alternative auth requested');
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AVSyncChallengeModal;
