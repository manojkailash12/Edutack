#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 EDUTRACK Vercel Deployment Preparation');
console.log('=========================================\n');

// Check if all required files exist
const requiredFiles = [
  'vercel.json',
  'api/index.js',
  'Frontend/package.json',
  'Backend/package.json',
  'Frontend/.env.production'
];

console.log('📋 Checking required files...');
let allFilesExist = true;

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log('\n❌ Some required files are missing. Please ensure all files are created.');
  process.exit(1);
}

console.log('\n📦 Checking package.json files...');

// Check Frontend package.json
const frontendPackage = JSON.parse(fs.readFileSync(path.join(__dirname, 'Frontend/package.json'), 'utf8'));
console.log(`✅ Frontend: ${frontendPackage.name} v${frontendPackage.version}`);

// Check Backend package.json
const backendPackage = JSON.parse(fs.readFileSync(path.join(__dirname, 'Backend/package.json'), 'utf8'));
console.log(`✅ Backend: ${backendPackage.name} v${backendPackage.version}`);

console.log('\n🔧 Environment Variables Required:');
console.log('================================');
console.log('NODE_ENV=production');
console.log('MONGODB_URI=mongodb+srv://Manoj:Manoj@cluster0.wpbk05r.mongodb.net/test?retryWrites=true&w=majority');
console.log('EMAIL_USER=manojkailash1@gmail.com');
console.log('EMAIL_PASS=rkwvnraapvhezena');

console.log('\n📝 Deployment Steps:');
console.log('===================');
console.log('1. Push your code to GitHub');
console.log('2. Go to https://vercel.com/dashboard');
console.log('3. Click "New Project"');
console.log('4. Import your GitHub repository');
console.log('5. Select the "Edutack" directory as root');
console.log('6. Add the environment variables shown above');
console.log('7. Deploy!');

console.log('\n🌐 After Deployment:');
console.log('===================');
console.log('1. Update Frontend/.env.production with your actual Vercel URL');
console.log('2. Test the health endpoint: https://your-app.vercel.app/health');
console.log('3. Test email functionality: https://your-app.vercel.app/health/test-email');

console.log('\n✅ All files are ready for Vercel deployment!');
console.log('📖 See DEPLOYMENT_GUIDE.md for detailed instructions.');