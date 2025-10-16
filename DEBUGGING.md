# Debugging Guide - Lirvana Voice UI

## 🔍 Problemas Comunes y Soluciones

### 1. "El agente no responde por voz ni texto"

**Síntomas:**
- El orbe se conecta pero no hay respuesta del asistente
- Aparece "Conectado" pero no hay interacción

**Diagnóstico:**
```bash
# Verificar en la consola del navegador:
1. ¿Hay errores de conexión WebSocket?
2. ¿Se muestra "OpenAI Realtime API connected successfully"?
3. ¿Aparecen logs de eventos como "[REALTIME] conversation.updated"?
```

**Soluciones:**

#### A. Verificar API Key
- Asegurar que `VITE_OPENAI_API_KEY` esté configurada en Vercel
- La key debe tener acceso a Realtime API (no todas las keys lo tienen)
- Verificar que no haya espacios extra en la variable

#### B. Problemas de Conexión WebSocket
```javascript
// Si ves este error en consola:
// "WebSocket connection failed"
// "Connection timeout after 10 attempts"

// Solución: Verificar configuración de red y API key
```

#### C. Eventos no se reciben
```javascript
// Si no ves logs como:
// "[REALTIME] conversation.updated"
// "[REALTIME] response.created"

// El problema puede ser:
1. API key inválida
2. Modelo no disponible
3. Límites de uso alcanzados
```

### 2. "Error de micrófono/audio"

**Síntomas:**
- "Audio permission denied"
- "Error iniciando escucha"

**Soluciones:**
- Verificar que el sitio esté en HTTPS (Vercel lo provee automáticamente)
- Permitir acceso al micrófono en el navegador
- Probar con diferentes navegadores (Chrome recomendado)

### 3. "API Key no configurada"

**Síntomas:**
- Toast: "API Key de OpenAI no configurada"
- Automáticamente abre modo chat

**Solución:**
1. Ir a Vercel Dashboard → Project → Settings → Environment Variables
2. Agregar: `VITE_OPENAI_API_KEY` = `sk-tu-api-key-aqui`
3. Redeploy la aplicación

### 4. "Conexión exitosa pero sin audio"

**Síntomas:**
- Status: "Conectado"
- No se escucha la voz del asistente
- Los mensajes aparecen en texto

**Diagnóstico:**
```javascript
// Verificar en consola:
// ¿Aparecen eventos como "response.audio.delta"?
// ¿Hay errores de Web Audio API?
```

**Soluciones:**
- Verificar configuración de audio del navegador
- Probar con auriculares
- Verificar que el navegador soporte Web Audio API

## 🔧 Debug Mode

Para activar modo debug detallado:

```env
VITE_DEBUG_MODE=true
VITE_LOG_LEVEL=debug
```

Esto mostrará logs detallados en consola incluyendo:
- Todos los eventos de WebSocket
- Estados de conexión
- Datos de audio
- Ejecución de herramientas

## 📊 Estados de Conexión

| Estado | Descripción | Acción |
|--------|-------------|---------|
| `disconnected` | Sin conexión | Hacer clic en orbe para conectar |
| `connecting` | Conectando... | Esperar o verificar API key |
| `connected` | Conectado ✅ | Sistema listo para uso |
| `error` | Error de conexión | Verificar API key y configuración |

## 🛠️ Herramientas de Debug

### 1. Verificar Estado en Consola
```javascript
// Pegar en consola del navegador para debug:
console.log('Lirvana State:', {
  isConnected: window.lirvanaDebug?.isConnected,
  isListening: window.lirvanaDebug?.isListening,
  error: window.lirvanaDebug?.error,
  messages: window.lirvanaDebug?.messages?.length
});
```

### 2. Probar Conexión Manual
```javascript
// Forzar reconexión:
window.lirvanaDebug?.reconnect();
```

### 3. Logs de Red
- Abrir DevTools → Network
- Filtrar por "websocket" o "wss://"
- Verificar que se establezca conexión exitosa

## 🔄 Flujo de Conexión Normal

1. **Inicialización:**
   ```
   [REALTIME] Initializing OpenAI client...
   [REALTIME] Client configured
   ```

2. **Conexión:**
   ```
   [REALTIME] Connecting...
   [REALTIME] WebSocket opened
   OpenAI Realtime API connected successfully
   ```

3. **Primer Mensaje:**
   ```
   [REALTIME] conversation.updated
   [REALTIME] response.created
   [REALTIME] Audio delta received
   ```

## 🆘 Solución de Emergencia

Si nada funciona, verificar:

1. **¿Tienes acceso a Realtime API?**
   - No todos los usuarios de OpenAI tienen acceso
   - Puede requerir solicitud especial

2. **¿La API key es correcta?**
   - Formato: `sk-...` (no `sk-proj-...`)
   - Debe tener permisos de Realtime API

3. **¿Límites de uso?**
   - Verificar dashboard de OpenAI
   - Revisar billing y límites

## 📞 Contacto de Soporte

Si los problemas persisten, proporcionar:
- URL de la aplicación
- Mensaje de error exacto
- Screenshot de consola del navegador
- Navegador y versión utilizada

---

**Última actualización:** `date`
**Versión:** 1.0.0