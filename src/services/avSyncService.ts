/**
 * AV-Sync Service
 * Handles communication with the AV-Sync API for deepfake detection
 */

import { log } from '@/config/appConfig';

export interface AVSyncScoreRequest {
  videoBlob: Blob;
  sessionId: string;
  userConsent: boolean;
  metadata?: {
    challengePhrase?: string;
    timestamp?: string;
    userAgent?: string;
    [key: string]: any;
  };
}

export interface AVSyncScoreResponse {
  // SyncNet metrics
  offset_frames: number;
  confidence: number;
  min_dist: number;
  score: number;           // Normalized 0-1
  lag_ms: number;

  // Decision
  decision: 'ALLOW' | 'NEXT' | 'BLOCK' | 'SUSPICIOUS_PERFECT';
  reason_codes: string[];

  // Metadata
  session_id: string;
  ttl_ms: number;
  processing_time_ms?: number;
  request_time_ms?: number;

  // Debug info
  debug?: {
    num_results?: number;
    all_results?: any[];
    pywork_path?: string;
    pycrop_path?: string;
  };

  // Optional fields for demo mode
  demo_mode?: boolean;
}

export interface AVSyncHealthResponse {
  status: string;
  service: string;
  python_service?: {
    status: string;
    syncnet_available: boolean;
    models_loaded: boolean;
  };
  python_service_url?: string;
}

export class AVSyncService {
  private baseURL: string;

  constructor() {
    // Auto-detect base URL based on environment
    if (import.meta.env.MODE === 'production') {
      // In production, use relative URL (same origin)
      this.baseURL = '';
    } else {
      // In development, use configured API URL or localhost
      this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
    }

    log('info', `[AVSyncService] Initialized with base URL: ${this.baseURL || 'relative'}`);
  }

  /**
   * Send video for AV-Sync analysis
   *
   * @param request - Video and metadata
   * @returns Score and decision
   */
  async scoreVideo(request: AVSyncScoreRequest): Promise<AVSyncScoreResponse> {
    const startTime = Date.now();

    try {
      log('info', '[AVSyncService] Sending video for analysis', {
        sessionId: request.sessionId,
        blobSize: request.videoBlob.size,
        blobType: request.videoBlob.type,
      });

      // Build FormData
      const formData = new FormData();

      // Add video file
      formData.append('video', request.videoBlob, 'capture.webm');

      // Add metadata
      formData.append('session_id', request.sessionId);
      formData.append('user_consent', request.userConsent.toString());

      if (request.metadata) {
        formData.append('metadata', JSON.stringify(request.metadata));
      }

      // Send request
      const url = `${this.baseURL}/api/avsync/score`;

      log('debug', `[AVSyncService] POST ${url}`);

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        // DO NOT set Content-Type header - browser will set it with boundary
      });

      // Handle response
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: 'Unknown error',
          message: `HTTP ${response.status}`,
        }));

        log('error', '[AVSyncService] API error:', {
          status: response.status,
          error: errorData,
        });

        throw new Error(
          errorData.message || errorData.error || `HTTP ${response.status}`
        );
      }

      const result: AVSyncScoreResponse = await response.json();

      const requestTime = Date.now() - startTime;

      log('info', '[AVSyncService] Analysis complete', {
        sessionId: result.session_id,
        score: result.score,
        decision: result.decision,
        processingTime: result.processing_time_ms,
        requestTime,
      });

      return result;

    } catch (error: any) {
      log('error', '[AVSyncService] scoreVideo error:', error);

      // Enhance error message
      const enhancedError = new Error(
        `AV-Sync analysis failed: ${error.message || 'Unknown error'}`
      );
      enhancedError.name = 'AVSyncServiceError';

      throw enhancedError;
    }
  }

  /**
   * Check health of AV-Sync service
   *
   * @returns Health status
   */
  async checkHealth(): Promise<AVSyncHealthResponse> {
    try {
      const url = `${this.baseURL}/api/avsync/health`;

      log('debug', `[AVSyncService] GET ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5s timeout
      });

      if (!response.ok) {
        throw new Error(`Health check failed: HTTP ${response.status}`);
      }

      const health: AVSyncHealthResponse = await response.json();

      log('info', '[AVSyncService] Health check:', health);

      return health;

    } catch (error: any) {
      log('error', '[AVSyncService] Health check failed:', error);

      return {
        status: 'unhealthy',
        service: 'avsync-service',
      };
    }
  }

  /**
   * Interpret decision and return user-friendly message
   *
   * Based on SyncNet paper calibration:
   * - ALLOW (≥80%): High confidence - Very likely human
   * - NEXT (60-79%): Medium confidence - Probably human
   * - NEXT (40-59%): Suspicious - Requires verification
   * - BLOCK (<40%): High risk - Possible deepfake
   *
   * @param response - API response
   * @returns User-friendly message
   */
  getDecisionMessage(response: AVSyncScoreResponse): string {
    switch (response.decision) {
      case 'ALLOW':
        return 'Verificación exitosa. Alta sincronización audio-visual detectada.';

      case 'NEXT':
        // Differentiate message based on score range
        if (response.score >= 0.60) {
          // 60-79%: Probably human, medium confidence
          return 'Sincronización audio-visual aceptable. La calidad del video puede afectar el puntaje final.';
        } else {
          // 40-59%: Suspicious, requires additional verification
          return 'Verificación inconclusa. Se recomienda un desafío adicional.';
        }

      case 'SUSPICIOUS_PERFECT':
        return '⚠️ ALERTA: Sincronización sospechosamente perfecta detectada. Posible video generado por IA. Los deepfakes modernos pueden tener sincronización perfecta.';

      case 'BLOCK':
        return 'Alto riesgo de manipulación detectado. Desincronización audio-visual significativa.';

      default:
        return 'Resultado de verificación desconocido.';
    }
  }

  /**
   * Get color for decision (for UI styling)
   *
   * @param decision - Decision code
   * @returns Tailwind color class
   */
  getDecisionColor(decision: 'ALLOW' | 'NEXT' | 'BLOCK' | 'SUSPICIOUS_PERFECT'): string {
    switch (decision) {
      case 'ALLOW':
        return 'text-green-600';
      case 'NEXT':
        return 'text-yellow-600';
      case 'SUSPICIOUS_PERFECT':
        return 'text-orange-600';
      case 'BLOCK':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  }

  /**
   * Get icon for decision
   *
   * @param decision - Decision code
   * @returns Emoji icon
   */
  getDecisionIcon(decision: 'ALLOW' | 'NEXT' | 'BLOCK' | 'SUSPICIOUS_PERFECT'): string {
    switch (decision) {
      case 'ALLOW':
        return '✅';
      case 'NEXT':
        return '⚠️';
      case 'SUSPICIOUS_PERFECT':
        return '🤖';
      case 'BLOCK':
        return '❌';
      default:
        return '❓';
    }
  }

  /**
   * Format score as percentage
   *
   * @param score - Score 0-1
   * @returns Percentage string
   */
  formatScore(score: number): string {
    return `${Math.round(score * 100)}/100`;
  }

  /**
   * Check if score is good
   *
   * @param score - Score 0-1
   * @returns True if score >= 0.90
   */
  isGoodScore(score: number): boolean {
    return score >= 0.90;
  }

  /**
   * Check if offset is acceptable
   *
   * @param offsetFrames - Offset in frames
   * @returns True if |offset| <= 2
   */
  isAcceptableOffset(offsetFrames: number): boolean {
    return Math.abs(offsetFrames) <= 2;
  }

  /**
   * Generate detailed analysis summary
   *
   * @param response - API response
   * @returns Analysis summary
   */
  generateSummary(response: AVSyncScoreResponse): string[] {
    const summary: string[] = [];

    // Overall decision
    summary.push(this.getDecisionMessage(response));

    // Score details
    summary.push(`Puntaje de sincronía: ${this.formatScore(response.score)}`);

    // Offset details
    const offsetMs = response.lag_ms.toFixed(0);
    summary.push(
      `Desfase temporal: ${response.offset_frames} frames (${offsetMs}ms)`
    );

    // Confidence details
    summary.push(`Confianza: ${response.confidence.toFixed(2)}`);

    // Processing time
    if (response.processing_time_ms) {
      const seconds = (response.processing_time_ms / 1000).toFixed(1);
      summary.push(`Tiempo de análisis: ${seconds}s`);
    }

    return summary;
  }
}

// Export singleton instance
export default new AVSyncService();
