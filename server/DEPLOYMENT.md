# LCTR Multiplayer Server Deployment Guide

## Render Deployment

### Prerequisites
- Render account
- Git repository with the server code

### Deployment Steps

1. **Connect Repository to Render**
   - Go to Render Dashboard
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository containing this server

2. **Configure Service**
   - **Name**: `lctr-multiplayer` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or paid if needed)

3. **Environment Variables**
   - `NODE_ENV`: `production`
   - `PORT`: `10000` (Render will override this)

4. **Deploy**
   - Click "Create Web Service"
   - Render will automatically deploy your service

### Important Notes

- The server will be available at: `https://your-service-name.onrender.com`
- Update the frontend `serverUrl` in `lctr_script.js` with your actual Render URL
- The server automatically handles CORS for production domains
- Games are stored in memory and will be lost on server restart

### Testing

After deployment, test the connection:
1. Visit your Netlify site
2. Open browser console
3. Check for connection logs
4. Try creating a multiplayer game

### Troubleshooting

- Check Render logs for any startup errors
- Verify CORS settings match your frontend domain
- Ensure all dependencies are in `package.json` 