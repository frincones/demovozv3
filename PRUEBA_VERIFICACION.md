# 🧪 Guía de Prueba - Verificación de Identidad con Deepfake Detection

**Actualizado:** 2025-11-01 20:20 UTC
**Estado:** ✅ LISTO PARA PROBAR

---

## 🔧 Cambios Implementados

### Problema Identificado
El agente de voz **NO estaba ejecutando** la función `av_sync_challenge` cuando se le pedía verificar la identidad. El agente solo respondía con texto pero no abría el modal de verificación.

### Causa Raíz
En `server/api/session.js` líneas 89-90:
```javascript
// Remove tools for now to focus on support functionality
// tools: [],  // ❌ Las herramientas estaban comentadas
```

Esto significaba que OpenAI **no tenía acceso a ninguna herramienta**, por lo que no podía ejecutar `av_sync_challenge`.

### Solución Aplicada ✅

1. **Descomentadas las tools** en `server/api/session.js`
2. **Agregada la herramienta** `av_sync_challenge` con su definición completa
3. **Actualizadas las instrucciones** del agente con:
   - Sección "VERIFICACIÓN DE IDENTIDAD (MUY IMPORTANTE)"
   - Lista clara de triggers que deben ejecutar la verificación
   - Instrucciones explícitas de cómo responder
   - Advertencias sobre lo que NUNCA debe hacer

4. **Reiniciado el servidor Express** para aplicar los cambios

---

## 📋 Instrucciones para Probar

### Paso 1: Verificar Servicios Activos

Todos estos comandos deben retornar estado OK:

```bash
# Express Server
curl http://localhost:3001/health
# Debe retornar: {"status":"OK","timestamp":"..."}

# Python SyncNet Service  
curl http://localhost:5000/health
# Debe retornar: {"status":"healthy",...}

# AV-Sync Integration
curl http://localhost:3001/api/avsync/health
# Debe retornar: {"status":"healthy",...}
```

### Paso 2: Abrir la Aplicación

1. Abre tu navegador Chrome/Edge
2. Navega a: **http://localhost:8080** o **http://127.0.0.1:8080**
3. Abre DevTools (F12) para ver los logs

### Paso 3: Activar el Modo de Voz

1. Haz clic en el botón **"Activar Voz"**
2. Acepta los permisos del micrófono cuando el navegador lo solicite
3. Espera a que el orbe se active (cambiará de color)
4. Verás el mensaje: **"🚀 Toca el orbe para comenzar"**

### Paso 4: Iniciar Conversación

1. Haz clic en el **orbe 3D**
2. Espera el saludo de Dani
3. El agente dirá algo como: *"¡Hola! Soy Dani..."*

### Paso 5: Solicitar Verificación de Identidad

Di **cualquiera de estas frases** claramente:

✅ **Frases que DEBEN activar la verificación:**
- "Verifica mi identidad"
- "Quiero verificar mi identidad"
- "Validar identidad"
- "Necesito validar mi identidad"
- "Quiero verificarme"
- "Necesito verificación"
- "Comprobar que soy yo"
- "Demostrar mi identidad"
- "¿Soy real?"
- "Validar que soy humano"
- "Detectar deepfake"

### Paso 6: Verificar que se Ejecuta la Herramienta

**En la consola del navegador (DevTools) deberías ver:**

```javascript
// Log del hook useLirvana.ts línea 167:
[INFO] Activating AV-Sync challenge { challenge_phrase: null, ... }

// Estado actualizado:
isChallengeActive: true
```

**El agente debería responder con:**
> "Por supuesto, voy a iniciar el proceso de verificación de identidad. Este proceso utiliza tecnología avanzada de análisis de sincronía audio-visual."

**Y LUEGO ejecutar la función** (verás en consola):
```
Executing tool: av_sync_challenge
```

### Paso 7: Modal de Verificación Se Abre

**El modal DEBE abrirse automáticamente** mostrando:

1. **Pantalla de Instrucciones:**
   - Título: "Verificación de Identidad"
   - Explicación del proceso
   - Botón "Iniciar Verificación"

2. **Haz clic en "Iniciar Verificación"**

3. **Pantalla de Permisos:**
   - Solicitud de permisos de cámara
   - Acepta cuando el navegador lo solicite

4. **Pantalla de Ready:**
   - Vista previa de tu cámara
   - Frase a repetir (ejemplo: "Para Paco pinta picos")
   - Botón "Comenzar Grabación"

5. **Haz clic en "Comenzar Grabación"**

6. **Countdown:**
   - Verás un countdown: 3... 2... 1...

7. **Grabación:**
   - **LEE LA FRASE EN VOZ ALTA** mientras grabas
   - La grabación dura 4 segundos automáticamente
   - Verás un indicador: 🔴 GRABANDO

8. **Procesamiento:**
   - Spinner: "Analizando sincronía audio-visual..."
   - El video se envía a:
     - Express → `/api/avsync/score`
     - Python → `/score`
   - Procesamiento de SyncNet

9. **Resultados:**
   - Verás las métricas:
     - Puntaje de Sincronía (0-100)
     - Desfase Temporal (frames)
     - Confianza
     - Distancia Mínima
   - Decisión final:
     - ✅ **ALLOW** = Verificación exitosa
     - ⚠️ **NEXT** = Verificación inconclusa
     - ❌ **BLOCK** = Alto riesgo

---

## 🐛 Troubleshooting

### Problema: El agente no ejecuta la herramienta

**Síntomas:**
- Dices "verifica mi identidad"
- El agente solo responde con texto
- No se abre el modal
- No hay logs de "Executing tool: av_sync_challenge"

**Posibles causas:**
1. **El servidor Express no se reinició**
   - Solución: Reinicia manualmente el servidor
   ```bash
   pkill -f "node.*api/session.js"
   cd /workspaces/demovozv3/server
   npm start
   ```

2. **La sesión WebRTC se creó antes del cambio**
   - Solución: Refresca completamente la página (Ctrl+Shift+R)
   - Desactiva y vuelve a activar el modo de voz

3. **La frase no matchea los triggers**
   - Solución: Usa exactamente una de las frases de la lista arriba

### Problema: Modal no se abre

**Síntomas:**
- El agente ejecuta la herramienta (ves el log)
- Pero el modal no aparece

**Verificar:**
```javascript
// En consola del navegador:
// Verifica que el estado del challenge esté activo
console.log(window.lirvanaState); // Busca isChallengeActive: true
```

**Solución:**
- Verifica que el componente AVSyncChallengeModal esté renderizado en Index.tsx
- Verifica que useLirvana esté actualizando el estado correctamente

### Problema: Error al grabar video

**Síntomas:**
- Modal se abre pero falla al capturar video
- Error: "getUserMedia not allowed"

**Solución:**
1. Asegúrate de acceder vía HTTP (no file://)
2. Acepta los permisos de cámara cuando el navegador lo solicite
3. Verifica que tu cámara no esté siendo usada por otra aplicación

---

## 📊 Logs Esperados

### En el navegador (Console):

```
[INFO] User input received: verifica mi identidad
[INFO] Executing tool: av_sync_challenge {...}
[INFO] Activating AV-Sync challenge {challenge_phrase: null}
[INFO] AV-Sync challenge activated, state updated
```

### En Express (Terminal):

```
Creating ephemeral session...
Ephemeral session created successfully
```

### En Python (Terminal):

```
127.0.0.1 - - [timestamp] "POST /score HTTP/1.1" 200 -
Processing video: /tmp/uploads/xyz.webm
[DEMO MODE] Returning mock SyncNet results
```

---

## ✅ Checklist de Verificación

Marca cada paso a medida que lo completes:

- [ ] Servicios corriendo (Express, Python, Frontend)
- [ ] Health checks pasan
- [ ] Navegador abierto en localhost:8080
- [ ] Modo de voz activado
- [ ] Conversación iniciada con Dani
- [ ] Frase de verificación dicha claramente
- [ ] Agente confirma inicio de verificación
- [ ] Log "Executing tool: av_sync_challenge" visible
- [ ] Modal se abre automáticamente
- [ ] Permisos de cámara aceptados
- [ ] Video preview visible
- [ ] Grabación completada (4s)
- [ ] Video enviado a API
- [ ] Resultados mostrados en modal
- [ ] Decisión mostrada (ALLOW/NEXT/BLOCK)

---

## 🎯 Resultado Esperado

**Flujo completo exitoso:**

1. Usuario dice: "Verifica mi identidad"
2. Agente responde: "Por supuesto, voy a iniciar..."
3. Agente ejecuta función `av_sync_challenge`
4. Modal se abre automáticamente
5. Usuario completa el challenge de video
6. Sistema analiza sincronía audio-visual
7. Resultados mostrados con métricas
8. Decisión final: ALLOW/NEXT/BLOCK

**Tiempo total:** ~20-30 segundos desde la solicitud hasta los resultados.

---

## 📞 Soporte

Si encuentras problemas:

1. Verifica los logs en las tres terminales (Frontend, Express, Python)
2. Revisa la consola del navegador (F12)
3. Verifica que todos los servicios estén corriendo
4. Consulta la sección de Troubleshooting arriba

**Archivos de referencia:**
- Instrucciones del agente: `/workspaces/demovozv3/server/api/session.js` (líneas 52-109)
- Definición de herramienta: `/workspaces/demovozv3/src/services/lirvanaTools.ts` (líneas 650-674)
- Handler del challenge: `/workspaces/demovozv3/src/hooks/useLirvana.ts` (líneas 164-169)

---

**¡Listo para probar!** 🚀

