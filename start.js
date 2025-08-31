const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting AdminRestu Server...\n');

// Check if .env file exists
const fs = require('fs');
const envPath = path.join(__dirname, '.env');

if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file from env.example...');
  const envExamplePath = path.join(__dirname, 'env.example');
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created successfully');
  } else {
    console.log('⚠️  env.example not found. Please create .env file manually.');
  }
}

// Install dependencies if node_modules doesn't exist
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('📦 Installing dependencies...');
  const install = spawn('npm', ['install'], { stdio: 'inherit' });
  
  install.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Dependencies installed successfully');
      startServer();
    } else {
      console.error('❌ Failed to install dependencies');
    }
  });
} else {
  startServer();
}

function startServer() {
  console.log('🔧 Starting development server...\n');
  
  const server = spawn('npm', ['run', 'dev'], { stdio: 'inherit' });
  
  server.on('close', (code) => {
    console.log(`\n🛑 Server stopped with code ${code}`);
  });
  
  server.on('error', (error) => {
    console.error('❌ Server error:', error);
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping server...');
    server.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Stopping server...');
    server.kill('SIGTERM');
  });
}
