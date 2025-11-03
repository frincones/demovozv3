# EfficientNet Model

## Modelo Requerido

Para que el detector de EfficientNet funcione, necesitas descargar el modelo pre-entrenado:

**Nombre del archivo:** `best_model-v3.pt`

### Opción 1: Descargar desde GitHub Releases

```bash
# Desde el repositorio TRahulsingh/DeepfakeDetector
cd models/efficientnet/
wget https://github.com/TRahulsingh/DeepfakeDetector/releases/download/v1.0/best_model-v3.pt
```

### Opción 2: Usar modelo de Google Drive

Si el modelo está compartido en Google Drive, usar gdown:

```bash
pip install gdown
gdown [GOOGLE_DRIVE_FILE_ID] -O models/efficientnet/best_model-v3.pt
```

### Opción 3: Entrenar desde cero

Ver: https://github.com/TRahulsingh/DeepfakeDetector#training

Requiere dataset FaceForensics++ (~38GB)

## Modo Fallback

Si el modelo no está disponible, el sistema funcionará en modo fallback:
- Solo usará SyncNet para detección
- EfficientNet se deshabilitará automáticamente
- No hay errores, solo menor precisión

## Verificación

Para verificar que el modelo está correctamente instalado:

```bash
cd /workspaces/demovozv3/syncnet-service
python3 -c "
import torch
from pathlib import Path

model_path = Path('models/efficientnet/best_model-v3.pt')
if model_path.exists():
    print(f'✓ Model found: {model_path}')
    print(f'  Size: {model_path.stat().st_size / 1024 / 1024:.2f} MB')

    # Try loading
    try:
        state_dict = torch.load(model_path, map_location='cpu')
        print(f'✓ Model loads successfully')
    except Exception as e:
        print(f'✗ Error loading model: {e}')
else:
    print(f'✗ Model not found at {model_path}')
    print(f'  System will run in fallback mode (SyncNet only)')
"
```

**Esperado:** Modelo de ~17-20 MB para EfficientNet-B0
