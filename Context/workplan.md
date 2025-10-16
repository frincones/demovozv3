# Lirvana Voice UI - Plan de Trabajo de Implementación

## Objetivo
Integrar OpenAI Realtime API con la interfaz de voz existente para crear una experiencia completa de asistente virtual de voz que represente a Lirvan.com.

## Actividades por Fase

### Fase 1: Configuración Base y Dependencias
**Duración estimada: 1-2 días**

#### 1.1 Configuración del Entorno
- [x] Instalar dependencias de OpenAI
  - [x] `npm install openai` (agregado al package.json)
  - [ ] Instalación pendiente de resolución de problema Node.js
- [x] Crear archivo `.env.local` con variables necesarias
  - [x] `VITE_OPENAI_API_KEY`
  - [x] `VITE_API_BASE_URL` (para proxy)
- [ ] Configurar proxy/backend para proteger API key
  - [ ] Crear API route en Vercel (`/api/realtime`)
  - [ ] Implementar middleware de autenticación básica

#### 1.2 Configuración de Tipos TypeScript
- [x] Crear `src/types/realtime.ts` con interfaces de OpenAI
- [x] Definir tipos para eventos de audio y conversación
- [x] Configurar tipos para herramientas/funciones específicas de Lirvana

### Fase 2: Implementar Core de Audio y WebSocket
**Duración estimada: 2-3 días**

#### 2.1 Servicios Base
- [x] Crear `src/services/audioService.ts`
  - [x] Manejo de permisos de micrófono
  - [x] Configuración de MediaRecorder
  - [x] Procesamiento de audio en tiempo real
- [x] Crear `src/services/realtimeService.ts`
  - [x] Cliente OpenAI Realtime
  - [x] Manejo de conexión WebSocket
  - [x] Configuración de eventos
- [x] Crear `src/services/speechService.ts`
  - [x] Integración con Web Speech API (fallback)
  - [x] Utilidades de audio

#### 2.2 Hooks Personalizados
- [x] Crear `src/hooks/useRealtime.ts`
  - [x] Hook principal para conexión Realtime
  - [x] Manejo de estados de conexión
  - [x] Gestión de eventos de audio
- [x] Crear `src/hooks/useAudio.ts`
  - [x] Hook para manejo de audio del navegador
  - [x] Estados de grabación y reproducción
- [x] Crear `src/hooks/useSpeechRecognition.ts`
  - [x] Hook para reconocimiento de voz (fallback)

### Fase 3: Integrar OpenAI Realtime API
**Duración estimada: 3-4 días**

#### 3.1 Configuración del Agente Lirvana
- [x] Configurar RealtimeAgent con instrucciones específicas
  - [x] Personalidad y tono profesional pero cercano
  - [x] Contexto de empresa (Lirvan.com)
  - [x] Instrucciones para solicitar ubicación en saludo
- [x] Implementar herramientas específicas de negocio
  - [x] `get_location_info`: Obtener ubicación del usuario
  - [x] `redirect_to_sales`: Redireccionar según zona geográfica
  - [x] `schedule_consultation`: Agendar consultoría
  - [x] `product_comparison`: Comparación productos Polux40/Pro
  - [x] `exposolar_info`: Información del evento
  - [x] `company_info`: Información de la empresa
  - [x] `redirect_support`: Redirección a soporte técnico

#### 3.2 Manejo de Eventos y Flujo de Conversación
- [x] Implementar eventos de conexión/desconexión
- [x] Configurar eventos de audio (input/output)
- [x] Implementar manejo de interrupciones
- [x] Configurar transcripción en tiempo real
- [x] Implementar manejo de idiomas (ES/EN)

### Fase 4: Actualizar Componentes Existentes
**Duración estimada: 2-3 días**

#### 4.1 Actualizar VoiceOrb.tsx
- [x] Conectar con estados reales de audio
- [x] Integrar visualización de nivel de audio en tiempo real
- [x] Manejar eventos de click para iniciar/detener conversación
- [x] Añadir indicadores visuales de conexión

#### 4.2 Actualizar ChatBox.tsx
- [x] Conectar con transcripción real de OpenAI
- [x] Implementar envío de mensajes a OpenAI Realtime
- [x] Mostrar respuestas reales del asistente
- [x] Implementar manejo dinámico de idiomas
- [x] Añadir indicadores de estado de conexión
- [x] Agregar banner de ejecutivo asignado
- [x] Integrar botón directo a WhatsApp

#### 4.3 Actualizar ConsentBanner.tsx
- [x] Integrar solicitud real de permisos de micrófono
- [x] Manejar casos de error en permisos
- [x] Actualizar texto para reflejar funcionalidad real

#### 4.4 Actualizar Index.tsx (Página Principal)
- [x] Integrar hooks de audio y realtime
- [x] Manejar flujo completo de conversación
- [x] Implementar manejo de errores y reconexión
- [x] Conectar con sistema de herramientas
- [x] Integrar hook principal useLirvana

### Fase 5: Implementar Funcionalidades Específicas de Lirvana
**Duración estimada: 3-4 días**

#### 5.1 Sistema de Geolocalización y Asignación
- [x] Implementar detección de ubicación del usuario
- [x] Crear base de datos/mapping de zonas geográficas
  - [x] Zona Andina Sur: Mary Luz
  - [x] Zona Andina Norte: Jhon Alex
  - [x] Zona Córdoba/Santander: Eduardo/Marlon
  - [x] México: Kelly, Ana, Michael
- [x] Implementar lógica de asignación automática
- [x] Crear herramientas para redirección a WhatsApp

#### 5.2 Base de Conocimiento de Productos
- [x] Implementar información de productos Polux40 y Polux40 Pro
- [x] Crear comparativas automáticas
- [x] Integrar información de servicios (consultoría, IA, gestión)
- [x] Añadir información sobre Exposolar 2025 (Stand 256)

#### 5.3 Sistema de Herramientas Específicas
- [x] `get_location_info`: Procesar solicitud de ubicación
- [x] `redirect_to_sales`: Redireccionar a ejecutivo comercial
- [x] `redirect_to_support`: Redireccionar a soporte técnico
- [x] `product_comparison`: Comparar productos
- [x] `schedule_consultation`: Agendar consultoría
- [x] `exposolar_info`: Información del evento
- [x] `company_info`: Información de la empresa

### Fase 6: Optimizaciones y Funcionalidades Avanzadas
**Duración estimada: 2-3 días**

#### 6.1 Manejo Avanzado de Conversación
- [ ] Implementar contexto de conversación persistente
- [ ] Configurar interrupciones naturales
- [ ] Implementar turn-taking inteligente
- [ ] Manejar cambios de contexto en la conversación

#### 6.2 Optimizaciones de Audio
- [ ] Configurar calidad de audio óptima
- [ ] Implementar cancelación de eco
- [ ] Optimizar latencia de red
- [ ] Implementar compresión de audio

#### 6.3 Manejo de Errores y Fallbacks
- [ ] Implementar fallback a chat cuando falla audio
- [ ] Sistema de reconexión automática
- [ ] Estados de error informativos
- [ ] Fallback a Web Speech API si es necesario

### Fase 7: Seguridad y Producción
**Duración estimada: 1-2 días**

#### 7.1 Seguridad
- [ ] Implementar proxy backend completo
- [ ] Configurar rate limiting
- [ ] Validar y sanitizar inputs
- [ ] Implementar logs de seguridad

#### 7.2 Testing y QA
- [ ] Crear tests unitarios para servicios
- [ ] Tests de integración para hooks
- [ ] Testing manual de flujos completos
- [ ] Testing en diferentes navegadores

#### 7.3 Deployment y Monitoreo
- [ ] Configurar variables de entorno en Vercel
- [ ] Implementar logging y analytics
- [ ] Configurar alertas de error
- [ ] Documentar deployment

### Fase 8: Documentación y Entrenamiento
**Duración estimada: 1 día**

#### 8.1 Documentación Técnica
- [ ] Documentar arquitectura implementada
- [ ] Crear guías de troubleshooting
- [ ] Documentar APIs y herramientas
- [ ] Crear README actualizado

#### 8.2 Documentación de Usuario
- [ ] Crear guía de uso del asistente de voz
- [ ] Documentar comandos y funcionalidades
- [ ] Crear FAQ técnico

## Dependencias y Requisitos

### Técnicos
- Node.js y npm
- OpenAI API Key
- Acceso a micrófono del navegador
- Conexión WebSocket estable

### De Negocio
- Definición final de herramientas y funcionalidades
- Validación de flujos de asignación geográfica
- Aprobación de personalidad y tono del asistente

## Estimación Total
**Duración total estimada: 15-20 días de desarrollo**

## Notas Importantes
- Se recomienda desarrollo iterativo con testing continuo
- Cada fase debe incluir testing antes de continuar
- Mantener comunicación constante con stakeholders de negocio
- Considerar limitations técnicas del navegador
- Planificar para diferentes dispositivos y conexiones

## Criterios de Éxito
- [ ] Conversación fluida en tiempo real
- [ ] Asignación correcta según ubicación geográfica
- [ ] Integración completa con sistemas de WhatsApp
- [ ] Experiencia de usuario sin fricciones
- [ ] Performance óptimo en producción