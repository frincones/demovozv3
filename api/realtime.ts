import { NextApiRequest, NextApiResponse } from 'next';

// Simple proxy to protect OpenAI API key
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, ...payload } = req.body;

    // Basic rate limiting (in production, use a proper rate limiter)
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Validate action
    const allowedActions = ['connect', 'send_audio', 'send_message', 'disconnect'];
    if (!allowedActions.includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Here you would proxy to OpenAI Realtime API
    // For now, return a mock response
    const response = {
      success: true,
      action,
      timestamp: new Date().toISOString(),
      message: 'API proxy working - integrate with OpenAI Realtime when ready'
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Realtime API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Export config for Vercel
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}