// Check localStorage for platform data
const fs = require('fs');

// This is a Node.js script to check if there's any backup data
console.log('🔍 Checking for any backup data...');

// Check if there are any backup files
const backupFiles = [
  'backup-platform-data.json',
  'platform-data-backup.json',
  'exported-data.json'
];

let foundData = false;

for (const file of backupFiles) {
  if (fs.existsSync(file)) {
    console.log(`📁 Found backup file: ${file}`);
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    console.log(`📊 Data in ${file}:`, {
      platforms: Object.keys(data),
      totalPlatforms: Object.keys(data).length,
      samplePlatform: Object.keys(data)[0] ? {
        platformId: Object.keys(data)[0],
        favoritesCount: data[Object.keys(data)[0]]?.favorites?.length || 0,
        deletedCount: data[Object.keys(data)[0]]?.deleted?.length || 0
      } : null
    });
    foundData = true;
  }
}

if (!foundData) {
  console.log('❌ No backup files found');
  console.log('💡 You may need to check your browser\'s localStorage manually');
  console.log('   Open browser dev tools (F12) and run:');
  console.log('   localStorage.getItem("platformData")');
}

