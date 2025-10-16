const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:AeXzwwFIMmBhfJzUCzCldySiAIUYTGDZ@ballast.proxy.rlwy.net:16266/railway',
  ssl: { rejectUnauthorized: false }
});

async function optimizeDatabase() {
  console.log('🔧 Running database optimization...');
  
  try {
    const client = await pool.connect();
    
    // Get size before optimization
    const beforeResult = await client.query(`
      SELECT 
        pg_size_pretty(pg_total_relation_size('platform_data')) as total_size,
        pg_size_pretty(pg_relation_size('platform_data')) as table_size
    `);
    
    console.log(`📊 Before optimization:`);
    console.log(`   - Total size: ${beforeResult.rows[0].total_size}`);
    console.log(`   - Table size: ${beforeResult.rows[0].table_size}`);
    
    // Run VACUUM ANALYZE to clean up bloat
    console.log('🧹 Running VACUUM ANALYZE...');
    await client.query('VACUUM ANALYZE platform_data');
    
    // Get size after optimization
    const afterResult = await client.query(`
      SELECT 
        pg_size_pretty(pg_total_relation_size('platform_data')) as total_size,
        pg_size_pretty(pg_relation_size('platform_data')) as table_size
    `);
    
    console.log(`📊 After optimization:`);
    console.log(`   - Total size: ${afterResult.rows[0].total_size}`);
    console.log(`   - Table size: ${afterResult.rows[0].table_size}`);
    
    console.log('✅ Database optimization completed successfully!');
    console.log('🎯 Your optimized code will prevent future bloat!');
    
    client.release();
    
  } catch (error) {
    console.error('❌ Optimization failed:', error.message);
  } finally {
    await pool.end();
  }
}

optimizeDatabase();
