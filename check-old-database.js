const { Pool } = require('pg');

// Old database connection
const oldDb = new Pool({
  connectionString: 'postgresql://postgres:AeXzwwFIMmBhfJzUCzCldySiAIUYTGDZ@ballast.proxy.rlwy.net:16266/railway',
  ssl: { rejectUnauthorized: false }
});

async function checkOldDatabase() {
  console.log('🔍 Checking old database for data...');
  
  try {
    const client = await oldDb.connect();
    console.log('✅ Connected to old database');
    
    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'platform_data'
      );
    `);
    
    console.log('📋 Table exists:', tableCheck.rows[0].exists);
    
    if (tableCheck.rows[0].exists) {
      // Get row count
      const countResult = await client.query('SELECT COUNT(*) as count FROM platform_data');
      console.log('📊 Total rows:', countResult.rows[0].count);
      
      // Get sample data
      const sampleResult = await client.query('SELECT platform_id, favorites, deleted FROM platform_data LIMIT 3');
      console.log('📝 Sample data:');
      for (const row of sampleResult.rows) {
        const favorites = JSON.parse(row.favorites || '[]');
        const deleted = JSON.parse(row.deleted || '[]');
        console.log(`  Platform ${row.platform_id}: ${favorites.length} favorites, ${deleted.length} deleted`);
      }
      
      // Get all data for export
      const allDataResult = await client.query('SELECT * FROM platform_data');
      console.log(`💾 Found ${allDataResult.rows.length} platform records total`);
      
      // Export to file
      const fs = require('fs');
      const exportData = {};
      for (const row of allDataResult.rows) {
        exportData[row.platform_id] = {
          favorites: JSON.parse(row.favorites || '[]'),
          deleted: JSON.parse(row.deleted || '[]')
        };
      }
      
      fs.writeFileSync('recovered-platform-data.json', JSON.stringify(exportData, null, 2));
      console.log('✅ Data exported to recovered-platform-data.json');
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error checking old database:', error.message);
  }
  
  await oldDb.end();
}

checkOldDatabase();

