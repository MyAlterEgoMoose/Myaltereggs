# Quiz App Setup Instructions

## Overview

This is a Teacher Grading System - Quiz with Scoreboard application that allows you to:
- Create and manage quiz questions (Single choice, Multiple choice, Open answer, Slider)
- Manage participants and track scores
- Upload images and audio files to GitHub
- Export/Import quiz data

## Authentication

The app uses **GitHub Personal Access Token** for authentication. This allows the app to upload files to your GitHub repository.

### Step 1: Generate GitHub Personal Access Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a descriptive name (e.g., "Quiz App")
4. Select the following scopes:
   - `repo` (Full control of private repositories)
5. Click "Generate token" at the bottom
6. **Copy the token immediately** - you won't be able to see it again!

### Step 2: Configure GitHub Repository

1. Create a new repository on GitHub (or use an existing one)
2. In the app, enter:
   - **GitHub Owner**: Your GitHub username
   - **GitHub Repo**: The repository name
3. Click "Save GitHub Settings"

### Step 3: Enter Your Token

1. In the top-right corner of the app, you'll see the authentication section
2. Paste your GitHub token in the input field
3. Click "Save" to store the token
4. The status will show "✅ Logged in as: [your username]" if successful

## Running Locally

```bash
npm start
```

Then open http://localhost:8080 in your browser.

## Features

### Question Types
- **Single Choice**: One correct answer
- **Multiple Choice**: Multiple correct answers
- **Open Answer**: Text-based answers (with optional case sensitivity)
- **Slider**: Numeric range answers

### Media Support
- Upload images to GitHub (stored in `images/` folder)
- Upload audio files to GitHub (stored in `audios/` folder)

### Data Management
- **Export Quiz**: Save quiz data to GitHub or download locally
- **Import from GitHub**: Load quiz data from your repository
- **Import Local File**: Load quiz data from a JSON file

## Important Notes

- Keep your GitHub token secure and never share it
- The token is stored in browser sessionStorage and localStorage
- You can clear the token anytime using the "Clear" button
- Uploaded files are stored in your GitHub repository under `images/` and `audios/` folders
- Quiz data is exported to the `quiz_data/` folder in your repository

## Troubleshooting

### Token Invalid Error
- Make sure your token hasn't expired
- Verify the token has the `repo` scope enabled
- Generate a new token if needed

### Upload Failed
- Ensure GitHub Owner and Repo are correctly configured
- Check that your token is valid and has proper permissions
- Verify the repository exists and you have write access

### Files Not Appearing
- Check the `images/`, `audios/`, or `quiz_data/` folders in your GitHub repository
- Refresh the page to reload uploaded media lists
