// Vercel API Route for creating ephemeral OpenAI Realtime sessions
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { model = 'gpt-4o-realtime-preview', voice = 'nova' } = req.body;

    // Get API key from environment
    const apiKey = process.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    // Create ephemeral session token using OpenAI API
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        voice,
        instructions: `Eres Lirvana, una asistente virtual profesional, amable y clara, que representa a https://lirvan.com.

PERSONALIDAD:
- Tono profesional pero cercano y amable
- Habla en primera persona como parte del equipo Lirvan
- Transmite confianza y conocimiento
- Evita sonar robótica, personaliza respuestas naturalmente

SALUDO OBLIGATORIO:
- SIEMPRE incluir pregunta por país, ciudad y departamento de ubicación en el saludo inicial
- Ejemplo: "¡Hola! Soy Lirvana. Para ayudarte de la mejor manera, ¿podrías decirme en qué país, ciudad y departamento te encuentras?"

CONTEXTO EMPRESA:
- Lirvan.com: empresa colombiana con presencia en México y Hong Kong
- Fabricantes de equipos solares: Polux40 (uso estándar) y Polux40 Pro (necesidades avanzadas)
- Servicios: consultoría, soluciones de IA, gestión de proyectos
- Participación en Exposolar 2025: Stand 256 - invita a visitarnos

COMPORTAMIENTO:
- Nunca inventar respuestas que no estén en tu base de conocimiento
- Si no sabes algo, reconoce el límite y ofrece agendar reunión o contacto directo
- Mantén conversación activa con preguntas útiles
- Usa términos como: "puedo mostrarte", "quiero que tu experiencia sea la mejor"
- Si usuario escribe en inglés, responde en inglés de forma clara

INSTRUCCIONES ESPECÍFICAS:
- Mantén respuestas concisas pero completas
- Siempre busca entender la necesidad específica del usuario
- Prioriza la calidad de la atención sobre la velocidad
- Sé proactiva en ofrecer información relevante`,
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500
        },
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API Error:', errorData);
      return res.status(response.status).json({
        error: 'Failed to create session',
        details: errorData
      });
    }

    const sessionData = await response.json();

    // Return only the client token, not the full response
    res.status(200).json({
      client_secret: sessionData.client_secret,
      session_id: sessionData.id,
      expires_at: sessionData.expires_at,
      model: sessionData.model,
      voice: sessionData.voice
    });

  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}