/**
 * ResultFeedback Component
 * Displays AV-Sync analysis results with metrics
 */

import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, RotateCcw, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AVSyncScoreResponse } from '@/services/avSyncService';
import avSyncService from '@/services/avSyncService';

interface ResultFeedbackProps {
  result: AVSyncScoreResponse;
  onRetry: () => void;
  onContinue: () => void;
  onAlternativeAuth?: () => void;
}

export const ResultFeedback: React.FC<ResultFeedbackProps> = ({
  result,
  onRetry,
  onContinue,
  onAlternativeAuth,
}) => {
  const { decision, score, offset_frames, confidence, min_dist, lag_ms } = result;

  // Get decision-specific styling
  const getDecisionConfig = () => {
    switch (decision) {
      case 'ALLOW':
        return {
          icon: CheckCircle,
          iconColor: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          title: 'Verificación Exitosa',
          message: avSyncService.getDecisionMessage(result),
        };
      case 'NEXT':
        // Differentiate title based on score range
        if (score >= 0.60) {
          // 60-79%: Probably human
          return {
            icon: CheckCircle,
            iconColor: 'text-blue-600',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200',
            title: 'Video Humano Detectado',
            message: avSyncService.getDecisionMessage(result),
          };
        } else {
          // 40-59%: Suspicious
          return {
            icon: AlertTriangle,
            iconColor: 'text-yellow-600',
            bgColor: 'bg-yellow-50',
            borderColor: 'border-yellow-200',
            title: 'Verificación Inconclusa',
            message: avSyncService.getDecisionMessage(result),
          };
        }
      case 'SUSPICIOUS_PERFECT':
        return {
          icon: AlertTriangle,
          iconColor: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          title: '⚠️ Sincronización Sospechosa',
          message: avSyncService.getDecisionMessage(result),
        };
      case 'BLOCK':
        return {
          icon: XCircle,
          iconColor: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          title: 'Alto Riesgo Detectado',
          message: avSyncService.getDecisionMessage(result),
        };
      default:
        return {
          icon: AlertTriangle,
          iconColor: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          title: 'Resultado Desconocido',
          message: 'No se pudo determinar el resultado',
        };
    }
  };

  const config = getDecisionConfig();
  const Icon = config.icon;

  return (
    <div className="space-y-6">
      {/* Result header */}
      <div className={`${config.bgColor} ${config.borderColor} border-2 rounded-lg p-6`}>
        <div className="flex items-start gap-4">
          <Icon className={`w-12 h-12 ${config.iconColor} flex-shrink-0`} />
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {config.title}
            </h3>
            <p className="text-gray-700">
              {config.message}
            </p>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4">
        {/* Score */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Puntaje de Sincronía</div>
          <div className="text-2xl font-bold text-gray-900">
            {avSyncService.formatScore(score)}
          </div>
          <div className="mt-1">
            {avSyncService.isGoodScore(score) ? (
              <span className="text-xs text-green-600 font-medium">Excelente</span>
            ) : score >= 0.75 ? (
              <span className="text-xs text-yellow-600 font-medium">Aceptable</span>
            ) : (
              <span className="text-xs text-red-600 font-medium">Bajo</span>
            )}
          </div>
        </div>

        {/* Offset */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Desfase Temporal</div>
          <div className="text-2xl font-bold text-gray-900">
            {offset_frames} frames
          </div>
          <div className="mt-1 text-xs text-gray-600">
            {lag_ms.toFixed(0)}ms
          </div>
        </div>

        {/* Confidence */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Confianza</div>
          <div className="text-2xl font-bold text-gray-900">
            {confidence.toFixed(2)}
          </div>
          <div className="mt-1">
            {confidence >= 10.0 ? (
              <span className="text-xs text-green-600 font-medium">Alta</span>
            ) : confidence >= 7.0 ? (
              <span className="text-xs text-yellow-600 font-medium">Media</span>
            ) : (
              <span className="text-xs text-red-600 font-medium">Baja</span>
            )}
          </div>
        </div>

        {/* Min Distance */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Distancia Mínima</div>
          <div className="text-2xl font-bold text-gray-900">
            {min_dist.toFixed(2)}
          </div>
          <div className="mt-1">
            {min_dist <= 5.0 ? (
              <span className="text-xs text-green-600 font-medium">Baja</span>
            ) : min_dist <= 7.0 ? (
              <span className="text-xs text-yellow-600 font-medium">Media</span>
            ) : (
              <span className="text-xs text-red-600 font-medium">Alta</span>
            )}
          </div>
        </div>
      </div>

      {/* Processing time */}
      {result.processing_time_ms && (
        <div className="text-center text-sm text-gray-600">
          Tiempo de análisis: {(result.processing_time_ms / 1000).toFixed(1)}s
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {decision === 'ALLOW' && (
          <Button
            onClick={onContinue}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            Continuar
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}

        {decision === 'NEXT' && (
          <>
            <Button
              onClick={onRetry}
              variant="outline"
              className="flex-1"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
            <Button
              onClick={onContinue}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700"
            >
              Siguiente Reto
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </>
        )}

        {decision === 'BLOCK' && (
          <>
            <Button
              onClick={onRetry}
              variant="outline"
              className="flex-1"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
            {onAlternativeAuth && (
              <Button
                onClick={onAlternativeAuth}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Método Alternativo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </>
        )}
      </div>

      {/* Reason codes (debug info) */}
      {result.reason_codes && result.reason_codes.length > 0 && (
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer hover:text-gray-700">
            Ver detalles técnicos
          </summary>
          <div className="mt-2 space-y-1">
            {result.reason_codes.map((code, index) => (
              <div key={index} className="font-mono">
                {code}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
};

export default ResultFeedback;
