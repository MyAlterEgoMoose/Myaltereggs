// Netlify Function to exchange GitHub OAuth code for access token
// This runs server-side, avoiding CORS issues

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { code, state, redirect_uri } = JSON.parse(event.body);
    
    // Validate required parameters
    if (!code || !redirect_uri) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'Missing required parameters' }) 
      };
    }

    // Validate client credentials exist
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.error('Missing GitHub credentials in environment variables');
      return { 
        statusCode: 500, 
        body: JSON.stringify({ error: 'Server configuration error', message: 'Missing GitHub OAuth credentials' }) 
      };
    }

    // Exchange code for token using native fetch (Node 18+)
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('GitHub OAuth error:', data.error, data.error_description);
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: data.error, error_description: data.error_description }) 
      };
    }

    // Return only the access token and user info (never return client_secret)
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        access_token: data.access_token,
        token_type: data.token_type,
        scope: data.scope
      })
    };

  } catch (error) {
    console.error('Token exchange error:', error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: 'Internal server error', message: error.message }) 
    };
  }
};
