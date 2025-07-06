const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const config = require('./config');
const { Pool } = require('pg');

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

const pool = new Pool({ connectionString: config.DATABASE_URL, ssl: config.DATABASE_URL && config.DATABASE_URL.includes('railway') ? { rejectUnauthorized: false } : false });

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

// PostgreSQL DB functions
async function ensureTable() {
  await pool.query(`CREATE TABLE IF NOT EXISTS platform_data (
    platform_id TEXT PRIMARY KEY,
    favorites JSONB NOT NULL DEFAULT '[]',
    deleted JSONB NOT NULL DEFAULT '[]'
  )`);
}

async function loadPlatformData() {
  await ensureTable();
  const res = await pool.query('SELECT * FROM platform_data');
  const data = {};
  for (const row of res.rows) {
    data[row.platform_id] = {
      favorites: row.favorites || [],
      deleted: row.deleted || []
    };
  }
  return data;
}

async function savePlatformData(data) {
  await ensureTable();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM platform_data');
    for (const [platformId, { favorites, deleted }] of Object.entries(data)) {
      await client.query(
        'INSERT INTO platform_data (platform_id, favorites, deleted) VALUES ($1, $2, $3)',
        [platformId, JSON.stringify(favorites || []), JSON.stringify(deleted || [])]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updatePlatformData(platformId, favorites, deleted) {
  await ensureTable();
  await pool.query(
    `INSERT INTO platform_data (platform_id, favorites, deleted)
     VALUES ($1, $2, $3)
     ON CONFLICT (platform_id) DO UPDATE SET favorites = $2, deleted = $3`,
    [platformId, JSON.stringify(favorites || []), JSON.stringify(deleted || [])]
  );
}

async function deletePlatformData(platformId) {
  await ensureTable();
  await pool.query('DELETE FROM platform_data WHERE platform_id = $1', [platformId]);
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
    
    await updatePlatformData(platformId, favorites, deleted);
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
    
    await deletePlatformData(platformId);
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