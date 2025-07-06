const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const config = require('./config');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../public')));
}

// IGDB API configuration
const IGDB_BASE_URL = 'https://api.igdb.com/v4';
const AUTH_URL = 'https://id.twitch.tv/oauth2/token';

let accessToken = null;
let tokenExpiry = null;

// Get IGDB access token
async function getAccessToken() {
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

  try {
    const response = await axios.post(AUTH_URL, null, {
      params: {
        client_id: config.CLIENT_ID,
        client_secret: config.CLIENT_SECRET,
        grant_type: 'client_credentials'
      }
    });

    accessToken = response.data.access_token;
    tokenExpiry = Date.now() + (50 * 24 * 60 * 60 * 1000); // 50 days
    
    return accessToken;
  } catch (error) {
    console.error('Failed to get access token:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with IGDB API');
  }
}

// Make IGDB API request
async function makeIGDBRequest(endpoint, query) {
  try {
    const token = await getAccessToken();
    
    const response = await axios.post(`${IGDB_BASE_URL}${endpoint}`, query, {
      headers: {
        'Client-ID': config.CLIENT_ID,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'text/plain'
      }
    });

    return response.data;
  } catch (error) {
    console.error(`IGDB API request failed for ${endpoint}:`, error.response?.data || error.message);
    throw new Error(`Failed to fetch data from IGDB API: ${error.message}`);
  }
}

// Database functions
const DB_FILE = path.join(__dirname, 'data', 'platformData.json');

// Ensure data directory exists
async function ensureDataDirectory() {
  const dataDir = path.dirname(DB_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Load platform data from database
async function loadPlatformData() {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(DB_FILE, 'utf8');
    const parsedData = JSON.parse(data);
    console.log(`Loaded platform data: ${Object.keys(parsedData).length} platforms`);
    console.log('Platform keys:', Object.keys(parsedData));
    return parsedData;
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return empty data
      console.log('No database file found, returning empty data');
      return {};
    }
    console.error('Error loading platform data:', error);
    throw error;
  }
}

// Save platform data to database
async function savePlatformData(data) {
  try {
    await ensureDataDirectory();
    const dataString = JSON.stringify(data, null, 2);
    await fs.writeFile(DB_FILE, dataString);
    console.log(`Saved platform data: ${Object.keys(data).length} platforms`);
    console.log('Platform keys:', Object.keys(data));
    console.log(`Data size: ${dataString.length} characters`);
  } catch (error) {
    console.error('Error saving platform data:', error);
    throw new Error('Failed to save data to database');
  }
}

// Routes
app.get('/api/platforms', async (req, res) => {
  try {
    const query = `fields id,name,slug,platform_logo; sort name asc; limit 500;`;

    const platforms = await makeIGDBRequest('/platforms', query);
    const formattedPlatforms = platforms.map(platform => ({
      id: platform.id,
      name: platform.name,
      slug: platform.slug,
      logo: platform.platform_logo
    }));

    res.json(formattedPlatforms);
  } catch (error) {
    console.error('Error fetching platforms:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/games/:platformId', async (req, res) => {
  try {
    const { platformId } = req.params;
    const { offset = 0, limit = 50 } = req.query; // Default to 50 games per batch

    // Query to get all games for the platform - use IGDB's array membership syntax
    const query = `fields id,name,slug,cover.*; where platforms = (${platformId}); sort name asc; limit ${limit}; offset ${offset};`;
    
    console.log(`Fetching games for platform ${platformId}: offset=${offset}, limit=${limit}`);
    console.log(`Query: ${query}`);

    const games = await makeIGDBRequest('/games', query);
    console.log(`Received ${games.length} games for platform ${platformId} (offset: ${offset})`);
    
    const formattedGames = games.map(game => ({
      id: game.id,
      name: game.name,
      slug: game.slug,
      cover: game.cover ? {
        id: game.cover.id,
        image_id: game.cover.image_id
      } : null
    }));

    res.json(formattedGames);
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/search-games', async (req, res) => {
  try {
    const { name, limit = 10 } = req.query;
    
    if (!name) {
      return res.status(400).json({ error: 'Game name is required' });
    }

    const query = `search "${name}"; fields id,name,slug,cover.*,first_release_date,platforms; limit ${limit};`;

    const games = await makeIGDBRequest('/games', query);
    const formattedGames = games.map(game => ({
      id: game.id,
      name: game.name,
      slug: game.slug,
      cover: game.cover ? {
        id: game.cover.id,
        image_id: game.cover.image_id
      } : null,
      first_release_date: game.first_release_date,
      platforms: game.platforms
    }));

    res.json(formattedGames);
  } catch (error) {
    console.error('Error searching games:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/game/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    
    const query = `fields id,name,slug,cover.*,platforms.*,parent_game.*; where id = ${gameId};`;

    const games = await makeIGDBRequest('/games', query);
    
    if (games.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const game = games[0];
    const formattedGame = {
      id: game.id,
      name: game.name,
      slug: game.slug,
      cover: game.cover ? {
        id: game.cover.id,
        image_id: game.cover.image_id
      } : null,
      platforms: game.platforms,
      parent_game: game.parent_game
    };

    res.json(formattedGame);
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json({ error: error.message });
  }
});

// Database API endpoints
app.get('/api/platform-data', async (req, res) => {
  try {
    const data = await loadPlatformData();
    res.json(data);
  } catch (error) {
    console.error('Error loading platform data:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/platform-data', async (req, res) => {
  try {
    const { platformData } = req.body;
    
    if (!platformData) {
      return res.status(400).json({ error: 'Platform data is required' });
    }

    await savePlatformData(platformData);
    res.json({ message: 'Platform data saved successfully' });
  } catch (error) {
    console.error('Error saving platform data:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/platform-data/:platformId', async (req, res) => {
  try {
    const { platformId } = req.params;
    const { favorites, deleted } = req.body;
    
    console.log(`Updating platform ${platformId}: ${favorites?.length || 0} favorites, ${deleted?.length || 0} deleted`);
    console.log(`Request body size: ${JSON.stringify(req.body).length} characters`);
    
    const data = await loadPlatformData();
    data[platformId] = { favorites: favorites || [], deleted: deleted || [] };
    
    await savePlatformData(data);
    console.log(`Successfully updated platform ${platformId}`);
    res.json({ message: 'Platform data updated successfully' });
  } catch (error) {
    console.error('Error updating platform data:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/platform-data/:platformId', async (req, res) => {
  try {
    const { platformId } = req.params;
    
    const data = await loadPlatformData();
    delete data[platformId];
    
    await savePlatformData(data);
    res.json({ message: 'Platform data deleted successfully' });
  } catch (error) {
    console.error('Error deleting platform data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'IGDB API proxy is running' });
});

// Debug endpoint to check database state
app.get('/api/debug/database', async (req, res) => {
  try {
    const data = await loadPlatformData();
    res.json({
      platformCount: Object.keys(data).length,
      platforms: Object.keys(data),
      dataSize: JSON.stringify(data).length,
      sampleData: Object.keys(data).slice(0, 3).reduce((acc, key) => {
        acc[key] = {
          favoritesCount: data[key].favorites?.length || 0,
          deletedCount: data[key].deleted?.length || 0
        };
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });
}

// Start server
app.listen(config.PORT, () => {
  console.log(`🚀 IGDB API proxy server running on http://localhost:${config.PORT}`);
  console.log(`📡 Available endpoints:`);
  console.log(`   GET /api/health - Health check`);
  console.log(`   GET /api/platforms - Get all platforms`);
  console.log(`   GET /api/games/:platformId - Get games for platform`);
}); 