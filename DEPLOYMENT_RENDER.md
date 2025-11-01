# Guía de Deployment en Render

## 📋 Resumen

Este proyecto requiere **3 servicios separados** en Render:

1. **Frontend** (Static Site) - React + Vite
2. **Backend API** (Web Service) - Node.js + Express
3. **SyncNet Service** (Web Service) - Python + Flask

## 🏗️ Arquitectura en Render

```
Frontend (Static Site)
   ↓ (HTTPS)
Backend API (Web Service Node.js) :3001
   ↓ (HTTP interno)
SyncNet Service (Web Service Python) :5000
```

## 🚀 Pasos de Deployment

### Preparación Previa

1. **Obtener API Key de OpenAI** con acceso a Realtime API
2. **Preparar modelos de SyncNet** (ver sección de modelos)
3. **Cuenta de Render** (render.com)

### Servicio 1: SyncNet Service (Python) - PRIMERO

**¿Por qué primero?** El Backend necesita la URL de SyncNet.

#### Configuración
- **Name:** `lirvana-syncnet`
- **Environment:** `Python 3.11`
- **Region:** Oregon (US West) o más cercana
- **Branch:** `main`
- **Root Directory:** `syncnet-service`

#### Build Command
```bash
pip install -r requirements.txt && \
git clone https://github.com/joonson/syncnet_python.git && \
mkdir -p models && \
wget -q http://www.robots.ox.ac.uk/~vgg/software/lipsync/data/syncnet_v2.model -O models/syncnet_v2.model && \
wget -q https://www.adrianbulat.com/downloads/python-fan/s3fd-619a316812.pth -O models/sfd_face.pth
```

#### Start Command
```bash
gunicorn --config gunicorn_config.py app:app
```

#### Variables de Entorno
```
PORT=5000
MODEL_PATH=./models/syncnet_v2.model
DETECTOR_PATH=./models/sfd_face.pth
TMP_DIR=./tmp
MAX_VIDEO_SIZE_MB=10
PROCESSING_TIMEOUT_SECONDS=120
LOG_LEVEL=INFO
FLASK_DEBUG=False
```

#### Plan Recomendado
- **Starter** ($7/mes) o superior
- **Razón:** SyncNet requiere ~512 MB RAM mínimo + almacenamiento para modelos (104 MB)

#### Health Check
- **Path:** `/health`
- **Expected:** `200 OK`

---

### Servicio 2: Backend API (Node.js) - SEGUNDO

#### Configuración
- **Name:** `lirvana-backend`
- **Environment:** `Node`
- **Region:** Misma que SyncNet (para menor latencia)
- **Branch:** `main`
- **Root Directory:** `server`

#### Build Command
```bash
npm install
```

#### Start Command
```bash
npm start
```

#### Variables de Entorno
```
PORT=3001
NODE_ENV=production
OPENAI_API_KEY=<tu-api-key-openai>
PYTHON_SERVICE_URL=https://lirvana-syncnet.onrender.com
CLEANUP_UPLOADS=true
```

**IMPORTANTE:** Usar la URL real de tu servicio SyncNet después de crearlo.

#### Plan Recomendado
- **Starter** ($7/mes)

#### Health Check
- **Path:** `/api/avsync/health`
- **Expected:** `200 OK`

---

### Servicio 3: Frontend (Static Site) - TERCERO

#### Configuración
- **Name:** `lirvana-frontend`
- **Environment:** `Static Site`
- **Branch:** `main`
- **Root Directory:** `.` (raíz)

#### Build Command
```bash
npm install && npm run build
```

#### Publish Directory
```
dist
```

#### Variables de Entorno
```
VITE_API_BASE_URL=https://lirvana-backend.onrender.com
VITE_OPENAI_API_KEY=<tu-api-key-openai>
VITE_REALTIME_MODEL=gpt-4o-realtime-preview
VITE_REALTIME_VOICE=nova
```

**IMPORTANTE:** Usar la URL real de tu Backend después de crearlo.

#### Plan
- **Free** (suficiente para static site)

---

## 📦 Manejo de Modelos SyncNet (Crítico)

Los modelos SyncNet son grandes:
- `syncnet_v2.model`: ~18 MB
- `sfd_face.pth`: ~86 MB
- **Total:** 104 MB

### Opción 1: Descargar en Build Time (Recomendada)

Ya incluido en el build command. Funciona pero hace el build más lento (~5-10 min).

**Ventajas:**
- Simple, no requiere setup adicional
- Siempre obtiene modelos actualizados

**Desventajas:**
- Build lento en cada deploy
- Consume tiempo de build

### Opción 2: Storage Externo (Producción)

Subir modelos a S3/Google Cloud Storage y descargarlos:

```bash
# En build command
pip install -r requirements.txt && \
git clone https://github.com/joonson/syncnet_python.git && \
mkdir -p models && \
wget -q https://tu-bucket.s3.amazonaws.com/syncnet_v2.model -O models/syncnet_v2.model && \
wget -q https://tu-bucket.s3.amazonaws.com/sfd_face.pth -O models/sfd_face.pth
```

**Ventajas:**
- Build más rápido
- Control total sobre versiones
- No depende de servidores externos

**Desventajas:**
- Requiere configurar S3/GCS
- Costo adicional (mínimo)

### Opción 3: Git LFS (No Recomendada)

GitHub tiene límites estrictos para archivos grandes.

---

## ⚙️ Configuración Adicional

### 1. Timeouts

SyncNet tarda 30-45 segundos en procesar videos.

**En Render Dashboard:**
1. Ir a Settings del servicio SyncNet
2. Advanced → Request Timeout
3. Cambiar de 30s a **120s**

### 2. Disk Space

**Free tier:** 512 MB (justo para modelos + código)
**Paid tier:** 30 GB+

Si usas free tier:
- Los modelos (104 MB) + código (~50 MB) + dependencias (~300 MB) = ~450 MB
- Queda ~60 MB para archivos temporales

**Recomendación:** Limpiar archivos temporales regularmente:
```python
# Ya implementado en app.py
CLEANUP_UPLOADS=true
```

### 3. Cold Starts (Free Tier)

Servicios se "duermen" después de 15 minutos:
- **Primer request:** 30-60 segundos (inicialización)
- **Requests subsecuentes:** Normal

**Solución:** Upgrade a paid tier para 24/7 uptime.

### 4. Environment Groups (Opcional pero útil)

Crear grupo de variables compartidas:

1. Render Dashboard → Environment Groups
2. Crear grupo "lirvana-shared"
3. Agregar: `OPENAI_API_KEY`, `NODE_ENV`, etc.
4. Vincular a ambos servicios

---

## 🧪 Verificación Post-Deployment

### 1. Health Checks

```bash
# SyncNet
curl https://lirvana-syncnet.onrender.com/health

# Backend
curl https://lirvana-backend.onrender.com/api/avsync/health

# Frontend
curl https://lirvana-frontend.onrender.com
```

### 2. Test End-to-End

1. Abrir frontend en navegador
2. Activar voz → "Verifica mi identidad"
3. Grabar video de 4 segundos
4. Verificar que aparezca resultado real (no mock)

### 3. Logs

Revisar logs en Render Dashboard si hay problemas:
- SyncNet → Logs → Buscar "Model loaded" y "Processing video"
- Backend → Logs → Buscar "Forwarding to Python service"
- Frontend → Ver console del navegador

---

## 🐛 Troubleshooting Común

### "Build failed: No module named 'torch'"

**Causa:** requirements.txt no incluye PyTorch correctamente

**Solución:** Verificar `syncnet-service/requirements.txt` incluye:
```
torch>=1.9.0
torchvision>=0.10.0
```

### "Model file not found"

**Causa:** Modelos no se descargaron en build

**Solución:** Verificar build logs, re-ejecutar build command manualmente

### "Timeout error" al procesar video

**Causa:** Request timeout muy bajo

**Solución:** Aumentar timeout a 120s en Render settings

### "Demo mode active" en producción

**Causa:** SyncNet no puede cargar modelos o conectarse

**Solución:** 
1. Verificar variables `MODEL_PATH` y `DETECTOR_PATH`
2. Revisar logs de SyncNet
3. Verificar que build completó exitosamente

### Frontend no conecta con Backend

**Causa:** URL incorrecta en `VITE_API_BASE_URL`

**Solución:** 
1. Verificar que la URL sea HTTPS (no HTTP)
2. Verificar que termine sin slash: `https://lirvana-backend.onrender.com`
3. Re-deploy frontend después de cambiar variable

---

## 💰 Costo Estimado

| Servicio | Plan | Costo/mes |
|----------|------|-----------|
| Frontend | Free | $0 |
| Backend API | Starter | $7 |
| SyncNet | Starter | $7 |
| **Total** | | **$14/mes** |

**Nota:** Primer mes gratis con $25 de crédito en Render.

---

## 🚀 Deploy con Blueprint (Opcional)

Render soporta `render.yaml` para deploy automático:

```bash
# En la raíz del proyecto
git add render.yaml
git commit -m "Add Render blueprint"
git push

# En Render Dashboard
# New → Blueprint → Connect repo → Deploy
```

Ver archivo `render.yaml` en la raíz del proyecto.

---

## 📊 Monitoring y Logs

### Métricas Importantes

1. **Request Duration** (SyncNet): Debe ser 30-45s promedio
2. **Memory Usage** (SyncNet): ~512 MB promedio, picos de 1 GB
3. **CPU Usage** (SyncNet): ~80-100% durante procesamiento (normal)
4. **Error Rate**: <1% en condiciones normales

### Alerts Recomendados

- Response time > 60s
- Memory usage > 1.5 GB
- Error rate > 5%

---

## 🔒 Seguridad

1. **API Keys:** NUNCA commitear en git (ya protegido por .gitignore)
2. **CORS:** Configurado en `server/api/avsync.js`
3. **HTTPS:** Render provee SSL automáticamente
4. **File Upload Limits:** 10 MB máximo (configurado)
5. **Temporary File Cleanup:** Automático después de procesamiento

---

## 📝 Checklist Final

- [ ] 3 servicios creados en Render
- [ ] Variables de entorno configuradas
- [ ] URLs actualizadas (Backend en Frontend, SyncNet en Backend)
- [ ] Modelos descargados exitosamente
- [ ] Health checks pasando
- [ ] Timeout aumentado a 120s en SyncNet
- [ ] Test end-to-end completado
- [ ] Logs sin errores críticos

---

**¿Problemas?** Revisar logs en Render Dashboard o consultar documentación técnica en `syncnet-service/RESUMEN_TECNICO.md`
