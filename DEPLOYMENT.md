# Lirvana Voice UI - Guía de Deployment

## Estado Actual del Proyecto

### ✅ Completado
- **Estructura completa** de servicios, hooks y componentes
- **Integración OpenAI Realtime API** (pendiente instalación de dependencias)
- **Sistema de geolocalización** y enrutamiento por zonas
- **Herramientas específicas** de Lirvana para el asistente
- **Componentes actualizados** con funcionalidad real
- **Configuración de tipos** TypeScript completa

### ⚠️ Pendientes de Resolución
1. **Instalación de dependencias** - Resolver problema Node.js local
2. **API Key OpenAI** - Obtener y configurar
3. **Testing en Vercel** - Deploy y pruebas

## Pasos para Deployment

### 1. Resolver Dependencias Localmente (Opcional)

Si quieres hacer testing local primero:

```bash
# Resolver problema Node.js e instalar dependencias
npm install openai

# Verificar que todo compile
npm run build
```

### 2. Configurar Variables de Entorno en Vercel

En el dashboard de Vercel, agregar las siguientes variables:

```env
VITE_OPENAI_API_KEY=sk-your-openai-api-key-here
VITE_API_BASE_URL=https://your-vercel-app.vercel.app/api
VITE_APP_NAME=Lirvana
VITE_APP_VERSION=1.0.0
VITE_AUDIO_SAMPLE_RATE=24000
VITE_AUDIO_CHANNELS=1
VITE_DEBUG_MODE=false
VITE_LOG_LEVEL=error
VITE_REALTIME_MODEL=gpt-4o-realtime-preview
VITE_REALTIME_VOICE=nova
VITE_REALTIME_TEMPERATURE=0.7
VITE_REALTIME_MAX_TOKENS=150
VITE_COMPANY_NAME=Lirvan
VITE_COMPANY_URL=https://lirvan.com
VITE_EXPOSOLAR_STAND=256
```

### 3. Deploy a Vercel

El proyecto ya está configurado para Vercel. Solo necesitas:

1. **Push a tu repositorio**
2. **Agregar variables de entorno** en Vercel dashboard
3. **Hacer deploy** - Vercel instalará dependencias automáticamente

### 4. Obtener OpenAI API Key

1. Ir a [OpenAI Platform](https://platform.openai.com/)
2. Crear cuenta/login
3. Ir a API Keys
4. Crear nueva API key
5. Copiar y agregar a variables de entorno de Vercel

### 5. Testing Post-Deploy

Una vez desplegado, verificar:

- [ ] Página carga correctamente
- [ ] ConsentBanner aparece y funciona
- [ ] Conectividad (debe mostrar error de API key si no está configurada)
- [ ] Chat de fallback funciona
- [ ] Componentes visuales responden correctamente

## Arquitectura Implementada

```
Frontend (React + TypeScript)
├── useLirvana Hook (principal)
│   ├── useRealtime (OpenAI connection)
│   ├── useAudio (browser audio)
│   └── useSpeechRecognition (fallback)
├── Services
│   ├── realtimeService (OpenAI client)
│   ├── audioService (browser audio)
│   ├── speechService (web speech API)
│   ├── geolocationService (zone mapping)
│   ├── routingService (business logic)
│   └── lirvanaTools (OpenAI tools)
└── Components (actualizados)
    ├── VoiceOrb (with real audio levels)
    ├── ChatBox (with real messages)
    └── ConsentBanner (updated copy)
```

## Funcionalidades Implementadas

### 🎯 Core del Asistente
- **Personalidad Lirvana** completa según especificaciones
- **Saludo obligatorio** pidiendo ubicación
- **Sistema de herramientas** para OpenAI (7 herramientas)
- **Manejo de contexto** de conversación

### 🌍 Sistema Geográfico
- **Mapeo automático** de zonas colombianas y México
- **Asignación de ejecutivos** por ubicación y especialidad
- **Generación de links** WhatsApp contextualizados

### 🎙️ Audio y Voz
- **OpenAI Realtime API** integration
- **Fallback a Web Speech API** para compatibilidad
- **Audio levels en tiempo real** en VoiceOrb
- **Manejo de permisos** de micrófono

### 💬 Chat Interface
- **Mensajes reales** de OpenAI
- **Transcripción en vivo**
- **Indicadores de estado** de conexión
- **Información de ejecutivo** asignado
- **Botón directo** a WhatsApp

## Próximos Pasos Post-Deploy

### Iteración 1 (Inmediata)
1. **Verificar funcionalidad básica** en producción
2. **Ajustar configuración** según errores encontrados
3. **Testing de flujos** principales

### Iteración 2 (Optimización)
1. **Refinamiento de prompts** según interacciones reales
2. **Optimización de audio** y latencia
3. **Métricas de usage** básicas

### Iteración 3 (Funcionalidades)
1. **Analytics avanzados**
2. **A/B testing** de personalidad
3. **Integración CRM**

## Troubleshooting

### Error: "OpenAI API Key not found"
- Verificar variables de entorno en Vercel
- Asegurar que la key sea válida y tenga acceso a Realtime API

### Error: "Audio permission denied"
- Normal en navegadores que requieren HTTPS
- Vercel provee HTTPS automáticamente

### Error: "Connection failed"
- Verificar que la aplicación esté servida por HTTPS
- Comprobar que OpenAI Realtime API esté disponible

### Error: "Tool execution failed"
- Revisar logs en Vercel dashboard
- Verificar que las herramientas estén configuradas correctamente

## Contacto y Soporte

Para cualquier issue durante el deployment:
1. Revisar logs en Vercel dashboard
2. Verificar variables de entorno
3. Comprobar que OpenAI API key tenga los permisos necesarios

El sistema está diseñado con múltiples fallbacks para asegurar que siempre haya alguna funcionalidad disponible, incluso si OpenAI Realtime no está disponible.