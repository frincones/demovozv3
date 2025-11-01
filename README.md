# Lirvana Voice UI v3 - Sistema de Verificación de Identidad con Deepfake Detection

Sistema avanzado de interfaz de voz con verificación de identidad mediante análisis de sincronización audio-visual (SyncNet) para detección de deepfakes.

**Live Demo**: https://lirvana-voice-ui.vercel.app/

## 📋 Descripción

Lirvana Voice UI v3 integra:
- 🎙️ **Interfaz de voz en tiempo real** con OpenAI Realtime API
- 🔒 **Verificación de identidad biométrica** con detección de deepfakes (SyncNet)
- 🌍 **Enrutamiento geográfico** inteligente de ejecutivos comerciales
- 🤖 **Sistema de agentes** para gestión de tareas
- 🎨 **Visualización 3D** con Three.js

## 🏗️ Arquitectura - 3 Servicios

```
📦 demovozv3
├── 📱 Frontend (React + Vite)        → Puerto 5173
├── 🔧 Backend API (Node.js)          → Puerto 3001
└── 🤖 SyncNet Service (Python/Flask) → Puerto 5000
```

### Frontend
- React 18 + TypeScript + Vite
- Shadcn/ui + TailwindCSS
- OpenAI Realtime API
- Three.js para visualizaciones

### Backend API
- Node.js + Express
- Gestión de sesiones
- Proxy para SyncNet
- Orquestación de servicios

### SyncNet Service
- Python 3.11 + Flask
- PyTorch + OpenCV
- Análisis de sincronización audio-visual
- Detección de deepfakes científicamente validada

## 🚀 Instalación Rápida

### 1. Clonar repositorio
```bash
git clone https://github.com/frincones/demovozv3.git
cd demovozv3
```

### 2. Instalar dependencias

```bash
# Frontend
npm install

# Backend
cd server && npm install && cd ..

# SyncNet Service
cd syncnet-service
pip3 install -r requirements.txt
git clone https://github.com/joonson/syncnet_python.git
./setup.sh  # Descarga modelos (104MB)
cd ..
```

### 3. Configurar variables de entorno

Crear `.env` en cada servicio (ver `DEPLOYMENT_RENDER.md` para detalles completos):

**Frontend (`.env`):**
```env
VITE_API_BASE_URL=http://localhost:3001
VITE_OPENAI_API_KEY=sk-...
```

**Backend (`server/.env`):**
```env
PORT=3001
OPENAI_API_KEY=sk-...
PYTHON_SERVICE_URL=http://localhost:5000
```

**SyncNet (`syncnet-service/.env`):**
```env
PORT=5000
MODEL_PATH=./models/syncnet_v2.model
DETECTOR_PATH=./models/sfd_face.pth
```

### 4. Ejecutar servicios

```bash
# Terminal 1: Frontend + Backend
npm run dev:full

# Terminal 2: SyncNet
cd syncnet-service && python3 app.py
```

**Acceso:**
- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- SyncNet: http://localhost:5000

## 🔒 Sistema de Verificación de Identidad (SyncNet)

### Cómo funciona

1. Usuario graba video de 4 segundos leyendo una frase
2. SyncNet analiza sincronización entre audio y movimiento labial
3. Sistema calcula 3 métricas científicamente validadas:
   - **Confidence**: Correlación audio-visual (threshold: >2.0)
   - **Min Distance**: Distancia euclidiana en espacio de embeddings (5-15 normal)
   - **Offset**: Desfase temporal en frames (0 = perfecto)
4. Score normalizado de 0-1 basado en paper científico

### Clasificación

| Score | Interpretación | Acción |
|-------|----------------|--------|
| ≥ 80% | 🟢 Alta confianza - Muy probablemente humano | ALLOW |
| 60-79% | 🔵 Confianza media - Probablemente humano | NEXT |
| 40-59% | 🟡 Sospechoso - Requiere verificación | NEXT |
| < 40% | 🔴 Alto riesgo - Posible deepfake | BLOCK |

### Calibración Científica

Basado en el paper "Out of time: automated lip sync in the wild" (Chung & Zisserman, ACCV 2016).

Ver documentación completa en:
- [`syncnet-service/CALIBRACION_SYNCNET.md`](syncnet-service/CALIBRACION_SYNCNET.md)
- [`syncnet-service/RESUMEN_TECNICO.md`](syncnet-service/RESUMEN_TECNICO.md)

## 📦 Deployment en Render

El proyecto requiere **3 servicios separados** en Render. Ver guía completa: [`DEPLOYMENT_RENDER.md`](DEPLOYMENT_RENDER.md)

### Resumen rápido

1. **Frontend (Static Site)**
   - Build: `npm install && npm run build`
   - Publish: `dist/`

2. **Backend (Web Service - Node.js)**
   - Build: `cd server && npm install`
   - Start: `cd server && npm start`

3. **SyncNet (Web Service - Python)**
   - Build: `cd syncnet-service && pip install -r requirements.txt && ./setup.sh`
   - Start: `cd syncnet-service && gunicorn app:app`

### Consideraciones importantes para Render

⚠️ **Modelos SyncNet** (104 MB):
- Incluir en build o usar storage externo (S3/GCS)
- Free tier tiene 512 MB de disco

⚠️ **Tiempo de procesamiento**:
- SyncNet tarda 30-45 segundos por video
- Aumentar timeout a 120 segundos en Render

⚠️ **Memoria**:
- SyncNet requiere ~512 MB RAM mínimo
- Recomendado: 2+ GB (paid tier)

## 🛠️ Herramientas de Lirvana

1. **`get_location_info`** - Procesa ubicación para enrutamiento
2. **`redirect_to_sales`** - Asigna ejecutivo por zona
3. **`product_comparison`** - Compara productos solares
4. **`schedule_consultation`** - Agenda consultoría
5. **`exposolar_info`** - Info de Exposolar 2025
6. **`company_info`** - Info general de Lirvan
7. **`redirect_to_support`** - Soporte técnico

## 🌍 Enrutamiento Geográfico

### Colombia
- **Zona Andina Sur** → Mary Luz
- **Zona Andina Norte** → Jhon Alex
- **Córdoba/Santander** → Eduardo/Marlon

### Internacional
- **México** → Kelly, Ana, Michael

## 🐛 Troubleshooting

### "SyncNet not available - returning demo data"
```bash
cd syncnet-service
./setup.sh  # Descarga modelos
```

### "No face tracks generated"
- Video debe ser al menos 4 segundos
- Buena iluminación
- Rostro centrado en cámara

### Frontend no conecta con Backend
```bash
# Verificar health checks
curl http://localhost:3001/api/avsync/health
curl http://localhost:5000/health
```

## 📚 Documentación

- [`DEPLOYMENT_RENDER.md`](DEPLOYMENT_RENDER.md) - Guía completa de deployment
- [`syncnet-service/README.md`](syncnet-service/README.md) - Documentación de SyncNet
- [`syncnet-service/CALIBRACION_SYNCNET.md`](syncnet-service/CALIBRACION_SYNCNET.md) - Calibración científica

## 🔧 Scripts Útiles

```bash
# Desarrollo completo
npm run dev:full

# Solo frontend
npm run dev

# Solo backend
npm run server:start

# Build para producción
npm run build

# Instalar todo (desde raíz)
npm install && npm run server:install && cd syncnet-service && pip3 install -r requirements.txt
```

## 📄 Licencia

Proyecto privado - Uso interno

## 👥 Autores

- **Freddy Rincones** - [frincones](https://github.com/frincones)
- **Claude (Anthropic)** - Asistencia en desarrollo

---

**Desarrollado para Lirvan.com** - Revolucionando la atención al cliente con IA conversacional y verificación biométrica de vanguardia.
