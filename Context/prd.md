# PRD: Lirvana Voice Assistant - Implementación OpenAI Realtime API

## Resumen Ejecutivo

### Objetivo
Transformar la interfaz de voz mockup existente en un asistente virtual completamente funcional que represente a Lirvan.com, utilizando OpenAI Realtime API para proporcionar conversaciones naturales en tiempo real con capacidades específicas de negocio.

### Alcance del Proyecto
- Integración completa de OpenAI Realtime API
- Desarrollo de asistente conversacional "Lirvana"
- Sistema de enrutamiento geográfico automático
- Herramientas específicas de negocio integradas
- Experiencia de usuario fluida y profesional

## Contexto del Negocio

### Sobre Lirvan.com
- Empresa colombiana fabricante de equipos solares
- Presencia en Colombia, México y Hong Kong
- Productos principales: Polux40 y Polux40 Pro
- Servicios: Consultoría, IA, gestión de proyectos
- Participación en Exposolar 2025 (Stand 256)

### Problema a Resolver
Actualmente, la interfaz de voz es solo visual sin funcionalidad real. Se necesita un asistente inteligente que:
- Atienda consultas 24/7
- Identifique ubicación del cliente
- Enrute automáticamente a ejecutivos por zona
- Proporcione información técnica y comercial
- Mantenga el tono profesional de la marca

## Especificaciones del Producto

### Personalidad del Asistente: "Lirvana"

#### Características de Personalidad
- **Tono**: Profesional pero cercano y amable
- **Enfoque**: Primera persona, parte del equipo Lirvan
- **Idiomas**: Español (primario), Inglés (secundario)
- **Especialización**: Energía solar, productos Polux, consultoría

#### Comportamiento Conversacional
- Saludo incluye pregunta por ubicación (país, ciudad, departamento)
- Usa lenguaje inclusivo: "puedo mostrarte", "quiero que tu experiencia sea la mejor"
- Personaliza respuestas evitando sonar robótica
- Mantiene conversación activa con preguntas útiles
- Nunca inventa respuestas, reconoce límites con amabilidad

### Funcionalidades Core

#### 1. Sistema de Geolocalización y Enrutamiento

##### Zonas de Asignación Colombia:
- **Zona Andina Sur** (Bogotá, Boyacá, Cundinamarca, Meta)
  - Ejecutiva: Mary Luz
  - WhatsApp: https://wa.link/np07vd

- **Zona Andina Norte** (Antioquia, Eje Cafetero, Valle del Cauca, Cauca)
  - Ejecutivo: Jhon Alex
  - WhatsApp: https://wa.link/5sm6ok

- **Zona Córdoba/Santander** (Córdoba, Santander, Norte de Santander, Magdalena, Atlántico)
  - **Alumbrado Público Industrial**: Marlon (https://wa.link/jq832o)
  - **Alumbrado Público Solar**: Eduardo (https://wa.link/9fu8z6)
  - **Ventas Generales**: Eduardo (https://wa.link/blu3xx)

##### Internacional:
- **México**:
  - Kelly: https://wa.link/plpr1f
  - Ana: https://wa.link/2ed7gb
  - Michael: https://wa.link/o64i45

##### Soporte Técnico (No comercial):
- Víctor: https://wa.link/sp94l9

#### 2. Base de Conocimiento de Productos

##### Polux40 vs Polux40 Pro
- Comparaciones técnicas automáticas
- Recomendaciones según necesidades
- Especificaciones detalladas
- Casos de uso específicos

##### Servicios Lirvan
- Consultoría en energía solar
- Soluciones de IA
- Gestión de proyectos
- Soporte técnico especializado

#### 3. Herramientas Conversacionales

##### Herramientas Primarias:
```typescript
const tools = [
  {
    name: "get_location_info",
    description: "Obtiene y procesa la ubicación del usuario para asignación",
    parameters: {
      country: "string",
      state_department: "string",
      city: "string"
    }
  },
  {
    name: "redirect_to_sales",
    description: "Redirige al ejecutivo comercial según zona geográfica",
    parameters: {
      zone: "string",
      product_type: "string",
      user_location: "object"
    }
  },
  {
    name: "product_comparison",
    description: "Compara productos Polux40 y Polux40 Pro",
    parameters: {
      user_needs: "string",
      application_type: "string"
    }
  },
  {
    name: "schedule_consultation",
    description: "Facilita agendamiento de consultoría",
    parameters: {
      consultation_type: "string",
      user_contact: "string"
    }
  },
  {
    name: "exposolar_info",
    description: "Proporciona información sobre Exposolar 2025",
    parameters: {
      info_type: "string"
    }
  }
]
```

## Arquitectura Técnica

### Stack Tecnológico

#### Frontend (Existente)
- **Framework**: React 18 + TypeScript
- **Bundler**: Vite
- **UI Library**: Shadcn/ui + Tailwind CSS
- **Animaciones**: Framer Motion
- **State Management**: React Hooks + Context

#### Nuevas Integraciones
- **OpenAI SDK**: `openai-agents-js` (Recomendado)
- **Audio Processing**: Web Audio API + MediaRecorder
- **WebSocket**: Nativo + OpenAI Realtime client
- **Geolocation**: Custom service + external APIs

### Arquitectura de Servicios

#### Estructura de Archivos
```
src/
├── services/
│   ├── realtimeService.ts      # Cliente OpenAI Realtime
│   ├── audioService.ts         # Manejo de audio del navegador
│   ├── geolocationService.ts   # Detección y asignación de zonas
│   ├── routingService.ts       # Lógica de enrutamiento a ejecutivos
│   └── knowledgeService.ts     # Base de conocimiento de productos
├── hooks/
│   ├── useRealtime.ts          # Hook principal Realtime
│   ├── useAudio.ts             # Hook de audio
│   ├── useGeolocation.ts       # Hook de geolocalización
│   └── useConversation.ts      # Hook de manejo de conversación
├── types/
│   ├── realtime.ts             # Tipos OpenAI Realtime
│   ├── business.ts             # Tipos específicos de negocio
│   └── audio.ts                # Tipos de audio
├── utils/
│   ├── audioUtils.ts           # Utilidades de audio
│   ├── geographicMapping.ts    # Mapeo de zonas geográficas
│   └── conversationHelpers.ts  # Helpers de conversación
└── config/
    ├── realtimeConfig.ts       # Configuración OpenAI
    ├── businessRules.ts        # Reglas de negocio
    └── routingRules.ts         # Reglas de enrutamiento
```

### Flujo de Datos

#### 1. Inicialización
```
Usuario visita sitio → ConsentBanner → Permisos micrófono → Conexión Realtime
```

#### 2. Conversación
```
Audio input → OpenAI Realtime → Procesamiento → Herramientas → Respuesta → Audio output
```

#### 3. Enrutamiento
```
Ubicación detectada → Mapeo geográfico → Selección ejecutivo → Generación link WhatsApp
```

## Especificaciones Técnicas Detalladas

### Configuración OpenAI Realtime Agent

```typescript
const liranaAgent = new RealtimeAgent({
  name: "Lirvana",
  instructions: `
    Eres Lirvana, una asistente virtual profesional, amable y clara, que representa a https://lirvan.com.

    PERSONALIDAD:
    - Tono profesional pero cercano
    - Habla en primera persona como parte del equipo
    - Transmite confianza y conocimiento
    - Evita sonar robótica, personaliza respuestas

    SALUDO OBLIGATORIO:
    - Siempre incluir pregunta por país, ciudad y departamento de ubicación
    - Ejemplo: "¡Hola! Soy Lirvana. Para ayudarte ya, ¿en qué país, ciudad y departamento estás?"

    CONTEXTO EMPRESA:
    - Lirvan.com: empresa colombiana con presencia en México y Hong Kong
    - Fabricantes de equipos solares (Polux40, Polux40 Pro)
    - Servicios: consultoría, IA, gestión de proyectos
    - Exposolar 2025: Stand 256

    REGLAS DE ENRUTAMIENTO:
    - SIEMPRE preguntar ubicación antes de redirección comercial
    - Zona Andina Sur: Mary Luz
    - Zona Andina Norte: Jhon Alex
    - Córdoba/Santander: Eduardo (general), Marlon (industrial)
    - México: Kelly, Ana, Michael
    - Soporte técnico: Víctor (NO comercial)

    PRODUCTOS:
    - Polux40: uso estándar
    - Polux40 Pro: necesidades avanzadas con mejoras X, Y, Z

    COMPORTAMIENTO:
    - Nunca inventar respuestas
    - Si no sabes algo, ofrecer agendar reunión o contacto directo
    - Mantener conversación activa con preguntas útiles
    - Reconocer límites con amabilidad
  `,
  tools: tools,
  voice: "nova", // Voz femenina profesional
  temperature: 0.7,
  max_tokens: 150
});
```

### Configuración de Audio

```typescript
const audioConfig = {
  sampleRate: 24000,
  channels: 1,
  bitsPerSample: 16,
  inputGain: 1.0,
  outputGain: 1.0,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true
};
```

### Sistema de Herramientas

#### Implementación de Herramientas Core

```typescript
// Herramienta de geolocalización
const getLocationInfo = {
  name: "get_location_info",
  implementation: async (params: LocationParams) => {
    const { country, state_department, city } = params;

    // Validar y normalizar ubicación
    const normalizedLocation = await geolocationService.normalize({
      country,
      state_department,
      city
    });

    // Determinar zona de asignación
    const assignmentZone = routingService.getZone(normalizedLocation);

    return {
      location: normalizedLocation,
      zone: assignmentZone,
      available_executives: routingService.getExecutives(assignmentZone)
    };
  }
};

// Herramienta de redirección comercial
const redirectToSales = {
  name: "redirect_to_sales",
  implementation: async (params: SalesRedirectParams) => {
    const { zone, product_type, user_location } = params;

    // Obtener ejecutivo según zona y tipo de producto
    const executive = routingService.getExecutiveByZoneAndProduct(
      zone,
      product_type
    );

    // Generar mensaje personalizado
    const message = generateWhatsAppMessage(user_location, product_type);

    return {
      executive: executive.name,
      whatsapp_link: executive.whatsapp_link,
      message: message,
      redirect_reason: `Zona: ${zone}, Producto: ${product_type}`
    };
  }
};
```

### Mapeo Geográfico

```typescript
const geographicMapping = {
  colombia: {
    "zona_andina_sur": {
      departments: ["bogota", "boyaca", "cundinamarca", "meta"],
      executive: "mary_luz",
      whatsapp: "https://wa.link/np07vd"
    },
    "zona_andina_norte": {
      departments: ["antioquia", "caldas", "quindio", "risaralda", "valle_del_cauca", "cauca"],
      executive: "jhon_alex",
      whatsapp: "https://wa.link/5sm6ok"
    },
    "zona_cordoba_santander": {
      departments: ["cordoba", "santander", "norte_de_santander", "magdalena", "atlantico"],
      executives: {
        general: { name: "eduardo", whatsapp: "https://wa.link/9fu8z6" },
        industrial: { name: "marlon", whatsapp: "https://wa.link/jq832o" }
      }
    }
  },
  mexico: {
    executives: [
      { name: "kelly", whatsapp: "https://wa.link/plpr1f" },
      { name: "ana", whatsapp: "https://wa.link/2ed7gb" },
      { name: "michael", whatsapp: "https://wa.link/o64i45" }
    ]
  }
};
```

## Experiencia de Usuario

### Flujo de Conversación Típico

#### Escenario 1: Usuario Nuevo
```
1. Usuario: [Accede al sitio]
2. Sistema: Muestra ConsentBanner
3. Usuario: Acepta activar voz
4. Lirvana: "¡Hola! Soy Lirvana. Para ayudarte ya, ¿en qué país, ciudad y departamento estás?"
5. Usuario: "Estoy en Bogotá, Colombia"
6. Lirvana: "Perfecto, estás en nuestra zona Andina Sur. ¿En qué puedo ayudarte hoy? ¿Te interesa conocer nuestros productos Polux40 o necesitas consultoría?"
7. Usuario: "Quiero comprar paneles solares"
8. Lirvana: "Excelente. Te voy a conectar con Mary Luz, quien maneja tu zona. Ella te ayudará con toda la información comercial. [Genera link WhatsApp]"
```

#### Escenario 2: Consulta de Productos
```
1. Usuario: "¿Cuál es la diferencia entre Polux40 y Polux40 Pro?"
2. Lirvana: "¡Claro! Polux40 es ideal para uso residencial estándar, mientras que Polux40 Pro incluye mejoras como [especificaciones técnicas], lo que lo hace perfecto para necesidades comerciales e industriales. ¿Te gustaría que te ayude a elegir cuál se adapta mejor a tu caso?"
3. Usuario: "Es para una empresa"
4. Lirvana: "Perfecto, entonces Polux40 Pro sería ideal para tu empresa. ¿Quieres que te comparta una guía técnica detallada o prefieres agendar una consultoría personalizada?"
```

### Estados de la Interfaz

#### Estados del VoiceOrb
- **Inactivo**: Orbe estático con invitación a tocar
- **Conectando**: Animación de conexión
- **Escuchando**: Animación de escucha activa + partículas
- **Procesando**: Animación de pensamiento
- **Hablando**: Animación de habla + icono Volume2
- **Error**: Indicador visual de error con opción de reconexión

#### Estados del ChatBox
- **Cerrado**: Solo botón flotante de chat
- **Abierto**: Interface completa con:
  - Header con información de Lirvana
  - Área de mensajes con historial
  - Transcripción en vivo (opcional)
  - VoiceOrb integrado (escala reducida)
  - Input de texto alternativo

### Manejo de Errores y Fallbacks

#### Errores de Audio
- Sin permisos de micrófono → Fallback a chat de texto
- Problemas de conexión → Reconexión automática + chat temporal
- Audio de baja calidad → Sugerencias de mejora

#### Errores de API
- Falla OpenAI Realtime → Fallback a Web Speech API
- Límites de rate → Mensaje educativo + chat alternativo
- Problemas de red → Modo offline con funcionalidad básica

## Métricas y Éxito

### KPIs Técnicos
- **Latencia de respuesta**: < 2 segundos
- **Tiempo de conexión**: < 5 segundos
- **Uptime**: > 99%
- **Precisión de transcripción**: > 95%
- **Tasa de errores**: < 1%

### KPIs de Negocio
- **Tasa de conversión a contacto comercial**: > 30%
- **Precisión de enrutamiento geográfico**: > 98%
- **Satisfacción de usuario**: > 4.5/5
- **Tiempo promedio de conversación**: 2-5 minutos
- **Resolución de consultas sin escalación**: > 70%

### Métricas de Adopción
- **Activación de voz vs. chat**: 60/40
- **Conversaciones completadas**: > 80%
- **Reactivación de usuarios**: > 25%

## Consideraciones de Implementación

### Seguridad y Privacidad
- API keys protegidas en backend
- No almacenamiento de audio sin consentimiento explícito
- Cumplimiento con GDPR y normativas colombianas
- Logs de conversación con datos anonimizados
- Rate limiting por IP y sesión

### Performance y Escalabilidad
- CDN para assets de audio
- Compresión de audio en tiempo real
- Conexiones WebSocket optimizadas
- Caching de respuestas frecuentes
- Monitoreo de performance en tiempo real

### Compatibilidad
- **Navegadores soportados**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **Dispositivos**: Desktop, tablet, móvil
- **Sistemas operativos**: Windows, macOS, Linux, iOS, Android
- **Conexiones**: Mínimo 1 Mbps, óptimo 5 Mbps

### Limitations y Consideraciones
- Requiere conexión a internet estable
- Permisos de micrófono obligatorios para voz
- Posible latencia en conexiones lentas
- Uso de datos para audio en tiempo real
- Limitaciones de Web Audio API en algunos navegadores

## Roadmap Post-Lanzamiento

### Versión 1.1 (1 mes post-lanzamiento)
- Analytics avanzados de conversación
- Integración con CRM Lirvan
- Personalización por tipo de cliente
- Soporte para más idiomas

### Versión 1.2 (3 meses)
- IA predictiva para recomendaciones
- Integración con inventario en tiempo real
- Chatbot multimodal (voz + texto + visual)
- API para integraciones externas

### Versión 2.0 (6 meses)
- Asistente proactivo con notificaciones
- Realidad aumentada para productos
- Integración IoT con equipos Polux
- Marketplace integrado

## Criterios de Aceptación Final

### Funcionales
- [ ] Conversación fluida en tiempo real con latencia < 2s
- [ ] Detección automática de ubicación y asignación correcta 100% de casos de prueba
- [ ] Redirección exitosa a WhatsApp con mensaje contextual
- [ ] Base de conocimiento respondiendo > 90% consultas comunes
- [ ] Manejo de interrupciones naturales
- [ ] Soporte completo ES/EN

### Técnicos
- [ ] Integración completa OpenAI Realtime API
- [ ] Fallbacks funcionales para todos los escenarios de fallo
- [ ] Performance óptimo en todos los navegadores soportados
- [ ] Seguridad de API keys y datos de usuario
- [ ] Logging y monitoring operacional

### Negocio
- [ ] Personalidad Lirvana consistente con brand guidelines
- [ ] Flujos de venta optimizados por zona geográfica
- [ ] Integración completa con WhatsApp Business
- [ ] Información actualizada de productos y servicios
- [ ] Capacitación de equipo comercial completada

## Conclusión

Esta implementación transformará la interfaz mockup actual en un asistente virtual de clase empresarial que representará efectivamente a Lirvan.com, proporcionando valor inmediato a los visitantes del sitio web y canalizando leads calificados al equipo comercial apropiado según su ubicación geográfica.