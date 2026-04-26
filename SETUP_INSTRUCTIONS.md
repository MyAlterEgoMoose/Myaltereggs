# GitHub OAuth Setup Instructions

## Prerequisites
- A GitHub account
- Your app deployed on Netlify (or running locally with Netlify Dev)

## Step 1: Create GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click "New OAuth App" or "Register a new application"
3. Fill in the following:
   - **Application name**: Your app name (e.g., "My Alter Ego")
   - **Homepage URL**: `https://your-app.netlify.app` (or your production URL)
   - **Authorization callback URL**: `https://your-app.netlify.app` 
     - For local development: `http://localhost:8888`
   - **Note**: The callback URL should be your main app URL, NOT the function URL. The function handles the token exchange internally.
4. Click "Register application"
5. Copy the **Client ID** shown
6. Click "Generate a new client secret" and copy the **Client Secret**

## Step 2: Configure Environment Variables

### For Production (Netlify Dashboard):
1. Go to your site on Netlify dashboard
2. Navigate to Site settings → Build & deploy → Environment
3. Add these environment variables:
   - `GITHUB_CLIENT_ID`: Your GitHub OAuth Client ID
   - `GITHUB_CLIENT_SECRET`: Your GitHub OAuth Client Secret

### For Local Development:
Create a `.env` file in the root directory:
```
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
```

## Step 3: Install Dependencies

```bash
npm install
```

## Step 4: Update Your Code

The `CLIENT_ID` in `github-auth.js` is still used for the initial authorization redirect. Make sure your `REDIRECT_URI` matches what you configured in GitHub:
- Production: `https://your-app.netlify.app`
- Local: `http://localhost:8888`

The code will automatically detect the OAuth callback and use the Netlify function for token exchange.

## Step 5: Run Locally (Optional)

```bash
npm run netlify:dev
```

This will start the Netlify dev server at `http://localhost:8888`

## Step 6: Deploy to Netlify

1. Push your code to GitHub
2. Connect your repo to Netlify
3. Set the build command: Leave blank (already configured in netlify.toml)
4. Set the publish directory: `.` (current directory)
5. Set the functions directory: `netlify/functions` (already configured in netlify.toml)
6. Add the environment variables in Netlify dashboard (GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET)
7. Deploy

## Important Notes

- **Never commit your client secret** to version control
- The callback URL in GitHub settings must match your app's main URL (not the function URL)
- PKCE is used for additional security
- The Netlify function handles the sensitive token exchange, keeping your client secret secure
- Node.js 18+ is required for native fetch (Netlify uses Node 18+ by default)

## Troubleshooting

### CORS Errors
- Make sure you're calling the Netlify function endpoint (`/.netlify/functions/github-callback`)
- Don't call GitHub's token endpoint directly from the browser
- Check that the function is deployed correctly

### redirect_uri_mismatch
- Verify the callback URL in GitHub settings exactly matches your app's main URL
- The redirect_uri in your code should match the GitHub OAuth app setting

### Invalid client_secret or Server configuration error
- Ensure environment variables are set correctly in Netlify dashboard
- Check that there are no extra spaces or characters
- Redeploy after setting environment variables

### Function not found (404)
- Verify netlify.toml is in your project root
- Check that the function file exists at `netlify/functions/github-callback.js`
- Make sure you pushed the netlify folder to your repository
