const { Pool } = require('pg');

// Test connection to the resized original database
const pool = new Pool({
  connectionString: 'postgresql://postgres:AeXzwwFIMmBhfJzUCzCldySiAIUYTGDZ@ballast.proxy.rlwy.net:16266/railway',
  ssl: { rejectUnauthorized: false }
});

async function testConnection() {
  console.log('🔄 Testing connection to resized database...');
  
  try {
    const client = await pool.connect();
    console.log('✅ Successfully connected to database!');
    
    // Check if platform_data table exists and has data
    const result = await client.query(`
      SELECT 
        COUNT(*) as total_rows,
        pg_size_pretty(pg_total_relation_size('platform_data')) as table_size
      FROM platform_data
    `);
    
    console.log(`📊 Database Status:`);
    console.log(`   - Total rows: ${result.rows[0].total_rows}`);
    console.log(`   - Table size: ${result.rows[0].table_size}`);
    
    // Get sample data to see what we have
    const sampleData = await client.query('SELECT platform_id, jsonb_array_length(favorites) as favorites_count, jsonb_array_length(deleted) as deleted_count FROM platform_data LIMIT 5');
    
    if (sampleData.rows.length > 0) {
      console.log(`📋 Sample platform data:`);
      sampleData.rows.forEach(row => {
        console.log(`   - Platform ${row.platform_id}: ${row.favorites_count} favorites, ${row.deleted_count} deleted`);
      });
      console.log('🎉 Data recovery successful! Your game categorizations are still there!');
    } else {
      console.log('📭 No platform data found');
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await pool.end();
  }
}

testConnection();
