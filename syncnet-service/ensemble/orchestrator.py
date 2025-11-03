"""
Ensemble Orchestrator
Coordina múltiples detectores (SyncNet + EfficientNet + ViT v2)
Combina resultados con pesos configurables
Mantiene retrocompatibilidad con API existente
UPDATED: 2025-11-03 - Added Vision Transformer v2 (92% accuracy)
"""

import time
import logging
from typing import Dict, Optional, Union
from pathlib import Path

# Importar detectores
try:
    from syncnet_wrapper import SyncNetWrapper
    SYNCNET_AVAILABLE = True
except ImportError:
    SYNCNET_AVAILABLE = False
    logging.warning("[Orchestrator] SyncNet not available")

try:
    from ensemble.efficientnet_detector import EfficientNetDetector
    from ensemble.frame_extractor import FrameExtractor
    EFFICIENTNET_AVAILABLE = True
except ImportError:
    EFFICIENTNET_AVAILABLE = False
    logging.warning("[Orchestrator] EfficientNet not available")

try:
    from ensemble.vit_detector import ViTDetector
    from ensemble.frame_extractor import FrameExtractor
    VIT_AVAILABLE = True
except ImportError:
    VIT_AVAILABLE = False
    logging.warning("[Orchestrator] ViT not available")

try:
    from ensemble.efficientnetv2_detector import EfficientNetV2Detector
    EFFICIENTNETV2_AVAILABLE = True
except ImportError:
    EFFICIENTNETV2_AVAILABLE = False
    logging.warning("[Orchestrator] EfficientNetV2 not available")

logger = logging.getLogger(__name__)


class EnsembleOrchestrator:
    """
    Orquesta múltiples detectores de deepfakes

    Características:
    - Combina SyncNet (existente) + EfficientNet (nuevo)
    - Pesos configurables
    - Retrocompatible con API actual
    - Extensible para futuros detectores
    """

    def __init__(
        self,
        syncnet_wrapper: Optional[SyncNetWrapper] = None,
        efficientnet_detector: Optional[EfficientNetDetector] = None,
        vit_detector: Optional[ViTDetector] = None,
        efficientnetv2_detector: Optional['EfficientNetV2Detector'] = None,
        weights: Optional[Dict[str, float]] = None
    ):
        """
        Initialize ensemble orchestrator

        Args:
            syncnet_wrapper: Instance of SyncNetWrapper (opcional)
            efficientnet_detector: Instance of EfficientNetDetector (opcional)
            vit_detector: Instance of ViTDetector (opcional)
            efficientnetv2_detector: Instance of EfficientNetV2Detector (opcional)
            weights: Dict con pesos {'syncnet': 0.0, 'efficientnet': 0.0, 'vit': 0.0, 'efficientnetv2': 1.0}
        """
        self.syncnet = syncnet_wrapper
        self.efficientnet = efficientnet_detector
        self.vit = vit_detector
        self.efficientnetv2 = efficientnetv2_detector

        # Default weights (ajustados según investigación)
        # EfficientNetV2-B2 tiene 99.885% accuracy, es el más preciso
        self.weights = weights or {
            'syncnet': 0.0,       # Desactivado
            'efficientnet': 0.0,  # Desactivado (baja precisión ~70%)
            'vit': 0.0,          # Desactivado (92% accuracy pero no el mejor)
            'efficientnetv2': 1.0,  # ACTIVO (99.885% accuracy, MEJOR detector)
        }

        # Validate weights sum to 1.0
        total_weight = sum(self.weights.values())
        if not (0.99 <= total_weight <= 1.01):
            logger.warning(
                f"[Orchestrator] Weights sum to {total_weight}, normalizing..."
            )
            # Normalize
            self.weights = {k: v/total_weight for k, v in self.weights.items()}

        logger.info(f"[Orchestrator] Initialized with weights: {self.weights}")
        logger.info(f"[Orchestrator] SyncNet: {'✓' if self.syncnet else '✗'}")
        logger.info(f"[Orchestrator] EfficientNet-B0: {'✓' if self.efficientnet else '✗'}")
        logger.info(f"[Orchestrator] ViT v2: {'✓' if self.vit else '✗'}")
        logger.info(f"[Orchestrator] EfficientNetV2-B2: {'✓' if self.efficientnetv2 else '✗'}")

    def analyze_video(
        self,
        video_path: str,
        session_id: str
    ) -> Dict[str, Union[float, str, dict, bool]]:
        """
        Analiza video usando ensemble de detectores

        Args:
            video_path: Path to video file
            session_id: Session identifier

        Returns:
            dict con estructura COMPATIBLE con API actual + nuevos campos
        """
        start_time = time.time()

        logger.info(f"[Orchestrator] Analyzing video: {video_path} (session: {session_id})")

        # Resultados individuales
        results = {}
        errors = {}

        # 1. Run SyncNet (si disponible)
        if self.syncnet:
            try:
                syncnet_result = self.syncnet.process_video(video_path, session_id)
                results['syncnet'] = syncnet_result
                logger.info(f"[Orchestrator] SyncNet score: {syncnet_result.get('score', 'N/A')}")
            except Exception as e:
                logger.error(f"[Orchestrator] SyncNet failed: {e}")
                errors['syncnet'] = str(e)

        # 2. Run EfficientNet (si disponible)
        if self.efficientnet:
            try:
                # Extract frames
                extractor = FrameExtractor(max_frames=20, sampling_method='uniform')
                frames = extractor.extract_frames(video_path)

                # Run detector
                efficientnet_result = self.efficientnet.predict_frames(
                    frames,
                    aggregate_method='mean'
                )
                results['efficientnet'] = efficientnet_result
                logger.info(f"[Orchestrator] EfficientNet score: {efficientnet_result.get('score', 'N/A')}")
            except Exception as e:
                logger.error(f"[Orchestrator] EfficientNet failed: {e}")
                errors['efficientnet'] = str(e)

        # 3. Run ViT v2 (si disponible)
        if self.vit:
            try:
                # Extract frames (reuse extractor or create new one)
                extractor = FrameExtractor(max_frames=20, sampling_method='uniform')
                frames = extractor.extract_frames(video_path)

                # Run detector
                vit_result = self.vit.predict_frames(
                    frames,
                    aggregate_method='mean'
                )
                results['vit'] = vit_result
                logger.info(f"[Orchestrator] ViT v2 score: {vit_result.get('score', 'N/A')}")
            except Exception as e:
                logger.error(f"[Orchestrator] ViT v2 failed: {e}")
                errors['vit'] = str(e)

        # 4. Run EfficientNetV2-B2 (si disponible)
        if self.efficientnetv2:
            try:
                # Extract frames
                extractor = FrameExtractor(max_frames=20, sampling_method='uniform')
                frames = extractor.extract_frames(video_path)

                # Run detector
                efficientnetv2_result = self.efficientnetv2.predict_frames(
                    frames,
                    aggregate_method='mean'
                )
                results['efficientnetv2'] = efficientnetv2_result
                logger.info(f"[Orchestrator] EfficientNetV2-B2 score: {efficientnetv2_result.get('score', 'N/A'):.4f}")
            except Exception as e:
                logger.error(f"[Orchestrator] EfficientNetV2-B2 failed: {e}")
                errors['efficientnetv2'] = str(e)

        # 4. Calcular ensemble score
        ensemble_result = self._calculate_ensemble(results, errors)

        # 4. Agregar metadata
        processing_time_ms = int((time.time() - start_time) * 1000)
        ensemble_result['processing_time_ms'] = processing_time_ms
        ensemble_result['session_id'] = session_id

        logger.info(
            f"[Orchestrator] Final score: {ensemble_result['combined_score']:.3f} "
            f"(decision: {ensemble_result['decision']}, time: {processing_time_ms}ms)"
        )

        return ensemble_result

    def _calculate_ensemble(
        self,
        results: Dict[str, dict],
        errors: Dict[str, str]
    ) -> Dict[str, Union[float, str, dict, bool]]:
        """
        Combina resultados de múltiples detectores

        Estrategia:
        - Calcula weighted average de todos los detectores disponibles
        - Normaliza pesos basado en detectores activos
        - Si NINGUNO disponible: error
        """
        # Check si tenemos al menos un resultado
        if not results:
            raise RuntimeError(
                f"All detectors failed. Errors: {errors}"
            )

        # Calculate weighted average con normalización dinámica
        available_detectors = list(results.keys())

        # Obtener pesos solo de detectores disponibles
        active_weights = {k: self.weights.get(k, 0) for k in available_detectors}
        total_active_weight = sum(active_weights.values())

        # Normalizar pesos (si todos los pesos son 0, usar promedio uniforme)
        if total_active_weight > 0:
            normalized_weights = {k: v/total_active_weight for k, v in active_weights.items()}
        else:
            # Fallback: equal weights
            normalized_weights = {k: 1.0/len(available_detectors) for k in available_detectors}

        logger.info(f"[Orchestrator] Active detectors: {available_detectors}")
        logger.info(f"[Orchestrator] Normalized weights: {normalized_weights}")

        # Calcular score combinado
        combined_score = 0.0
        for detector, weight in normalized_weights.items():
            score = results[detector].get('score', 0)
            combined_score += weight * score
            logger.info(f"[Orchestrator] {detector}: score={score:.4f}, weight={weight:.4f}")

        # Construir respuesta con todos los detalles
        detectors_detail = {}

        # SyncNet details (si disponible)
        if 'syncnet' in results:
            detectors_detail['syncnet'] = {
                'score': round(results['syncnet']['score'], 4),
                'offset_frames': results['syncnet'].get('offset_frames'),
                'confidence': results['syncnet'].get('confidence'),
                'min_dist': results['syncnet'].get('min_dist'),
                'lag_ms': results['syncnet'].get('lag_ms'),
            }

        # EfficientNet details (si disponible)
        if 'efficientnet' in results:
            detectors_detail['efficientnet'] = {
                'score': round(results['efficientnet']['score'], 4),
                'confidence': results['efficientnet'].get('confidence'),
                'consistency': results['efficientnet'].get('consistency'),
                'num_frames': results['efficientnet'].get('num_frames'),
            }

        # ViT v2 details (si disponible)
        if 'vit' in results:
            detectors_detail['vit'] = {
                'score': round(results['vit']['score'], 4),
                'confidence': results['vit'].get('confidence'),
                'consistency': results['vit'].get('consistency'),
                'num_frames': results['vit'].get('num_frames'),
                'model': results['vit'].get('model', 'vit-v2'),
            }

        # EfficientNetV2-B2 details (si disponible)
        if 'efficientnetv2' in results:
            detectors_detail['efficientnetv2'] = {
                'score': round(results['efficientnetv2']['score'], 4),
                'confidence': results['efficientnetv2'].get('confidence'),
                'consistency': results['efficientnetv2'].get('consistency'),
                'num_frames': results['efficientnetv2'].get('num_frames'),
                'model': 'efficientnetv2-b2',
            }

        # Decision basado en score combinado
        decision = self._make_decision(combined_score, results)

        # Retrocompatibilidad con campos de SyncNet
        syncnet_offset = results['syncnet'].get('offset_frames', 0) if 'syncnet' in results else 0
        syncnet_min_dist = results['syncnet'].get('min_dist', 0) if 'syncnet' in results else 0
        syncnet_lag_ms = results['syncnet'].get('lag_ms', 0) if 'syncnet' in results else 0

        # Determinar modo de ensemble
        if len(available_detectors) >= 3:
            ensemble_mode = 'full_ensemble'
        elif len(available_detectors) == 2:
            ensemble_mode = f"hybrid_{'+'.join(sorted(available_detectors))}"
        else:
            ensemble_mode = f"{available_detectors[0]}_only"

        return {
            'combined_score': round(combined_score, 4),
            'score': round(combined_score, 4),  # Retrocompatibilidad
            'decision': decision,
            'is_likely_real': combined_score >= 0.35,  # Ajustado para webcam
            'confidence': self._calculate_confidence(results),

            # Detalles individuales de cada detector
            'detectors': detectors_detail,

            # Weights usados (normalizados)
            'weights': normalized_weights,
            'original_weights': self.weights,

            # Retrocompatibilidad con campos de SyncNet
            'offset_frames': syncnet_offset,
            'min_dist': syncnet_min_dist,
            'lag_ms': syncnet_lag_ms,

            # Metadata
            'ensemble_mode': ensemble_mode,
            'detectors_used': available_detectors,
            'errors': errors if errors else None
        }

    def _make_decision(
        self,
        combined_score: float,
        results: Dict[str, dict]
    ) -> str:
        """
        Toma decisión basada en score combinado

        AJUSTADO para videos de webcam (calidad variable):
        - ALLOW: ≥35% (videos reales de webcam típicamente 0.35-0.50)
        - NEXT: 25-35% (revisar con más cuidado, zona gris)
        - BLOCK: <25% (alto riesgo de deepfake)
        - SUSPICIOUS_PERFECT: Métricas sospechosamente perfectas (>95%)
        """
        # Check for suspiciously perfect metrics (deepfake moderno)
        if self._is_suspiciously_perfect(results):
            logger.warning("[Orchestrator] Suspiciously perfect metrics detected!")
            return 'SUSPICIOUS_PERFECT'

        # Score-based decision (AJUSTADO para webcam)
        if combined_score >= 0.35:
            return 'ALLOW'
        elif combined_score >= 0.25:
            return 'NEXT'
        else:
            return 'BLOCK'

    def _is_suspiciously_perfect(self, results: Dict[str, dict]) -> bool:
        """
        Detecta métricas sospechosamente perfectas

        Los deepfakes modernos pueden tener:
        - Score muy alto (>95%)
        - Offset = 0 frames (perfecta sincronización)
        - Confidence muy alta (>10)
        - Min dist muy baja (<6)

        Esto NO es normal en videos humanos reales
        """
        if 'syncnet' not in results:
            return False

        syncnet = results['syncnet']

        is_perfect = (
            syncnet.get('score', 0) >= 0.95 and
            abs(syncnet.get('offset_frames', 1)) == 0 and
            syncnet.get('confidence', 0) > 10.0 and
            syncnet.get('min_dist', 10) < 6.0
        )

        return is_perfect

    def _calculate_confidence(self, results: Dict[str, dict]) -> float:
        """
        Calcula confianza global del ensemble

        Basado en:
        - Confianzas individuales
        - Consistencia entre detectores
        """
        confidences = []

        if 'syncnet' in results:
            confidences.append(results['syncnet'].get('confidence', 0) / 10.0)  # Normalize

        if 'efficientnet' in results:
            confidences.append(results['efficientnet'].get('confidence', 0))

        if 'vit' in results:
            confidences.append(results['vit'].get('confidence', 0))

        if not confidences:
            return 0.0

        # Average confidence
        avg_confidence = sum(confidences) / len(confidences)

        # Clip to 0-1 range
        return max(0.0, min(1.0, avg_confidence))
