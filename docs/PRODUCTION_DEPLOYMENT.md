# Production Deployment Guide

## Overview

This guide will help you deploy the LCTR multiplayer server to Render and configure the frontend to work with the production server.

## Prerequisites

- GitHub repository with your code
- Render account (free tier available)
- Netlify deployment (already done at partitiongames.netlify.app)

## Step 1: Deploy Server to Render

### 1.1 Prepare Repository
Ensure your repository contains the `server/` directory with:
- `server.js` - Main server file
- `package.json` - Dependencies
- `render.yaml` - Render configuration (optional)

### 1.2 Deploy to Render
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `lctr-multiplayer`
   - **Environment**: `Node`
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Plan**: Free

### 1.3 Environment Variables
Set these in Render:
- `NODE_ENV`: `production`
- `PORT`: `10000` (Render will override this)

### 1.4 Deploy
Click "Create Web Service" and wait for deployment.

## Step 2: Update Frontend Configuration

### 2.1 Get Your Render URL
After deployment, note your Render URL (e.g., `https://lctr-multiplayer.onrender.com`)

### 2.2 Update Configuration
Edit `config.js` in your repository:
```javascript
production: {
    serverUrl: 'https://your-actual-render-url.onrender.com'  // Replace with your URL
}
```

### 2.3 Deploy Frontend Changes
Push the updated `config.js` to your repository. Netlify will automatically redeploy.

## Step 3: Test the Deployment

### 3.1 Test Server Health
Visit your Render URL to see server info:
```
https://your-render-url.onrender.com/
```

### 3.2 Test Frontend Connection
1. Visit your Netlify site
2. Open browser console
3. Look for connection logs
4. Try creating a multiplayer game

## Step 4: Monitor and Troubleshoot

### 4.1 Check Render Logs
- Go to your Render service dashboard
- Check "Logs" tab for any errors

### 4.2 Test Endpoints
- Health check: `https://your-render-url.onrender.com/health`
- Active games: `https://your-render-url.onrender.com/games`

### 4.3 Common Issues

**CORS Errors**
- Ensure your Netlify domain is in the allowed origins
- Check browser console for CORS errors

**Connection Timeouts**
- Render free tier has cold starts
- First connection might be slow

**Game State Issues**
- Games are stored in memory
- Server restarts will clear all games

## File Structure After Deployment

```
Partition-Games/
├── server/
│   ├── server.js          # Production-ready server
│   ├── package.json       # Dependencies
│   ├── render.yaml        # Render config
│   ├── DEPLOYMENT.md      # Server deployment guide
│   └── README.md          # Server documentation
├── config.js              # Environment configuration
├── lctr_page.html         # Updated with config.js
├── lctr_script.js         # Environment-aware connection
└── PRODUCTION_DEPLOYMENT.md # This guide
```

## Environment Configuration

The system automatically detects the environment:
- **Development**: `localhost` → connects to `http://localhost:3001`
- **Production**: `partitiongames.netlify.app` → connects to your Render URL

## Security Notes

- CORS is configured for your specific domains
- Server validates all moves
- No persistent data storage (games in memory only)
- Free tier limitations apply

## Support

If you encounter issues:
1. Check Render logs
2. Verify CORS settings
3. Test server endpoints
4. Check browser console for errors 