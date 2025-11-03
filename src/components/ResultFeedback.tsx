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
    // Simplified: Only ≥80% passes, everything else fails
    if (score >= 0.80) {
      return {
        icon: CheckCircle,
        iconColor: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        title: '✅ Verificación Exitosa',
        message: avSyncService.getDecisionMessage(result),
        passed: true,
      };
    } else {
      // All scores <80% are suspicious and don't pass
      return {
        icon: XCircle,
        iconColor: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        title: '❌ Verificación Fallida',
        message: avSyncService.getDecisionMessage(result),
        passed: false,
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

      {/* Summary: Why passed or failed */}
      <div className={`${config.bgColor} ${config.borderColor} border rounded-lg p-4`}>
        <h4 className="font-semibold text-gray-900 mb-2">
          Resumen del Análisis:
        </h4>
        <div className="space-y-2 text-sm text-gray-700">
          {score >= 0.80 ? (
            <>
              <p>✅ <strong>Puntaje alto:</strong> {avSyncService.formatScore(score)} indica que el video tiene alta probabilidad de ser real.</p>
              <p>✅ <strong>Resultado:</strong> El video PASA la validación y puede continuar.</p>
            </>
          ) : score >= 0.60 ? (
            <>
              <p>⚠️ <strong>Puntaje medio:</strong> {avSyncService.formatScore(score)} indica sospecha de manipulación.</p>
              <p>⚠️ <strong>Umbral requerido:</strong> Se necesita ≥80/100 para aprobar automáticamente.</p>
              <p>❌ <strong>Resultado:</strong> El video NO PASA y requiere un segundo método de verificación.</p>
            </>
          ) : score >= 0.40 ? (
            <>
              <p>⚠️ <strong>Puntaje bajo:</strong> {avSyncService.formatScore(score)} indica riesgo medio de manipulación.</p>
              <p>⚠️ <strong>Posible causa:</strong> Calidad del video baja, artefactos detectados, o posible deepfake.</p>
              <p>❌ <strong>Resultado:</strong> El video NO PASA la validación. Recomendamos intentar con mejor iluminación o usar otro método.</p>
            </>
          ) : (
            <>
              <p>❌ <strong>Puntaje muy bajo:</strong> {avSyncService.formatScore(score)} indica alto riesgo de deepfake o manipulación.</p>
              <p>❌ <strong>Detección:</strong> El sistema detectó múltiples artefactos sospechosos en el video.</p>
              <p>❌ <strong>Resultado:</strong> El video NO PASA la validación. Se bloquea por seguridad.</p>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {score >= 0.80 ? (
          // PASSED: Allow user to continue
          <Button
            onClick={onContinue}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            Continuar
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          // FAILED: Offer retry or alternative method
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
              Segundo Método
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
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
