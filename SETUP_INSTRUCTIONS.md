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
   - **Authorization callback URL**: `https://your-app.netlify.app/.netlify/functions/github-callback`
     - For local development: `http://localhost:8888/.netlify/functions/github-callback`
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

Update the `CLIENT_ID` in `github-auth.js` if needed (though it's now handled server-side).

Make sure your `REDIRECT_URI` matches what you configured in GitHub:
- Production: `https://your-app.netlify.app`
- Local: `http://localhost:8888`

## Step 5: Run Locally (Optional)

```bash
npm run netlify:dev
```

This will start the Netlify dev server at `http://localhost:8888`

## Step 6: Deploy to Netlify

1. Push your code to GitHub
2. Connect your repo to Netlify
3. Set the environment variables in Netlify dashboard
4. Deploy

## Important Notes

- **Never commit your client secret** to version control
- The callback URL must exactly match between GitHub settings and your deployment
- PKCE is still used for additional security even though we have a backend
- The Netlify function handles the sensitive token exchange, keeping your client secret secure

## Troubleshooting

### CORS Errors
- Make sure you're calling the Netlify function endpoint (`/.netlify/functions/github-callback`)
- Don't call GitHub's token endpoint directly from the browser

### redirect_uri_mismatch
- Verify the callback URL in GitHub settings exactly matches your app's URL
- Include the full path to the Netlify function

### Invalid client_secret
- Ensure environment variables are set correctly in Netlify
- Check that there are no extra spaces or characters
