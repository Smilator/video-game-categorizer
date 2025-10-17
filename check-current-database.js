const { Pool } = require('pg');

// Current database connection
const currentDb = new Pool({
  connectionString: 'postgresql://postgres:vLBvOGpXiHxaqiYADAffLommZLmmYEVI@interchange.proxy.rlwy.net:52940/railway',
  ssl: { rejectUnauthorized: false }
});

async function checkCurrentDatabase() {
  console.log('🔍 Checking current database for data...');
  
  try {
    const client = await currentDb.connect();
    console.log('✅ Connected to current database');
    
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
      
      // Get all data
      const allDataResult = await client.query('SELECT * FROM platform_data');
      console.log(`💾 Found ${allDataResult.rows.length} platform records`);
      
      if (allDataResult.rows.length > 0) {
        console.log('📝 Platform data:');
        for (const row of allDataResult.rows) {
          const favorites = JSON.parse(row.favorites || '[]');
          const deleted = JSON.parse(row.deleted || '[]');
          console.log(`  Platform ${row.platform_id}: ${favorites.length} favorites, ${deleted.length} deleted`);
        }
        
        // Export to file
        const fs = require('fs');
        const exportData = {};
        for (const row of allDataResult.rows) {
          exportData[row.platform_id] = {
            favorites: JSON.parse(row.favorites || '[]'),
            deleted: JSON.parse(row.deleted || '[]')
          };
        }
        
        fs.writeFileSync('current-platform-data.json', JSON.stringify(exportData, null, 2));
        console.log('✅ Data exported to current-platform-data.json');
      } else {
        console.log('❌ No platform data found in database');
      }
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error checking current database:', error.message);
  }
  
  await currentDb.end();
}

checkCurrentDatabase();

