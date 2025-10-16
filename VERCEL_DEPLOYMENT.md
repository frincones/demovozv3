# 🚀 Vercel Deployment Guide - Lirvana Voice UI

## ✅ **Status: Ready for Production**

Tu aplicación ahora está configurada para funcionar en Vercel con serverless functions para el backend.

---

## 🔧 **Configuración de Variables de Entorno en Vercel**

### **Paso 1: Acceder al Dashboard de Vercel**

1. Ve a [vercel.com/dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto `lirvana-voice-ui`
3. Ve a **Settings** → **Environment Variables**

### **Paso 2: Agregar Variables Requeridas**

Agrega esta variable de entorno:

| Key | Value | Environment |
|-----|-------|-------------|
| `OPENAI_API_KEY` | `sk-tu-api-key-aqui` | Production, Preview, Development |

**⚠️ IMPORTANTE:**
- Usa tu **API key real** de OpenAI
- Asegúrate de que la key tenga acceso a **Realtime API**
- Selecciona **todos los environments** (Production, Preview, Development)

---

## 🏗️ **Arquitectura de Deployment**

### **Frontend (Vite + React)**
- **URL:** `https://lirvana-voice-ui.vercel.app`
- **Hosting:** Vercel Edge Network
- **Build:** Automático en cada push a `main`

### **Backend (Serverless Function)**
- **Endpoint:** `https://lirvana-voice-ui.vercel.app/api/session`
- **Runtime:** Node.js serverless function
- **Location:** `/api/session.js`

### **Auto-Configuration**
```javascript
// La app detecta automáticamente el environment:
const apiUrl = import.meta.env.MODE === 'production'
  ? '/api/session'  // ← Vercel serverless function
  : 'http://localhost:3001/api/session';  // ← Local development
```

---

## 📱 **Testing en Producción**

### **Después de configurar la API key:**

1. **Visitar:** https://lirvana-voice-ui.vercel.app
2. **Verificar consola:** No deberían aparecer errores de conexión
3. **Probar orb:** Hacer clic en el 3D orb
4. **Confirmar permisos:** Dar acceso al micrófono
5. **Hablar:** Verificar que el orb reacciona al audio

### **Estados Esperados:**
- 🔘 **Gris:** Desconectado (inicial)
- 🟠 **Naranja:** Conectando (solicitando permisos/token)
- 🟢 **Verde:** Conectado y funcionando
- 🔴 **Rojo:** Error (verificar API key)

---

## 🐛 **Troubleshooting**

### **Error: "Failed to create ephemeral session"**

**Causa:** API key no configurada o incorrecta

**Solución:**
1. Verificar que `OPENAI_API_KEY` esté configurada en Vercel
2. Confirmar que la key tiene acceso a Realtime API
3. Redesplegar la aplicación después de agregar la variable

### **Error: "Connection timeout"**

**Causa:** Problemas de red o configuración de CORS

**Solución:**
- Los CORS están configurados para aceptar todas las conexiones (`*`)
- Debería funcionar sin problemas adicionales

### **Error: "WebRTC connection failed"**

**Causa:** Problemas con WebRTC o navegador

**Solución:**
- Usar Chrome/Edge (mejor soporte WebRTC)
- Verificar que el sitio use HTTPS (Vercel lo provee automáticamente)
- Limpiar cache del navegador

---

## 🔄 **Flujo de Deployment**

### **Automático:**
1. **Push a main** → Trigger deployment
2. **Vercel build** → Frontend + Serverless functions
3. **Deploy** → https://lirvana-voice-ui.vercel.app
4. **Ready** → App funcional en producción

### **Manual redeploy:**
```bash
# Si necesitas redesplegar manualmente
vercel --prod
```

---

## 📊 **Monitoring y Logs**

### **Vercel Functions Logs:**
1. Dashboard → Project → Functions
2. Buscar `/api/session`
3. Ver logs en tiempo real

### **Frontend Logs:**
- Abrir DevTools → Console
- Buscar logs `[WEBRTC]`

---

## 🎯 **Próximos Pasos Opcionales**

### **Custom Domain:**
- Configurar dominio personalizado en Vercel
- Ej: `voice.lirvan.com`

### **Analytics:**
- Vercel Analytics ya está habilitado
- Dashboard → Analytics

### **Performance:**
- Vercel Speed Insights automático
- Monitoring de Core Web Vitals

---

## ✅ **Checklist de Deployment**

- [x] ✅ Serverless function creada (`/api/session.js`)
- [x] ✅ Auto-detection de environment configurado
- [x] ✅ CORS headers configurados
- [ ] ⏳ Variable `OPENAI_API_KEY` agregada en Vercel
- [ ] ⏳ Deployment testeado en producción
- [ ] ⏳ Funcionalidad de voz confirmada

---

## 🆘 **Soporte**

**Si algo no funciona:**

1. **Verificar API key** en Vercel Environment Variables
2. **Revisar logs** en Vercel Functions dashboard
3. **Probar en Chrome** con DevTools abierto
4. **Limpiar cache** del navegador

**Debug útil:**
```javascript
// En consola del navegador:
console.log('Environment:', import.meta.env.MODE);
console.log('API URL would be:', import.meta.env.MODE === 'production' ? '/api/session' : 'http://localhost:3001/api/session');
```

---

## 🎉 **¡Listo para Producción!**

Tu aplicación Lirvana ahora tiene:
- ✅ **3D Orb espectacular** que reacciona al audio
- ✅ **WebRTC robusto** para conversaciones fluidas
- ✅ **Backend seguro** con serverless functions
- ✅ **Deployment automático** en cada push
- ✅ **Escalabilidad** ilimitada con Vercel

**¡Solo falta configurar la API key y estará funcionando!** 🚀