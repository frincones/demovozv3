export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const diagnostics = {
    timestamp: new Date().toISOString(),
    apiKeyConfigured: !!process.env.OPENAI_API_KEY,
    apiKeyPrefix: process.env.OPENAI_API_KEY?.substring(0, 7) || 'not-set',
    tests: []
  };

  try {
    // Test 1: Basic API access
    console.log('Testing basic OpenAI API access...');
    const basicTest = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    diagnostics.tests.push({
      test: 'basic_api_access',
      status: basicTest.status,
      success: basicTest.ok,
      message: basicTest.ok ? 'Basic API access working' : `Failed with status ${basicTest.status}`
    });

    if (!basicTest.ok) {
      const errorText = await basicTest.text();
      diagnostics.tests[0].error = errorText;
    }

    // Test 2: Realtime API session creation (minimal)
    console.log('Testing Realtime API access...');
    const realtimeTest = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'alloy',
        modalities: ['text'], // Start with just text
        instructions: 'You are a helpful assistant.'
      })
    });

    diagnostics.tests.push({
      test: 'realtime_api_access',
      status: realtimeTest.status,
      success: realtimeTest.ok,
      message: realtimeTest.ok ? 'Realtime API access working' : `Failed with status ${realtimeTest.status}`
    });

    if (!realtimeTest.ok) {
      const errorText = await realtimeTest.text();
      diagnostics.tests[1].error = errorText;
      try {
        const errorData = JSON.parse(errorText);
        diagnostics.tests[1].parsedError = errorData;
      } catch (e) {
        // Error is not JSON
      }
    } else {
      const sessionData = await realtimeTest.json();
      diagnostics.tests[1].sessionCreated = true;
      diagnostics.tests[1].sessionId = sessionData.id;
    }

    // Test 3: Audio modality test (if basic realtime works)
    if (realtimeTest.ok) {
      console.log('Testing Audio modality...');
      const audioTest = await fetch('https://api.openai.com/v1/realtime/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-realtime-preview-2024-12-17',
          voice: 'alloy',
          modalities: ['audio', 'text'], // Test with audio
          instructions: 'You are a helpful assistant.'
        })
      });

      diagnostics.tests.push({
        test: 'audio_modality',
        status: audioTest.status,
        success: audioTest.ok,
        message: audioTest.ok ? 'Audio modality working' : `Failed with status ${audioTest.status}`
      });

      if (!audioTest.ok) {
        const errorText = await audioTest.text();
        diagnostics.tests[2].error = errorText;
      }
    }

    // Overall assessment
    const allTestsPassed = diagnostics.tests.every(test => test.success);
    diagnostics.overall = {
      status: allTestsPassed ? 'healthy' : 'issues_detected',
      readyForProduction: allTestsPassed,
      recommendations: []
    };

    if (!diagnostics.tests[0]?.success) {
      diagnostics.overall.recommendations.push('Check API key validity and account status');
    }
    if (!diagnostics.tests[1]?.success) {
      diagnostics.overall.recommendations.push('Request access to Realtime API from OpenAI');
    }
    if (!diagnostics.tests[2]?.success) {
      diagnostics.overall.recommendations.push('Audio modality may not be available');
    }

    res.status(200).json(diagnostics);

  } catch (error) {
    console.error('Diagnostic test failed:', error);
    res.status(500).json({
      ...diagnostics,
      error: error.message,
      overall: {
        status: 'error',
        readyForProduction: false,
        message: 'Diagnostic test encountered an error'
      }
    });
  }
}