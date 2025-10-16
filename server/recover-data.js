const { Pool } = require('pg');

// Old corrupted database connection
const oldDb = new Pool({
  connectionString: 'postgresql://postgres:AeXzwwFIMmBhfJzUCzCldySiAIUYTGDZ@ballast.proxy.rlwy.net:16266/railway',
  ssl: { rejectUnauthorized: false }
});

// New clean database connection
const newDb = new Pool({
  connectionString: 'postgresql://postgres:vLBvOGpXiHxaqiYADAffLommZLmmYEVI@interchange.proxy.rlwy.net:52940/railway',
  ssl: { rejectUnauthorized: false }
});

async function recoverData() {
  console.log('🔄 Attempting to recover data from corrupted database...');
  
  try {
    // Try to connect to old database
    console.log('📡 Connecting to old database...');
    const oldClient = await oldDb.connect();
    console.log('✅ Connected to old database!');
    
    // Try to read data
    console.log('📊 Attempting to read platform_data...');
    const result = await oldClient.query('SELECT * FROM platform_data');
    
    console.log(`📋 Found ${result.rows.length} platform records`);
    
    if (result.rows.length > 0) {
      console.log('🔄 Migrating data to new database...');
      
      // Connect to new database
      const newClient = await newDb.connect();
      
      // Create table in new database
      await newClient.query(`CREATE TABLE IF NOT EXISTS platform_data (
        platform_id TEXT PRIMARY KEY,
        favorites JSONB NOT NULL DEFAULT '[]',
        deleted JSONB NOT NULL DEFAULT '[]'
      )`);
      
      // Insert data into new database
      for (const row of result.rows) {
        await newClient.query(
          'INSERT INTO platform_data (platform_id, favorites, deleted) VALUES ($1, $2, $3)',
          [row.platform_id, row.favorites, row.deleted]
        );
      }
      
      console.log('✅ Data successfully migrated to new database!');
      newClient.release();
    }
    
    oldClient.release();
    
  } catch (error) {
    console.error('❌ Failed to recover data:', error.message);
    
    if (error.message.includes('No space left on device')) {
      console.log('💡 The old database is completely full and unrecoverable');
      console.log('📋 Alternative recovery options:');
      console.log('1. Check if you have any exported JSON files from the app');
      console.log('2. Check browser downloads for any game data exports');
      console.log('3. Start fresh with the optimized code (prevents future bloat)');
    }
  } finally {
    await oldDb.end();
    await newDb.end();
  }
}

recoverData();
