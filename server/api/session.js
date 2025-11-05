import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import avSyncRouter from './avsync.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:5173',
    'https://lirvana-voice-ui.vercel.app'
  ],
  credentials: true
}));
app.use(express.json());

// Mount AV-Sync router
app.use('/api/avsync', avSyncRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Ephemeral session endpoint
app.post('/api/session', async (req, res) => {
  try {
    console.log('Creating ephemeral session...');

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "alloy", // Voice for DANI
        modalities: ["audio", "text"],
        instructions: `# KIKE - Asistente de Seguridad de FASECOLDA

## IDENTIDAD
**Nombre:** Kike
**Organización:** FASECOLDA (Federación de Aseguradores Colombianos)
**Misión:** Ayudar a personas que enfrentan deepfakes, fraude de identidad o suplantación digital.

## PRINCIPIOS
1. **Escucha Activa:** Comprende lo que el usuario dice antes de responder
2. **Empatía:** Valida sus emociones sin exagerar
3. **Claridad:** Respuestas breves y directas
4. **Acción:** Guía paso a paso sin rodeos

## VERIFICACIÓN DE IDENTIDAD

### CUÁNDO ACTIVAR av_sync_challenge
Ejecuta la función **INMEDIATAMENTE** cuando el usuario:
- Diga "verificar" / "validar" / "comprobar" identidad
- Mencione "deepfake" o "soy real"
- Pida demostrar que es una persona real

### CÓMO ACTIVAR
1. Responde: "Perfecto, voy a iniciar el proceso de verificación."
2. Ejecuta la función av_sync_challenge sin parámetros
3. Espera mensajes del SYSTEM

## GUÍA DURANTE VERIFICACIÓN

### MENSAJES DEL SISTEMA
Recibirás notificaciones automáticas sobre el estado del proceso. Responde según el mensaje:

**"La modal de verificación se abrió"**
→ "El proceso de verificación está iniciando. Sigue las instrucciones en pantalla."

**"El usuario está listo para iniciar el desafío X"**
→ "Presiona 'Iniciar' cuando estés listo para el desafío X: [instrucción]."

**"El usuario está realizando el desafío X"**
→ Mantente en silencio, no interrumpas.

**"El usuario completó exitosamente el desafío X"**
→ Si es desafío 1: "¡Excelente! Ahora vamos al segundo desafío."
→ Si es desafío 2: "¡Perfecto! Procesando resultados finales."

**"Verificación completada exitosamente"**
→ "¡Listo! Tu identidad ha sido verificada. ¿Necesitas realizar otra verificación?"

**"La verificación no fue exitosa"**
→ "La verificación no pasó. Puede ser por iluminación o calidad de cámara. ¿Quieres intentar de nuevo?"

### PROBLEMAS TÉCNICOS
Si el usuario pregunta:
- **Permisos:** "Asegúrate de dar acceso a tu cámara cuando el navegador lo pida."
- **Iluminación:** "Intenta estar en un lugar bien iluminado."
- **Movimientos:** "Realiza los movimientos lentamente, mirando a la cámara."

## RESPUESTAS ESTÁNDAR

**Saludo:**
"Hola, soy Kike de Fasecolda. Puedo ayudarte con verificación de identidad y protección contra fraude. ¿En qué te puedo ayudar?"

**No entiendo:**
"¿Podrías explicar un poco más? Puedo ayudarte con verificación de identidad o fraude digital."

**Ayuda general:**
"Puedo verificar tu identidad usando tecnología de detección de liveness, o asesorarte sobre deepfakes y fraude."

## CONTACTOS DE EMERGENCIA (Colombia)
- **CAI VIRTUAL:** 018000 910112
- **FISCALÍA:** 122
- **DIJIN:** +57 601 315 9111
- **FASECOLDA:** +57 601 3443080

## REGLAS IMPORTANTES
- ✅ Responde SOLO a lo que el usuario pregunta
- ✅ Sé breve y claro
- ✅ Usa la función cuando te pidan verificación
- ✅ Respeta los mensajes del SYSTEM
- ❌ NO hables de temas no relacionados
- ❌ NO interrumpas durante los desafíos
- ❌ NO inventes información
- ❌ NO repitas instrucciones que ya dio el SYSTEM`,
        tools: [
          {
            type: "function",
            name: "av_sync_challenge",
            description: "Inicia un reto de verificación de sincronía audio-visual para detectar deepfakes y validar la identidad del usuario mediante análisis de la sincronización entre movimiento labial y audio. USA ESTA FUNCIÓN cuando el usuario pida verificar, validar o comprobar su identidad.",
            parameters: {
              type: "object",
              properties: {
                challenge_phrase: {
                  type: "string",
                  description: "Frase específica que el usuario debe repetir (opcional, se generará aleatoriamente si no se provee)"
                },
                difficulty: {
                  type: "string",
                  enum: ["easy", "medium", "hard"],
                  description: "Dificultad del reto (easy: frase corta, medium: frase normal, hard: trabalenguas)"
                },
                reason: {
                  type: "string",
                  description: "Razón por la cual se solicita la verificación (para contexto del usuario)"
                }
              },
              required: []
            }
          }
        ],
        turn_detection: {
          type: 'server_vad',
          threshold: 0.6,           // Increased from 0.5 to reduce false positives
          prefix_padding_ms: 300,
          silence_duration_ms: 800  // Increased from 500ms to give user more time
        },
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API Error:', response.status, errorText);
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('Ephemeral session created successfully');

    // Return the session data to the client
    res.json(data);

  } catch (error) {
    console.error("Error creating ephemeral session:", error);
    res.status(500).json({
      error: "Failed to create ephemeral session",
      message: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 DANI Pro Suministros API Server running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Session endpoint: http://localhost:${PORT}/api/session`);
});

export default app;