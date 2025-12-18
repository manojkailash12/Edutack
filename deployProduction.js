// Production deployment verification script
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 EDUTRACK PRODUCTION DEPLOYMENT');
console.log('==================================');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
  console.error('❌ Not in project root directory');
  process.exit(1);
}

// Read package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
console.log(`📦 Project: ${packageJson.name}`);
console.log(`📋 Version: ${packageJson.version}`);

// Check Git status
console.log('\n📊 Checking Git status...');
try {
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
  if (gitStatus.trim()) {
    console.log('⚠️  Uncommitted changes found:');
    console.log(gitStatus);
    console.log('💡 Committing changes...');
    
    execSync('git add .', { stdio: 'inherit' });
    execSync('git commit -m "Production deployment fixes - bulletproof implementation"', { stdio: 'inherit' });
  } else {
    console.log('✅ Git working directory clean');
  }
} catch (error) {
  console.error('❌ Git check failed:', error.message);
}

// Push to GitHub
console.log('\n🔄 Pushing to GitHub...');
try {
  execSync('git push origin main', { stdio: 'inherit' });
  console.log('✅ Code pushed to GitHub');
} catch (error) {
  console.error('❌ Git push failed:', error.message);
  process.exit(1);
}

// Check environment files
console.log('\n🔧 Checking environment configuration...');

// Backend .env
const backendEnvPath = path.join('Backend', '.env');
if (fs.existsSync(backendEnvPath)) {
  const envContent = fs.readFileSync(backendEnvPath, 'utf8');
  const requiredVars = ['MONGODB_URI', 'EMAIL_USER', 'EMAIL_PASS'];
  
  for (const varName of requiredVars) {
    if (envContent.includes(`${varName}=`)) {
      console.log(`✅ ${varName} configured`);
    } else {
      console.log(`❌ ${varName} missing`);
    }
  }
} else {
  console.log('⚠️  Backend .env file not found');
}

// Frontend .env.production
const frontendEnvPath = path.join('Frontend', '.env.production');
if (fs.existsSync(frontendEnvPath)) {
  const envContent = fs.readFileSync(frontendEnvPath, 'utf8');
  if (envContent.includes('REACT_APP_API_URL=https://edutack.onrender.com')) {
    console.log('✅ Frontend API URL configured');
  } else {
    console.log('❌ Frontend API URL incorrect');
  }
} else {
  console.log('❌ Frontend .env.production not found');
}

// Check package.json scripts
console.log('\n📜 Checking package.json scripts...');
if (packageJson.scripts) {
  const importantScripts = ['start', 'build', 'test'];
  for (const script of importantScripts) {
    if (packageJson.scripts[script]) {
      console.log(`✅ ${script} script found`);
    } else {
      console.log(`⚠️  ${script} script missing`);
    }
  }
}

// Create deployment checklist
console.log('\n📋 DEPLOYMENT CHECKLIST');
console.log('========================');

const checklist = [
  '✅ Code committed and pushed to GitHub',
  '⏳ Backend deployment (Render) - Manual step required',
  '⏳ Frontend deployment (Vercel) - Manual step required',
  '⏳ Environment variables verification',
  '⏳ Production testing'
];

checklist.forEach(item => console.log(item));

console.log('\n🎯 NEXT STEPS:');
console.log('1. Go to Render Dashboard → Deploy latest commit');
console.log('2. Go to Vercel Dashboard → Redeploy');
console.log('3. Test: https://edutack.onrender.com/health/detailed');
console.log('4. Test: https://edutack.vercel.app');
console.log('5. Run production tests: node Backend/testProduction.js');

console.log('\n🔗 IMPORTANT URLS:');
console.log('Backend: https://edutack.onrender.com');
console.log('Frontend: https://edutack.vercel.app');
console.log('Health Check: https://edutack.onrender.com/health/detailed');
console.log('Test Email: https://edutack.onrender.com/health/test-email');

console.log('\n💡 ENVIRONMENT VARIABLES FOR RENDER:');
console.log('EMAIL_USER=libroflow8@gmail.com');
console.log('EMAIL_PASS=rkwvnraapvhezena');
console.log('NODE_ENV=production');
console.log('MONGODB_URI=<your-mongodb-connection-string>');

console.log('\n🎉 Deployment preparation complete!');
console.log('Now deploy manually on Render and Vercel platforms.');

process.exit(0);