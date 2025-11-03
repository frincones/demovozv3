# Fase 1: Implementación de EfficientNet para Detección de Deepfakes

**Objetivo:** Agregar segunda capa de detección usando EfficientNet-B0 para mejorar significativamente la detección de deepfakes.

**Tiempo estimado:** 1-2 semanas

**Prioridad:** 🔴 CRÍTICA

---

## 📋 Resumen Ejecutivo

### Problema Actual
- SyncNet solo detecta mala sincronización labial
- Deepfakes modernos tienen buena sincronización labial
- Sistema actual vulnerable a falsos negativos críticos

### Solución Fase 1
- Integrar EfficientNet-B0 pre-entrenado
- Detectar artefactos faciales de GANs/manipulación
- Sistema ensemble: SyncNet (40%) + EfficientNet (60%)
- Mejora esperada: >30% en detección de deepfakes de calidad

---

## 🎯 Objetivos Específicos

1. ✅ Integrar modelo EfficientNet pre-entrenado
2. ✅ Crear endpoint de detección facial
3. ✅ Implementar extracción de frames de video
4. ✅ Combinar scores con SyncNet
5. ✅ Actualizar API response con scores detallados
6. ✅ Probar con videos reales y deepfakes

---

## 🏗️ Arquitectura Propuesta

```
┌─────────────────────────────────────┐
│      VIDEO INPUT (WebM/MP4)         │
└──────────────┬──────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│    Frame Extraction (FFmpeg)         │
│    - Extract 10-20 frames            │
│    - Resize to 224x224               │
└──────────────┬───────────────────────┘
               │
       ┌───────┴────────┐
       │                │
       ▼                ▼
┌─────────────┐  ┌──────────────┐
│  SyncNet    │  │ EfficientNet │
│  Analysis   │  │   Detector   │
│             │  │              │
│ • Lip sync  │  │ • Face crop  │
│ • Offset    │  │ • Artifacts  │
│ • Score     │  │ • GAN traces │
└──────┬──────┘  └──────┬───────┘
       │                │
       └────────┬───────┘
                │
                ▼
      ┌─────────────────┐
      │ Ensemble Fusion │
      │                 │
      │ 0.4 * SyncNet + │
      │ 0.6 * EfficientNet │
      └────────┬────────┘
               │
               ▼
      ┌─────────────────┐
      │ Final Decision  │
      │ + Risk Level    │
      └─────────────────┘
```

---

## 📦 Dependencias y Requisitos

### Nuevas Dependencias Python

Agregar a `syncnet-service/requirements.txt`:

```txt
# Existing dependencies...
torch>=2.0.0
torchvision>=0.15.0
efficientnet-pytorch>=0.7.1
opencv-python>=4.8.0
Pillow>=10.0.0
facenet-pytorch>=2.5.3  # Para detección de caras
```

### Modelo Pre-entrenado

**Opción 1: Usar modelo del repositorio recomendado**
```bash
cd syncnet-service
mkdir -p models/efficientnet
cd models/efficientnet

# Descargar modelo pre-entrenado de DeepfakeDetector
# URL: https://github.com/TRahulsingh/DeepfakeDetector/releases
wget https://github.com/TRahulsingh/DeepfakeDetector/releases/download/v1.0/best_model-v3.pt
```

**Opción 2: Entrenar desde FaceForensics++**
- Requiere dataset FaceForensics++ (~38GB)
- Tiempo de entrenamiento: ~12-24 horas en GPU
- Ver: https://github.com/ondyari/FaceForensics

**Recomendación:** Usar Opción 1 para Fase 1 (deployment rápido)

---

## 🔧 Implementación Paso a Paso

### Paso 1: Crear Módulo EfficientNet Detector

**Archivo:** `syncnet-service/efficientnet_detector.py`

```python
"""
EfficientNet-based Deepfake Detector
Detects facial manipulation artifacts using pre-trained EfficientNet-B0
"""

import torch
import torch.nn as nn
from efficientnet_pytorch import EfficientNet
from torchvision import transforms
from PIL import Image
import numpy as np
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class EfficientNetDetector:
    """
    Deepfake detector using EfficientNet-B0 architecture
    Trained on FaceForensics++ dataset
    """

    def __init__(self, model_path: str, device: str = 'cpu'):
        """
        Initialize EfficientNet detector

        Args:
            model_path: Path to pre-trained model weights (.pt file)
            device: 'cuda' or 'cpu'
        """
        self.device = torch.device(device if torch.cuda.is_available() else 'cpu')
        logger.info(f"Using device: {self.device}")

        # Load model architecture
        self.model = self._build_model()

        # Load pre-trained weights
        if Path(model_path).exists():
            try:
                checkpoint = torch.load(model_path, map_location=self.device)
                self.model.load_state_dict(checkpoint)
                logger.info(f"Loaded model from {model_path}")
            except Exception as e:
                logger.error(f"Failed to load model: {e}")
                raise
        else:
            logger.warning(f"Model file not found: {model_path}")
            logger.warning("Using un-trained model (for testing only)")

        self.model.to(self.device)
        self.model.eval()

        # Image preprocessing
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])

    def _build_model(self) -> nn.Module:
        """Build EfficientNet-B0 with custom classifier"""
        # Load pre-trained EfficientNet-B0
        model = EfficientNet.from_pretrained('efficientnet-b0')

        # Replace classifier for binary classification (Real/Fake)
        num_features = model._fc.in_features
        model._fc = nn.Sequential(
            nn.Dropout(0.4),
            nn.Linear(num_features, 2)  # 2 classes: Real, Fake
        )

        return model

    def predict_image(self, image: Image.Image) -> dict:
        """
        Predict if a single image is real or fake

        Args:
            image: PIL Image

        Returns:
            dict with:
                - is_real: bool
                - confidence: float (0-1)
                - score: float (0-1, higher = more likely real)
        """
        with torch.no_grad():
            # Preprocess
            img_tensor = self.transform(image).unsqueeze(0).to(self.device)

            # Inference
            outputs = self.model(img_tensor)
            probabilities = torch.softmax(outputs, dim=1)

            # Class 0 = Fake, Class 1 = Real (adjust if different)
            fake_prob = probabilities[0][0].item()
            real_prob = probabilities[0][1].item()

            is_real = real_prob > fake_prob
            confidence = max(real_prob, fake_prob)

            return {
                'is_real': is_real,
                'confidence': confidence,
                'score': real_prob,  # Score 0-1 (1 = definitely real)
                'probabilities': {
                    'fake': fake_prob,
                    'real': real_prob
                }
            }

    def predict_frames(self, frames: list) -> dict:
        """
        Predict across multiple frames and aggregate

        Args:
            frames: List of PIL Images

        Returns:
            dict with aggregated predictions
        """
        if not frames:
            raise ValueError("No frames provided")

        predictions = []

        for frame in frames:
            pred = self.predict_image(frame)
            predictions.append(pred)

        # Aggregate predictions
        scores = [p['score'] for p in predictions]
        confidences = [p['confidence'] for p in predictions]

        avg_score = np.mean(scores)
        std_score = np.std(scores)
        avg_confidence = np.mean(confidences)

        # Decision: average score
        is_real = avg_score > 0.5

        # Consistency: lower std = more consistent across frames
        consistency = 1.0 - min(std_score * 2, 1.0)

        return {
            'is_real': is_real,
            'score': float(avg_score),
            'confidence': float(avg_confidence),
            'consistency': float(consistency),
            'num_frames': len(frames),
            'frame_scores': scores,
            'statistics': {
                'mean': float(avg_score),
                'std': float(std_score),
                'min': float(min(scores)),
                'max': float(max(scores))
            }
        }
```

### Paso 2: Crear Módulo de Extracción de Frames

**Archivo:** `syncnet-service/frame_extractor.py`

```python
"""
Video frame extraction utilities
"""

import cv2
import numpy as np
from PIL import Image
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class FrameExtractor:
    """Extract frames from video files"""

    def __init__(self, max_frames: int = 20, uniform_sampling: bool = True):
        """
        Initialize frame extractor

        Args:
            max_frames: Maximum number of frames to extract
            uniform_sampling: If True, sample frames uniformly across video
        """
        self.max_frames = max_frames
        self.uniform_sampling = uniform_sampling

    def extract_frames(self, video_path: str) -> list:
        """
        Extract frames from video

        Args:
            video_path: Path to video file

        Returns:
            List of PIL Images
        """
        if not Path(video_path).exists():
            raise FileNotFoundError(f"Video not found: {video_path}")

        cap = cv2.VideoCapture(video_path)

        if not cap.isOpened():
            raise RuntimeError(f"Failed to open video: {video_path}")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)

        logger.info(f"Video: {total_frames} frames @ {fps} FPS")

        # Determine which frames to extract
        if self.uniform_sampling:
            # Sample uniformly across video duration
            frame_indices = self._get_uniform_indices(total_frames, self.max_frames)
        else:
            # Sample from first N frames
            frame_indices = range(min(self.max_frames, total_frames))

        frames = []
        current_frame = 0

        while cap.isOpened():
            ret, frame = cap.read()

            if not ret:
                break

            if current_frame in frame_indices:
                # Convert BGR to RGB
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_image = Image.fromarray(frame_rgb)
                frames.append(pil_image)

            current_frame += 1

            if len(frames) >= self.max_frames:
                break

        cap.release()

        logger.info(f"Extracted {len(frames)} frames")

        return frames

    def _get_uniform_indices(self, total_frames: int, num_samples: int) -> list:
        """Get uniformly distributed frame indices"""
        if num_samples >= total_frames:
            return list(range(total_frames))

        # Uniform spacing
        step = total_frames / num_samples
        indices = [int(i * step) for i in range(num_samples)]

        return indices
```

### Paso 3: Actualizar SyncNet Wrapper con Ensemble

**Archivo:** `syncnet-service/syncnet_wrapper.py`

Agregar al final de la clase `SyncNetWrapper`:

```python
# ... código existente ...

class SyncNetWrapper:
    # ... métodos existentes ...

    def process_video_ensemble(
        self,
        video_path: str,
        reference: str,
        efficientnet_detector=None
    ) -> dict:
        """
        Process video with ensemble: SyncNet + EfficientNet

        Args:
            video_path: Path to video file
            reference: Reference ID
            efficientnet_detector: EfficientNetDetector instance (optional)

        Returns:
            dict with combined scores and decision
        """
        # 1. Run SyncNet analysis
        syncnet_result = self.process_video(video_path, reference)

        # 2. If EfficientNet available, run it
        if efficientnet_detector is not None:
            try:
                from frame_extractor import FrameExtractor

                # Extract frames
                extractor = FrameExtractor(max_frames=20)
                frames = extractor.extract_frames(video_path)

                # Run EfficientNet
                efficientnet_result = efficientnet_detector.predict_frames(frames)

                # Combine scores (weighted average)
                syncnet_weight = 0.4
                efficientnet_weight = 0.6

                combined_score = (
                    syncnet_weight * syncnet_result['score'] +
                    efficientnet_weight * efficientnet_result['score']
                )

                # Determine risk level
                risk_level = self._calculate_risk_level(combined_score)

                return {
                    'combined_score': round(combined_score, 4),
                    'risk_level': risk_level,
                    'is_likely_real': combined_score > 0.6,
                    'syncnet': syncnet_result,
                    'efficientnet': efficientnet_result,
                    'weights': {
                        'syncnet': syncnet_weight,
                        'efficientnet': efficientnet_weight
                    }
                }

            except Exception as e:
                logger.error(f"EfficientNet analysis failed: {e}")
                # Fallback to SyncNet only
                return {
                    'combined_score': syncnet_result['score'],
                    'risk_level': self._calculate_risk_level(syncnet_result['score']),
                    'is_likely_real': syncnet_result['score'] > 0.6,
                    'syncnet': syncnet_result,
                    'efficientnet': None,
                    'error': str(e)
                }
        else:
            # No EfficientNet available
            return {
                'combined_score': syncnet_result['score'],
                'risk_level': self._calculate_risk_level(syncnet_result['score']),
                'is_likely_real': syncnet_result['score'] > 0.6,
                'syncnet': syncnet_result,
                'efficientnet': None
            }

    def _calculate_risk_level(self, score: float) -> str:
        """Calculate risk level from score"""
        if score >= 0.8:
            return 'LOW'
        elif score >= 0.6:
            return 'MEDIUM'
        elif score >= 0.4:
            return 'HIGH'
        else:
            return 'CRITICAL'
```

### Paso 4: Actualizar Flask App

**Archivo:** `syncnet-service/app.py`

Agregar después de la inicialización de SyncNet:

```python
# ... imports existentes ...
from efficientnet_detector import EfficientNetDetector

# ... código existente ...

# Configuration
CONFIG = {
    # ... configuración existente ...
    'efficientnet_model_path': os.getenv(
        'EFFICIENTNET_MODEL_PATH',
        str(BASE_DIR / 'models' / 'efficientnet' / 'best_model-v3.pt')
    ),
}

# Initialize EfficientNet (lazy loading)
efficientnet_instance = None

def get_efficientnet():
    """Lazy initialization of EfficientNet"""
    global efficientnet_instance

    if efficientnet_instance is None:
        try:
            logger.info("Initializing EfficientNet detector...")
            efficientnet_instance = EfficientNetDetector(
                model_path=CONFIG['efficientnet_model_path'],
                device='cpu'  # Change to 'cuda' if GPU available
            )
            logger.info("EfficientNet initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize EfficientNet: {str(e)}")
            return None

    return efficientnet_instance


# Actualizar endpoint /score
@app.route('/score', methods=['POST'])
def score_video():
    """
    Analyze audio-visual synchronization + facial artifacts

    Response includes ensemble prediction
    """
    start_time = time.time()

    try:
        # ... validación existente ...

        # Get instances
        syncnet = get_syncnet()
        efficientnet = get_efficientnet()

        if syncnet is None:
            # Demo mode
            # ... código demo existente ...
            pass

        # Process with ensemble
        result = syncnet.process_video_ensemble(
            video_path,
            session_id,
            efficientnet_detector=efficientnet
        )

        processing_time_ms = int((time.time() - start_time) * 1000)
        result['processing_time_ms'] = processing_time_ms

        logger.info(
            f'[{session_id}] Combined score={result["combined_score"]:.3f}, '
            f'risk={result["risk_level"]}, time={processing_time_ms}ms'
        )

        return jsonify(result)

    except Exception as e:
        # ... manejo de errores ...
        pass


# Actualizar /health endpoint
@app.route('/health', methods=['GET'])
def health():
    """Health check with EfficientNet status"""
    syncnet = get_syncnet()
    efficientnet = get_efficientnet()

    return jsonify({
        'status': 'healthy',
        'service': 'syncnet-avsync-ensemble',
        'version': '2.0.0',  # Actualizar versión
        'detectors': {
            'syncnet': syncnet is not None,
            'efficientnet': efficientnet is not None,
        },
        'config': {
            'max_video_size_mb': CONFIG['max_video_size_mb'],
            'processing_timeout': CONFIG['processing_timeout'],
        }
    })
```

### Paso 5: Actualizar Variables de Entorno

**Archivo:** `syncnet-service/.env`

Agregar:

```env
# Existing variables...

# EfficientNet Configuration
EFFICIENTNET_MODEL_PATH=./models/efficientnet/best_model-v3.pt
```

---

## 🧪 Testing

### Script de Prueba

**Archivo:** `syncnet-service/test_ensemble.py`

```python
"""
Test script for ensemble deepfake detection
"""

import requests
import json
import sys

def test_video(video_path: str, session_id: str = "test_001"):
    """Test a video file"""

    url = "http://localhost:5000/score"

    payload = {
        "video_path": video_path,
        "session_id": session_id
    }

    print(f"\n{'='*60}")
    print(f"Testing: {video_path}")
    print(f"{'='*60}\n")

    response = requests.post(url, json=payload)

    if response.status_code == 200:
        result = response.json()

        print(f"✅ Analysis complete!")
        print(f"\n📊 Results:")
        print(f"  Combined Score: {result['combined_score']:.3f}")
        print(f"  Risk Level: {result['risk_level']}")
        print(f"  Likely Real: {result['is_likely_real']}")
        print(f"\n🔍 SyncNet:")
        print(f"  Score: {result['syncnet']['score']:.3f}")
        print(f"  Confidence: {result['syncnet']['confidence']:.3f}")
        print(f"\n🎯 EfficientNet:")
        if result.get('efficientnet'):
            print(f"  Score: {result['efficientnet']['score']:.3f}")
            print(f"  Confidence: {result['efficientnet']['confidence']:.3f}")
            print(f"  Consistency: {result['efficientnet']['consistency']:.3f}")
        else:
            print(f"  Not available")

        print(f"\n⏱️  Processing time: {result['processing_time_ms']}ms")

    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_ensemble.py <video_path>")
        sys.exit(1)

    test_video(sys.argv[1])
```

### Casos de Prueba

```bash
# Test 1: Video humano real
python test_ensemble.py /path/to/real_human_video.webm

# Test 2: Video deepfake conocido
python test_ensemble.py /path/to/deepfake_video.mp4

# Test 3: Video de baja calidad
python test_ensemble.py /path/to/low_quality_video.webm
```

---

## 📊 Métricas de Éxito

### KPIs Fase 1

| Métrica | Meta |
|---------|------|
| Detección de deepfakes de calidad | >70% |
| Falsos positivos en videos reales | <15% |
| Tiempo de procesamiento | <45 segundos |
| Mejora vs SyncNet solo | +30% precisión |

### Validación

1. Probar con 10 videos reales → Score promedio >0.7
2. Probar con 10 deepfakes conocidos → Score promedio <0.5
3. Verificar que el deepfake que falló ahora sea detectado

---

## 🚀 Deployment

### Instalación en Servidor

```bash
# 1. Actualizar dependencias
cd syncnet-service
pip install -r requirements.txt

# 2. Descargar modelo EfficientNet
mkdir -p models/efficientnet
cd models/efficientnet
wget [URL_DEL_MODELO]
cd ../..

# 3. Verificar configuración
cat .env

# 4. Reiniciar servicio
# Si usas systemd:
sudo systemctl restart syncnet-service

# Si usas gunicorn:
pkill gunicorn
gunicorn app:app -c gunicorn_config.py

# 5. Verificar health
curl http://localhost:5000/health
```

### Render Deployment

Actualizar `render.yaml`:

```yaml
services:
  - type: web
    name: syncnet-service
    env: python
    plan: starter  # Requiere al menos 1GB RAM
    buildCommand: |
      cd syncnet-service
      pip install -r requirements.txt
      ./setup.sh
      # Descargar modelo EfficientNet
      mkdir -p models/efficientnet
      wget -O models/efficientnet/best_model-v3.pt [URL_MODELO]
    startCommand: cd syncnet-service && gunicorn app:app -c gunicorn_config.py
    envVars:
      - key: EFFICIENTNET_MODEL_PATH
        value: ./models/efficientnet/best_model-v3.pt
```

---

## 📝 Checklist de Implementación

### Pre-implementación
- [ ] Backup código actual
- [ ] Crear rama git `feature/efficientnet-integration`
- [ ] Descargar modelo pre-entrenado

### Implementación
- [ ] Agregar dependencias a requirements.txt
- [ ] Crear efficientnet_detector.py
- [ ] Crear frame_extractor.py
- [ ] Actualizar syncnet_wrapper.py con ensemble
- [ ] Actualizar app.py con nuevos endpoints
- [ ] Actualizar .env con configuración

### Testing
- [ ] Test unitario: EfficientNet inference en imagen
- [ ] Test unitario: Frame extraction
- [ ] Test integración: Ensemble prediction
- [ ] Test end-to-end: Video real
- [ ] Test end-to-end: Video deepfake
- [ ] Verificar performance (tiempo < 45s)

### Deployment
- [ ] Merge a main branch
- [ ] Deploy a staging/test
- [ ] Validar en staging
- [ ] Deploy a producción
- [ ] Monitorear logs primeras 24h

---

## 🔍 Troubleshooting

### Problema: "Module 'efficientnet_pytorch' not found"
```bash
pip install efficientnet-pytorch
```

### Problema: "CUDA out of memory"
Cambiar device a 'cpu' en app.py:
```python
efficientnet_instance = EfficientNetDetector(
    model_path=CONFIG['efficientnet_model_path'],
    device='cpu'  # Forzar CPU
)
```

### Problema: "Model weights don't match"
Verificar arquitectura del modelo descargado. Puede requerir ajustar `_build_model()`.

### Problema: Tiempo de procesamiento >60s
- Reducir `max_frames` de 20 a 10
- Usar GPU si disponible
- Considerar modelo más ligero (EfficientNet-B0 es el más ligero ya)

---

## 📞 Recursos y Soporte

### Documentación
- EfficientNet Paper: https://arxiv.org/abs/1905.11946
- FaceForensics++: https://github.com/ondyari/FaceForensics
- PyTorch: https://pytorch.org/docs/

### Repositorios de Referencia
- https://github.com/TRahulsingh/DeepfakeDetector
- https://github.com/davide-coccomini/Combining-EfficientNet-and-Vision-Transformers-for-Video-Deepfake-Detection

---

**Fecha de creación:** 2025-11-03
**Última actualización:** 2025-11-03
**Estado:** ✅ Listo para implementación
