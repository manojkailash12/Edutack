#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Preparing Edutrack for Netlify Deployment...\n');

// Check if required files exist
const requiredFiles = [
  'Frontend/netlify.toml',
  'Frontend/_redirects',
  'Backend/netlify.toml',
  'Backend/netlify/functions/server.js',
  'Frontend/.env.production',
  'Backend/.env.example'
];

console.log('✅ Checking required deployment files:');
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✓ ${file}`);
  } else {
    console.log(`   ✗ ${file} - MISSING!`);
  }
});

console.log('\n📋 Deployment Checklist:');
console.log('   □ Create GitHub repository');
console.log('   □ Push code to GitHub');
console.log('   □ Create MongoDB Atlas database');
console.log('   □ Set up Gmail App Password');
console.log('   □ Deploy backend to Netlify');
console.log('   □ Update REACT_APP_API_URL in Frontend/.env.production');
console.log('   □ Deploy frontend to Netlify');
console.log('   □ Test the deployed application');

console.log('\n📖 See DEPLOYMENT_GUIDE.md for detailed instructions');
console.log('🎉 Ready for deployment!');