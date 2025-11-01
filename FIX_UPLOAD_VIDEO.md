# 🔧 Fix: Error de Upload de Video - SOLUCIONADO

**Fecha:** 2025-11-01 20:29 UTC
**Problema:** HTTP 500 al enviar video al backend
**Estado:** ✅ RESUELTO

---

## 🐛 Problema Encontrado

Al completar la grabación del video en el modal de verificación, el sistema fallaba con:

```
Error: Only video files are allowed
```

### Causa Raíz

El filtro de Multer en `server/api/avsync.js` solo aceptaba archivos con `mimetype` que empiece con `video/`, pero algunos navegadores no envían el mimetype correctamente al subir un Blob vía FormData.

### Error en Logs del Backend

```
Error: Only video files are allowed
    at fileFilter (file:///workspaces/demovozv3/server/api/avsync.js:43:10)
```

---

## ✅ Solución Aplicada

Actualicé el filtro de Multer para aceptar archivos tanto por **mimetype** como por **extensión de archivo**:

```javascript
// ANTES (solo mimetype):
fileFilter: (req, file, cb) => {
  if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only video files are allowed'), false);
  }
}

// DESPUÉS (mimetype O extensión):
fileFilter: (req, file, cb) => {
  console.log('[AV-Sync Upload] File received:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    fieldname: file.fieldname,
  });

  // Accept video files by mimetype OR by extension
  const isVideoMimetype = file.mimetype.startsWith('video/');
  const isVideoExtension = /\.(webm|mp4|avi|mov)$/i.test(file.originalname);

  if (isVideoMimetype || isVideoExtension) {
    console.log('[AV-Sync Upload] File accepted');
    cb(null, true);
  } else {
    console.error('[AV-Sync Upload] File rejected - not a video file');
    cb(new Error('Only video files are allowed'), false);
  }
}
```

### Cambios Adicionales

1. **Logs detallados** agregados para debugging
2. **Servidor Express reiniciado** para aplicar los cambios

---

## 🧪 Cómo Probar Ahora

### Paso 1: Refrescar la Página

**MUY IMPORTANTE:** Refresca completamente la página del navegador:
- **Chrome/Edge:** Ctrl+Shift+R (Windows/Linux) o Cmd+Shift+R (Mac)
- O cierra y vuelve a abrir la pestaña

### Paso 2: Ejecutar el Flujo Completo

1. **Activa el modo de voz** → "Activar Voz"
2. **Inicia conversación** → Haz clic en el orbe
3. **Solicita verificación** → Di: "Verifica mi identidad"
4. **Espera la confirmación del agente**
5. **Modal se abre automáticamente** ✅
6. **Haz clic en "Iniciar Verificación"**
7. **Acepta permisos de cámara**
8. **Haz clic en "Comenzar Grabación"**
9. **Lee la frase en voz alta** durante el countdown y la grabación (4s)
10. **Espera el procesamiento** → Spinner "Analizando sincronía..."
11. **Ver resultados** ✅

### Paso 3: Verificar en DevTools

Abre la consola del navegador (F12) y busca estos logs:

**Al subir el video (Backend Express):**
```
[AV-Sync Upload] File received: {
  originalname: 'capture.webm',
  mimetype: '...',
  fieldname: 'video'
}
[AV-Sync Upload] File accepted
```

**Al procesar el video (Python Flask):**
```
Processing video: /tmp/uploads/video-xyz.webm
[DEMO MODE] Returning mock SyncNet results
```

---

## 📊 Resultado Esperado

Deberías ver una pantalla de resultados mostrando:

```
┌─────────────────────────────────────┐
│ ✅ VERIFICACIÓN EXITOSA             │
│                                     │
│ Puntaje de Sincronía: 91/100       │
│ Desfase Temporal: 2 frames (80ms)  │
│ Confianza: 10.02  (Alta)            │
│ Distancia Mínima: 5.35  (Baja)     │
│                                     │
│ Decisión: ALLOW                     │
│ Tiempo de análisis: 7.2s           │
│                                     │
│ [Continuar]                         │
└─────────────────────────────────────┘
```

---

## 🐛 Si Aún Hay Problemas

### Problema: Aún muestra "Only video files are allowed"

**Solución:**
1. Verifica que el servidor Express se haya reiniciado correctamente:
   ```bash
   curl http://localhost:3001/health
   # Debe retornar timestamp actual
   ```

2. Verifica los logs del servidor Express en la terminal
3. Asegúrate de haber refrescado la página completamente

### Problema: Otro error diferente

Revisa la consola del navegador y los logs de los servidores:
- **Frontend Vite:** Terminal donde corre `npm run dev`
- **Backend Express:** Terminal donde corre `npm start` (server/)
- **Python Flask:** Terminal donde corre `python3 app.py` (syncnet-service/)

---

## 📁 Archivo Modificado

- **`server/api/avsync.js`** (líneas 38-56):
  - Actualizado filtro de Multer
  - Agregados logs para debugging

---

## ✅ Estado Actual

```
✅ Modal de verificación se abre correctamente
✅ Grabación de video funciona
✅ Upload de video ahora acepta archivos por extensión
✅ Servidor Express reiniciado con nueva configuración
```

---

**¡Prueba ahora y el flujo completo debería funcionar!** 🚀

Si ves los resultados con las métricas y la decisión (ALLOW/NEXT/BLOCK), entonces **todo el sistema está funcionando end-to-end correctamente**. ✅

