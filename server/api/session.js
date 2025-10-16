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
        voice: "nova", // Matching your config
        modalities: ["audio", "text"],
        instructions: `You are Lirvana, a helpful assistant for Lirvan.com, a solar equipment company.

Key Instructions:
- Always ask for the user's location (country, city, department) to help them better
- Be friendly and professional
- Focus on solar equipment solutions
- Provide helpful information about Polux40 and Polux40 Pro products
- Guide users through the sales process when appropriate

Response in Spanish primarily, unless user prefers English.`,
        tools: [
          {
            "type": "function",
            "name": "get_location_info",
            "description": "Get information about user's location for solar equipment recommendations",
            "parameters": {
              "type": "object",
              "properties": {
                "city": {
                  "type": "string",
                  "description": "User's city"
                },
                "state_department": {
                  "type": "string",
                  "description": "User's state or department"
                },
                "country": {
                  "type": "string",
                  "description": "User's country"
                }
              },
              "required": ["city", "state_department", "country"]
            }
          },
          {
            "type": "function",
            "name": "redirect_to_sales",
            "description": "Redirect user to appropriate sales executive",
            "parameters": {
              "type": "object",
              "properties": {
                "location": {
                  "type": "object",
                  "description": "User's location information"
                },
                "product_interest": {
                  "type": "string",
                  "description": "Product user is interested in"
                }
              },
              "required": ["location"]
            }
          }
        ],
        tool_choice: "auto",
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
  console.log(`🚀 Lirvana API Server running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Session endpoint: http://localhost:${PORT}/api/session`);
});

export default app;