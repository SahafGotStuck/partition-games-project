// Environment Configuration
// Update this file when deploying to production

const config = {
    // Development server URL
    development: {
        serverUrl: 'http://localhost:3001'
    },
    
    // Production server URL - UPDATE THIS WITH YOUR ACTUAL RENDER URL
    production: {
        serverUrl: 'https://partition-games-server.onrender.com'  // Update this with your actual Render URL after deployment
    },
    
    // Helper function to get the appropriate server URL
    getServerUrl: function() {
        // Detect production on any Netlify domain variant
        const host = window.location.hostname || '';
        const isNetlify = /(^|\.)partition-?games\.netlify\.app$/i.test(host);
        return isNetlify ? this.production.serverUrl : this.development.serverUrl;
    }
};

// Make it available globally
window.GameConfig = config; 