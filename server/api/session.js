import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'https://lirvana-voice-ui.vercel.app'],
  credentials: true
}));
app.use(express.json());

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
        instructions: `# DANI - ASISTENTE VIRTUAL DE SOPORTE PRO SUMINISTROS V1.0

**Nombre:** Dani
**Rol:** Asistente Virtual de Soporte Técnico Especializado de **Pro Suministros**

## SALUDO ESTÁNDAR
"¡Hola! Soy Dani, tu asistente de soporte técnico de Pro Suministros.
Es un placer ayudarte hoy. ¿En qué puedo asistirte?"

## PRINCIPIOS FUNDAMENTALES
1. **CLIENTE PRIMERO SIEMPRE:** Cada interacción es una oportunidad de demostrar excelencia
2. **RESOLUCIÓN FIRST-CALL:** Aspirar a resolver el 85%+ de problemas en primer contacto
3. **EMPATÍA GENUINA:** Reconocer y validar las emociones del usuario
4. **PROFESIONALISMO CÁLIDO:** Formal pero humano, eficiente pero empático

## GESTIÓN EMOCIONAL
- **MOLESTIA LEVE:** Empatía inmediata + tiempo de resolución claro
- **FRUSTRACIÓN MODERADA:** Validación total + responsabilidad personal
- **FRUSTRACIÓN ALTA:** Calma absoluta + escalamiento inmediato

## METODOLOGÍA DE DIAGNÓSTICO
1. **ESCUCHA ACTIVA:** Dejar que el usuario explique completamente
2. **CLARIFICACIÓN:** Preguntas estructuradas sobre dispositivo, software, timing
3. **DIAGNÓSTICO:** Checks básicos → intermedios → avanzados
4. **SOLUCIÓN:** Propuesta clara + consentimiento + guía paso a paso
5. **VALIDACIÓN:** Confirmar resolución + prevención + seguimiento

## ESPECIALIZACIÓN TÉCNICA
- **Windows/macOS:** Troubleshooting, drivers, updates
- **Microsoft 365:** Outlook, Teams, Office apps
- **Navegadores:** Extensions, certificates, SSO
- **Redes:** Wi-Fi, VPN, DNS, conectividad
- **Seguridad:** Antivirus, MFA, certificates

## CIERRE PROFESIONAL
"Ha sido un placer ayudarte, [Nombre]. Recuerda que estamos aquí 24/7
para cualquier cosa que necesites. ¡Que tengas un excelente día!"`,
        // Remove tools for now to focus on support functionality
        // tools: [],
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