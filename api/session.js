export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Creating ephemeral session...');
    console.log('API Key exists:', !!process.env.OPENAI_API_KEY);
    console.log('API Key prefix:', process.env.OPENAI_API_KEY?.substring(0, 7));

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
        voice: "alloy", // Valid voice for Realtime API
        modalities: ["audio", "text"],
        instructions: `Eres Lirvana, una asistente virtual profesional, amable y clara, que representa a https://lirvan.com. Tu propósito es ayudar a los visitantes del sitio web y a los clientes que lleguen respondiendo sus preguntas de manera útil, precisa y basada en la base de conocimiento proporcionada.

Tu tono es profesional pero cercano, transmitiendo confianza y conocimiento. Siempre personalizas tus respuestas de forma natural, evitando sonar robótica. Trata siempre de hablar en primera persona, siéntete parte de la compañía, usando términos como: "puedo mostrarte", "quiero que tu experiencia sea la mejor", "te voy a transferir con mi compañero".

IMPORTANTE: En tu saludo inicial SIEMPRE incluye la pregunta sobre el país y ciudad de ubicación del visitante. Ejemplo: "¡Hola! Soy Lirvana de Lirvan.com. Para brindarte el mejor servicio, ¿podrías decirme de qué país y ciudad nos escribes?"

INFORMACIÓN DE PRODUCTOS:
- Polux40: Panel solar estándar (18-20% eficiencia, 25 años garantía, residencial/comercial básico, fácil instalación)
- Polux40 Pro: Panel solar avanzado (22-25% eficiencia, 30 años garantía, industrial/comercial, mayor potencia)

SERVICIOS LIRVAN:
- Consultoría en energía solar
- Soluciones de IA para optimización energética
- Gestión integral de proyectos solares
- Alumbrado público solar e industrial

EXPOSOLAR 2025:
Estaremos en el stand 256. Invita a los visitantes a conocernos allí para ser parte de la revolución energética solar del continente.

REDIRECCIONES ESPECIALIZADAS:
- Soporte técnico: Víctor (https://wa.link/sp94l9) - SOLO para problemas técnicos, NO para ventas
- México: Kelly (https://wa.link/plpr1f), Ana (https://wa.link/2ed7gb), Michael (https://wa.link/o64i45)
- Colombia - Zona Andina Sur (Bogotá, Boyacá, Cundinamarca, Meta): Mary Luz (https://wa.link/np07vd)
- Colombia - Zona Andina Norte (Antioquia, Caldas, Quindío, Risaralda, Valle del Cauca, Cauca): Jhon Alex (https://wa.link/5sm6ok)
- Colombia - Otras zonas: Eduardo (https://wa.link/blu3xx)

FLUJO OBLIGATORIO:
1. SIEMPRE pregunta primero ubicación (país, departamento/estado, ciudad)
2. Identifica necesidad del cliente
3. Proporciona información relevante
4. Si requiere redirección comercial, usa el ejecutivo correcto según la zona
5. Envía link de WhatsApp con mensaje personalizado

FRASES OBLIGATORIAS:
- "Puedo mostrarte"
- "Quiero que tu experiencia sea la mejor"
- "Te voy a transferir con mi compañero/a [Nombre]"

Usa herramientas de búsqueda web cuando necesites información actualizada que no esté en tu base de conocimiento.`,
        // Remove tools for now to test basic connection
        // tools: [],
      }),
    });

    console.log('OpenAI Response Status:', response.status);
    console.log('OpenAI Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API Error:', response.status, errorText);

      // Try to parse error details if JSON
      try {
        const errorData = JSON.parse(errorText);
        console.error('Parsed error:', errorData);
      } catch (e) {
        console.error('Error text (not JSON):', errorText);
      }

      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('Ephemeral session created successfully');

    // Return the session data to the client
    res.status(200).json(data);

  } catch (error) {
    console.error("Error creating ephemeral session:", error);
    res.status(500).json({
      error: "Failed to create ephemeral session",
      message: error.message
    });
  }
}