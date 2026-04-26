const fetch = require('node-fetch');

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

    // Exchange code for token
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri
      })
    });

    const data = await response.json();

    if (data.error) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: data.error, error_description: data.error_description }) 
      };
    }

    // Return only the access token and user info (never return client_secret)
    return {
      statusCode: 200,
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
