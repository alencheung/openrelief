#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  DEFAULT_PORT: 3000,
  LHCI_PORT: 9009,
  BUILD_TIMEOUT: 300000, // 5 minutes
  STARTUP_TIMEOUT: 30000, // 30 seconds
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function colorLog(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    colorLog(`Running: ${command} ${args.join(' ')}`, 'cyan');
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      ...options,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function checkPort(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true);
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(false);
    });
  });
}

async function waitForServer(url, timeout = CONFIG.STARTUP_TIMEOUT) {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error(`Server not ready after ${timeout}ms`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  try {
    switch (command) {
      case 'dev':
        await runDevMode();
        break;
      case 'build':
        await runBuildMode();
        break;
      case 'mobile':
        await runMobileTests();
        break;
      case 'desktop':
        await runDesktopTests();
        break;
      case 'pwa':
        await runPWATests();
        break;
      case 'server':
        await startServer();
        break;
      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    colorLog(`Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

function showHelp() {
  colorLog('\n🚦 OpenRelief Lighthouse Testing Script', 'bright');
  colorLog('==========================================\n');
  
  colorLog('Usage:', 'yellow');
  console.log('  node scripts/run-lighthouse.js [command]\n');
  
  colorLog('Commands:', 'yellow');
  console.log('  dev      - Run tests against development server');
  console.log('  build    - Build and test production version');
  console.log('  mobile   - Run mobile-specific tests');
  console.log('  desktop  - Run desktop-specific tests');
  console.log('  pwa      - Run PWA-focused tests');
  console.log('  server   - Start Lighthouse CI server for viewing results');
  console.log('  help     - Show this help message\n');
  
  colorLog('Examples:', 'yellow');
  console.log('  node scripts/run-lighthouse.js dev');
  console.log('  node scripts/run-lighthouse.js build');
  console.log('  node scripts/run-lighthouse.js mobile\n');
  
  colorLog('Environment Variables:', 'yellow');
  console.log('  PORT              - Development server port (default: 3000)');
  console.log('  LHCI_PORT         - Lighthouse CI server port (default: 9009)');
  console.log('  SKIP_BUILD        - Skip build step (set to "true")');
  console.log('  SKIP_INSTALL      - Skip dependency installation (set to "true")\n');
}

async function runDevMode() {
  const port = process.env.PORT || CONFIG.DEFAULT_PORT;
  
  colorLog('\n🔧 Running Lighthouse tests in development mode', 'bright');
  colorLog('===============================================\n');
  
  // Check if dev server is running
  const isPortAvailable = await checkPort(port);
  if (!isPortAvailable) {
    colorLog(`Development server is running on port ${port}`, 'green');
  } else {
    colorLog(`Starting development server on port ${port}...`, 'yellow');
    
    // Start dev server in background
    const devProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      env: { ...process.env, PORT: port.toString() },
    });
    
    // Wait for server to start
    await waitForServer(`http://localhost:${port}`);
    colorLog('Development server started successfully', 'green');
  }
  
  // Run Lighthouse tests
  colorLog('\nRunning Lighthouse CI tests...', 'cyan');
  await runCommand('npm', ['run', 'test:lighthouse']);
  
  colorLog('\n✅ Lighthouse tests completed successfully!', 'green');
  colorLog('Run "node scripts/run-lighthouse.js server" to view detailed reports', 'yellow');
}

async function runBuildMode() {
  colorLog('\n🏗️ Running Lighthouse tests in production mode', 'bright');
  colorLog('===============================================\n');
  
  const skipBuild = process.env.SKIP_BUILD === 'true';
  
  if (!skipBuild) {
    colorLog('Building application...', 'yellow');
    await runCommand('npm', ['run', 'build'], { 
      timeout: CONFIG.BUILD_TIMEOUT 
    });
    colorLog('Build completed successfully', 'green');
  } else {
    colorLog('Skipping build step', 'yellow');
  }
  
  // Start production server
  colorLog('Starting production server...', 'yellow');
  const prodProcess = spawn('npm', ['start'], {
    stdio: 'pipe',
  });
  
  // Wait for server to start
  await waitForServer(`http://localhost:${CONFIG.DEFAULT_PORT}`);
  colorLog('Production server started successfully', 'green');
  
  // Run Lighthouse tests
  colorLog('\nRunning Lighthouse CI tests...', 'cyan');
  await runCommand('npm', ['run', 'test:lighthouse']);
  
  // Clean up
  prodProcess.kill('SIGTERM');
  
  colorLog('\n✅ Lighthouse tests completed successfully!', 'green');
  colorLog('Run "node scripts/run-lighthouse.js server" to view detailed reports', 'yellow');
}

async function runMobileTests() {
  colorLog('\n📱 Running mobile-specific Lighthouse tests', 'bright');
  colorLog('==========================================\n');
  
  await ensureServerRunning();
  
  colorLog('Running mobile Lighthouse tests...', 'cyan');
  await runCommand('npm', ['run', 'test:lighthouse:mobile']);
  
  colorLog('\n✅ Mobile Lighthouse tests completed!', 'green');
}

async function runDesktopTests() {
  colorLog('\n🖥️ Running desktop-specific Lighthouse tests', 'bright');
  colorLog('============================================\n');
  
  await ensureServerRunning();
  
  colorLog('Running desktop Lighthouse tests...', 'cyan');
  await runCommand('npm', ['run', 'test:lighthouse:desktop']);
  
  colorLog('\n✅ Desktop Lighthouse tests completed!', 'green');
}

async function runPWATests() {
  colorLog('\n📱 Running PWA-focused Lighthouse tests', 'bright');
  colorLog('========================================\n');
  
  await ensureServerRunning();
  
  colorLog('Running PWA Lighthouse tests...', 'cyan');
  await runCommand('npm', ['run', 'test:lighthouse:pwa']);
  
  colorLog('\n✅ PWA Lighthouse tests completed!', 'green');
}

async function ensureServerRunning() {
  const port = process.env.PORT || CONFIG.DEFAULT_PORT;
  const isPortAvailable = await checkPort(port);
  
  if (isPortAvailable) {
    colorLog(`No server running on port ${port}. Starting development server...`, 'yellow');
    
    const devProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      env: { ...process.env, PORT: port.toString() },
    });
    
    await waitForServer(`http://localhost:${port}`);
    colorLog('Development server started', 'green');
  } else {
    colorLog(`Server already running on port ${port}`, 'green');
  }
}

async function startServer() {
  const port = process.env.LHCI_PORT || CONFIG.LHCI_PORT;
  
  colorLog(`\n🌐 Starting Lighthouse CI server on port ${port}`, 'bright');
  colorLog('================================================\n');
  
  colorLog('Starting server...', 'cyan');
  colorLog(`Visit http://localhost:${port} to view Lighthouse reports`, 'yellow');
  colorLog('Press Ctrl+C to stop the server\n', 'yellow');
  
  await runCommand('npm', ['run', 'test:lighthouse:server']);
}

// Handle process termination
process.on('SIGINT', () => {
  colorLog('\n\n👋 Shutting down...', 'yellow');
  process.exit(0);
});

process.on('SIGTERM', () => {
  colorLog('\n\n👋 Shutting down...', 'yellow');
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  main,
  runDevMode,
  runBuildMode,
  runMobileTests,
  runDesktopTests,
  runPWATests,
  startServer,
};