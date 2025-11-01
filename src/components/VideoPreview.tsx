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
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({
  stream,
  isRecording,
  countdown,
  onPermissionDenied,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

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
    </div>
  );
};

export default VideoPreview;
