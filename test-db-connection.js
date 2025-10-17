const { Pool } = require('pg');

// Test database connection
async function testConnection() {
  console.log('🔍 Testing database connection...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:AeXzwwFIMmBhfJzUCzCldySiAIUYTGDZ@ballast.proxy.rlwy.net:16266/railway',
    ssl: { rejectUnauthorized: false },
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });

  try {
    console.log('📡 Attempting to connect...');
    const client = await pool.connect();
    console.log('✅ Connected successfully!');
    
    // Test a simple query
    const result = await client.query('SELECT NOW()');
    console.log('⏰ Current time:', result.rows[0].now);
    
    // Check if platform_data table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'platform_data'
      );
    `);
    console.log('📋 platform_data table exists:', tableCheck.rows[0].exists);
    
    if (tableCheck.rows[0].exists) {
      // Get row count
      const countResult = await client.query('SELECT COUNT(*) as count FROM platform_data');
      console.log('📊 Total rows in platform_data:', countResult.rows[0].count);
      
      if (parseInt(countResult.rows[0].count) > 0) {
        // Get sample data
        const sampleResult = await client.query('SELECT platform_id, favorites, deleted FROM platform_data LIMIT 3');
        console.log('📝 Sample data:');
        for (const row of sampleResult.rows) {
          const favorites = JSON.parse(row.favorites || '[]');
          const deleted = JSON.parse(row.deleted || '[]');
          console.log(`  Platform ${row.platform_id}: ${favorites.length} favorites, ${deleted.length} deleted`);
        }
      }
    }
    
    client.release();
    console.log('✅ Test completed successfully');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Error errno:', error.errno);
  }
  
  await pool.end();
}

testConnection();

