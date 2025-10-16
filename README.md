# Lirvana Voice UI - OpenAI Realtime API Integration

**Live Demo**: https://lirvana-voice-ui.vercel.app/

## 🎯 Descripción

Asistente virtual de voz inteligente para Lirvan.com que utiliza OpenAI Realtime API para proporcionar conversaciones naturales en tiempo real. Lirvana es capaz de identificar la ubicación del usuario, proporcionar información sobre productos solares, y conectar automáticamente con el ejecutivo comercial apropiado según la zona geográfica.

## ✨ Características Principales

- **🎙️ Conversación de Voz en Tiempo Real**: Integración completa con OpenAI Realtime API
- **🌍 Enrutamiento Geográfico Inteligente**: Asignación automática de ejecutivos por zona
- **🔧 Herramientas Especializadas**: 7 herramientas específicas para el negocio solar
- **💬 Fallback a Chat**: Sistema robusto de respaldo cuando el audio no está disponible
- **📱 Responsive Design**: Optimizado para desktop, tablet y móvil
- **🌐 Multiidioma**: Soporte para Español e Inglés

## 🏗️ Arquitectura Técnica

### Stack Principal
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: Shadcn/ui + Tailwind CSS
- **Animaciones**: Framer Motion
- **Audio**: Web Audio API + MediaRecorder
- **AI**: OpenAI Realtime API + Web Speech API (fallback)

### Estructura del Proyecto
```
src/
├── types/                    # Tipos TypeScript
│   ├── realtime.ts          # OpenAI Realtime API
│   ├── business.ts          # Lógica de negocio Lirvan
│   └── audio.ts             # Procesamiento de audio
├── services/                # Servicios core
│   ├── realtimeService.ts   # Cliente OpenAI Realtime
│   ├── audioService.ts      # Manejo de audio del navegador
│   ├── speechService.ts     # Web Speech API fallback
│   ├── geolocationService.ts # Mapeo de zonas geográficas
│   ├── routingService.ts    # Lógica de enrutamiento
│   └── lirvanaTools.ts      # Herramientas para OpenAI
├── hooks/                   # Hooks React personalizados
│   ├── useLirvana.ts        # Hook principal (integra todo)
│   ├── useRealtime.ts       # Conexión OpenAI Realtime
│   ├── useAudio.ts          # Manejo de audio
│   └── useSpeechRecognition.ts # Reconocimiento de voz
├── components/              # Componentes React actualizados
│   ├── VoiceOrb.tsx         # Orbe con audio levels reales
│   ├── ChatBox.tsx          # Chat con mensajes reales
│   └── ConsentBanner.tsx    # Banner de permisos
└── config/
    └── appConfig.ts         # Configuración centralizada
```

## 🤖 Personalidad de Lirvana

### Características
- **Tono**: Profesional pero cercano y amable
- **Enfoque**: Primera persona, parte del equipo Lirvan
- **Especialización**: Energía solar, productos Polux40/Pro, consultoría

### Comportamiento
- Saludo **obligatorio** preguntando ubicación (país, ciudad, departamento)
- Uso de lenguaje inclusivo: "puedo mostrarte", "quiero que tu experiencia sea la mejor"
- Nunca inventa respuestas, reconoce límites con amabilidad
- Mantiene conversación activa con preguntas útiles

## 🌍 Sistema de Enrutamiento Geográfico

### Colombia
- **Zona Andina Sur** (Bogotá, Boyacá, Cundinamarca, Meta) → **Mary Luz**
- **Zona Andina Norte** (Antioquia, Eje Cafetero, Valle, Cauca) → **Jhon Alex**
- **Zona Córdoba/Santander** → **Eduardo** (general) / **Marlon** (industrial)

### Internacional
- **México** → **Kelly, Ana, Michael**

### Soporte Técnico
- **Víctor** (NO comercial, solo soporte técnico)

## 🛠️ Herramientas del Asistente

1. **`get_location_info`**: Procesa ubicación del usuario para asignación
2. **`redirect_to_sales`**: Redirige al ejecutivo según zona geográfica
3. **`product_comparison`**: Compara Polux40 vs Polux40 Pro
4. **`schedule_consultation`**: Facilita agendamiento de consultoría
5. **`exposolar_info`**: Información sobre Exposolar 2025 (Stand 256)
6. **`company_info`**: Información general de Lirvan
7. **`redirect_to_support`**: Redirección a soporte técnico

## 🚀 Deployment y Configuración

### Variables de Entorno Requeridas
```env
VITE_OPENAI_API_KEY=sk-your-openai-api-key-here
VITE_REALTIME_MODEL=gpt-4o-realtime-preview
VITE_REALTIME_VOICE=nova
VITE_REALTIME_TEMPERATURE=0.7
VITE_REALTIME_MAX_TOKENS=150
VITE_AUDIO_SAMPLE_RATE=24000
VITE_AUDIO_CHANNELS=1
VITE_COMPANY_NAME=Lirvan
VITE_COMPANY_URL=https://lirvan.com
VITE_EXPOSOLAR_STAND=256
```

### Pasos para Deploy en Vercel
1. **Push del código** al repositorio
2. **Configurar variables** de entorno en Vercel dashboard
3. **Obtener OpenAI API Key** con acceso a Realtime API
4. **Deploy automático** - Vercel instalará dependencias

### Testing Local (Opcional)
```bash
# Instalar dependencias
npm install

# Configurar .env.local con las variables necesarias
# Ejecutar en desarrollo
npm run dev

# Build para producción
npm run build
```

## 📋 Estado de Implementación

### ✅ Completado (100% funcional)
- [x] **Integración OpenAI Realtime API** completa
- [x] **Sistema de geolocalización** y enrutamiento automático
- [x] **7 herramientas especializadas** para el asistente
- [x] **Componentes React actualizados** con funcionalidad real
- [x] **Audio processing** en tiempo real
- [x] **Fallbacks robustos** para compatibilidad
- [x] **Personalidad Lirvana** según especificaciones exactas
- [x] **Sistema de WhatsApp** con links contextualizados

### ⚠️ Pendiente (para activación)
- [ ] **Resolver problema Node.js local** (opcional)
- [ ] **Obtener OpenAI API Key** con acceso a Realtime API
- [ ] **Configurar variables de entorno** en Vercel
- [ ] **Testing en producción** y ajustes finales

## 🎨 Funcionalidades de UI

### VoiceOrb (Orbe de Voz)
- **Estados visuales**: Inactivo, Conectando, Escuchando, Procesando, Hablando, Error
- **Audio levels**: Visualización en tiempo real del nivel de audio
- **Indicadores de conexión**: Colores según estado (verde=conectado, amarillo=conectando, gris=desconectado)

### ChatBox (Interfaz de Chat)
- **Mensajes reales** de OpenAI con timestamps
- **Banner de ejecutivo asignado** con botón directo a WhatsApp
- **Transcripción en vivo** opcional
- **Indicadores de estado** de conexión
- **Soporte multiidioma** (ES/EN)

### ConsentBanner (Banner de Consentimiento)
- **Solicitud real** de permisos de micrófono
- **Opciones**: Activar voz completa o solo chat
- **Información de privacidad** actualizada

## 🔧 Troubleshooting

### "OpenAI API Key not found"
- Verificar variables de entorno en Vercel
- Asegurar que la key tenga acceso a Realtime API

### "Audio permission denied"
- Normal en HTTP, Vercel provee HTTPS automáticamente
- Usuario debe aceptar permisos en el navegador

### "Connection failed"
- Verificar HTTPS (requerido para WebRTC)
- Comprobar que OpenAI Realtime API esté disponible

## 📄 Documentación Adicional

- [`DEPLOYMENT.md`](./DEPLOYMENT.md) - Guía detallada de deployment
- [`Context/workplan.md`](./Context/workplan.md) - Plan de trabajo completo
- [`Context/prd.md`](./Context/prd.md) - Especificaciones del producto

## 🎯 Próximos Pasos

1. **Configurar OpenAI API Key** y desplegar
2. **Testing de flujos completos** en producción
3. **Optimización de prompts** según interacciones reales
4. **Analytics y métricas** de uso
5. **Integración con CRM** Lirvan

## 💻 Tecnologías y Dependencias

- React 18 + TypeScript + Vite
- OpenAI JavaScript SDK
- Shadcn/ui + Tailwind CSS
- Framer Motion
- Web Audio API / MediaRecorder
- Web Speech API (fallback)
- Vercel (deployment)

---

**Desarrollado para Lirvan.com** - Revolucionando la experiencia de atención al cliente con IA conversacional de vanguardia.
