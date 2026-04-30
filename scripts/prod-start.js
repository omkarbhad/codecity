#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const appDir = path.join(__dirname, '..');
const standaloneDir = path.join(appDir, '.next', 'standalone');
const serverDir = path.join(appDir, '.next', 'server');

let serverProcess = null;

async function buildWeb() {
  console.log('Building Next.js web app...');
  execSync('pnpm build', { cwd: appDir, stdio: 'inherit' });

  if (fs.existsSync(standaloneDir)) {
    const staticDir = path.join(appDir, '.next', 'static');
    const standaloneStatic = path.join(standaloneDir, '.next', 'static');

    if (fs.existsSync(staticDir)) {
      console.log('Copying static files...');
      if (!fs.existsSync(path.join(standaloneDir, '.next'))) {
        fs.mkdirSync(path.join(standaloneDir, '.next'), { recursive: true });
      }
      execSync(`cp -r ${staticDir} ${standaloneStatic}`, { shell: '/bin/bash' });
    }

    const publicDir = path.join(appDir, 'public');
    if (fs.existsSync(publicDir)) {
      execSync(`cp -r ${publicDir}/* ${standaloneDir}/ 2>/dev/null || true`, { shell: '/bin/bash' });
    }
  }
}

function startNextServer() {
  const startPath = fs.existsSync(standaloneDir) ? standaloneDir : serverDir;
  const useStandalone = fs.existsSync(standaloneDir);

  console.log(`Starting Next.js server from ${useStandalone ? 'standalone' : 'server'}...`);

  if (useStandalone && fs.existsSync(path.join(standaloneDir, 'server.js'))) {
    serverProcess = spawn('node', ['server.js'], {
      cwd: standaloneDir,
      env: { ...process.env, PORT: '3000', HOST: '127.0.0.1' },
      stdio: 'inherit'
    });
  } else {
    serverProcess = spawn('pnpm', ['start'], {
      cwd: appDir,
      env: { ...process.env, PORT: '3000' },
      stdio: 'inherit'
    });
  }

  serverProcess.on('error', (err) => {
    console.error('Failed to start Next.js server:', err);
    process.exit(1);
  });

  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('Next.js server should be running on http://localhost:3000');
      resolve();
    }, 5000);
  });
}

function startTauri() {
  console.log('Starting Tauri...');
  const tauriProcess = spawn('pnpm', ['tauri', 'dev'], {
    cwd: appDir,
    stdio: 'inherit',
    shell: true
  });

  tauriProcess.on('close', (code) => {
    console.log(`Tauri exited with code ${code}`);
    if (serverProcess) {
      serverProcess.kill();
    }
    process.exit(code);
  });
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--build-only')) {
    await buildWeb();
    console.log('Build complete!');
    return;
  }

  await buildWeb();
  await startNextServer();
  startTauri();
}

main().catch(console.error);
