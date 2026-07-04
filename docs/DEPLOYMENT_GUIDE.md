# Partition Games - Deployment Guide

## Overview
This guide helps you deploy the partition games server to Render so that your live website at https://partitiongames.netlify.app can save game data to your Neon database.

## Architecture
```
Netlify Website (Frontend) → Render Server (API) → Neon Database (Storage)
```

## Deployment Steps

### 1. Deploy Server to Render

1. **Go to [render.com](https://render.com)** and create an account
2. **Connect GitHub:** Link your GitHub account and grant permissions
3. **Create Web Service:**
   - Click "New +" → "Web Service"
   - Select your `Partition-Games` repository
   - **Important:** Set Root Directory to `server`
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `npm start`

### 2. Configure Environment Variables

Add these in Render dashboard under "Environment":
```
DATABASE_URL=postgresql://<DB_USER>:<DB_PASSWORD>@<NEON_HOST>/<DB_NAME>?sslmode=require&channel_binding=require
JWT_SECRET=<your-secure-random-jwt-secret>
NODE_ENV=production
PORT=10000
```

> **Note:** Get your `DATABASE_URL` from your Neon dashboard under "Connection Details". Generate a strong random `JWT_SECRET` (e.g. `openssl rand -base64 32`).

### 3. Update Configuration

After deployment, update `config.js` with your actual Render URL:
```javascript
production: {
    serverUrl: 'https://your-actual-render-app-name.onrender.com'
}
```

### 4. Deploy Frontend Updates

Push changes to GitHub to trigger Netlify deployment:
```bash
git add .
git commit -m "Add database integration and update server config"
git push origin main
```

### 5. Initialize Database

Once server is deployed, initialize the database by visiting:
`https://your-render-app.onrender.com/api/game-records`

Or run the setup script remotely (if needed):
```bash
# Connect to your deployed server and run:
# node setup-database.js
```

## Testing

### Verify Deployment
1. Check Render dashboard shows "Live" status
2. Visit `https://your-render-app.onrender.com/api/game-records`
3. Should return JSON with existing game records

### Test Integration
1. Go to https://partitiongames.netlify.app
2. Click "AntiCorner" → "play now"
3. Complete a full game
4. Check your Neon database for new records

## Expected Data Format

When games complete, they'll be saved as:
```json
{
  "gameType": "ANTI",
  "partitionData": "4 3 2 1",
  "timestampPlayed": "2024-01-01T10:00:00Z", 
  "movesSequence": "R0C3 R1C1 R0C0",
  "gameOutcome": "A"
}
```

## Troubleshooting

### Server Issues
- Check Render logs for errors
- Verify environment variables are set correctly
- Ensure database connection string is valid

### Frontend Issues
- Check browser console for CORS errors
- Verify config.js has correct server URL
- Test API endpoints directly

### Database Issues
- Check Neon dashboard for connectivity
- Verify table `game_records` exists
- Test direct SQL queries in Neon console

## Monitoring

- **Render Dashboard:** Monitor server uptime and logs
- **Neon Dashboard:** Monitor database usage and new records
- **Browser Console:** Check for JavaScript errors during gameplay

## Support

If you encounter issues:
1. Check Render deployment logs
2. Verify all environment variables
3. Test API endpoints manually
4. Check browser console for errors