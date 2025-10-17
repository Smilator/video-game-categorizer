// Test saving data to the database
const axios = require('axios');

async function testSaveData() {
  console.log('🧪 Testing data save to database...');
  
  // Test data - some sample games for Nintendo Switch (platform 130)
  const testPlatformData = {
    "130": {
      "favorites": [
        {
          "id": 1020,
          "name": "Grand Theft Auto V",
          "slug": "grand-theft-auto-v",
          "cover": {
            "id": 86223,
            "image_id": "co1u8v"
          }
        },
        {
          "id": 1942,
          "name": "Grand Theft Auto: San Andreas", 
          "slug": "grand-theft-auto-san-andreas",
          "cover": {
            "id": 86224,
            "image_id": "co1u8w"
          }
        }
      ],
      "deleted": [
        {
          "id": 186946,
          "name": "0x0 Minimalist",
          "slug": "0x0-minimalist",
          "cover": {
            "id": 281122,
            "image_id": "co60wy"
          }
        }
      ]
    }
  };

  try {
    console.log('📤 Sending test data to server...');
    const response = await axios.post('http://localhost:3001/api/platform-data', testPlatformData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Save response:', response.data);
    
    // Now test reading it back
    console.log('📥 Reading data back...');
    const readResponse = await axios.get('http://localhost:3001/api/platform-data');
    console.log('✅ Read response:', readResponse.data);
    
    // Check debug endpoint
    console.log('🔍 Checking debug endpoint...');
    const debugResponse = await axios.get('http://localhost:3001/api/debug/database');
    console.log('✅ Debug response:', debugResponse.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testSaveData();

