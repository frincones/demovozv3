/**
 * VideoPreview Component
 * Displays video preview with countdown overlay
 */

import React, { useEffect, useRef } from 'react';
import { Camera } from 'lucide-react';

interface VideoPreviewProps {
  stream: MediaStream | null;
  isRecording: boolean;
  countdown: number | null;
  onPermissionDenied?: () => void;
  videoRef?: React.RefObject<HTMLVideoElement>; // Optional external ref for MediaPipe
  mediaPipeStatus?: string; // Optional MediaPipe detection status
  mediaPipeProgress?: number; // Optional MediaPipe progress (0-100)
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({
  stream,
  isRecording,
  countdown,
  onPermissionDenied,
  videoRef: externalVideoRef,
  mediaPipeStatus,
  mediaPipeProgress = 0,
}) => {
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalVideoRef || internalVideoRef;

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden">
      {/* Video element */}
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
      ) : (
        // Placeholder when no stream
        <div className="w-full h-full flex items-center justify-center bg-gray-800">
          <div className="text-center text-gray-400">
            <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Esperando permisos de cámara...</p>
          </div>
        </div>
      )}

      {/* Countdown overlay */}
      {countdown !== null && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
          <div className="text-white text-9xl font-bold animate-pulse">
            {countdown}
          </div>
        </div>
      )}

      {/* Recording indicator */}
      {isRecording && countdown === null && (
        <div className="absolute top-4 right-4">
          <div className="flex items-center gap-2 bg-red-600 text-white px-3 py-2 rounded-full">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
            <span className="text-sm font-semibold">GRABANDO</span>
          </div>
        </div>
      )}

      {/* Face detection overlay (optional - could add face detection UI) */}
      {stream && !isRecording && countdown === null && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-64 border-2 border-white/50 rounded-full" />
        </div>
      )}

      {/* MediaPipe detection status overlay */}
      {mediaPipeStatus && isRecording && countdown === null && (
        <div className="absolute bottom-4 left-0 right-0 px-4">
          <div className="bg-black/80 backdrop-blur-sm rounded-lg p-4 space-y-2">
            {/* Status text */}
            <div className="text-white text-center font-medium">
              {mediaPipeStatus}
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300 ease-out"
                style={{ width: `${mediaPipeProgress}%` }}
              />
            </div>

            {/* Progress percentage */}
            <div className="text-xs text-center text-gray-300">
              {Math.round(mediaPipeProgress)}% completado
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPreview;
