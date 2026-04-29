const { spawn } = require('child_process');
const path = require('path');

const serverPath = path.join(__dirname, '..', 'web', '.next', 'server');
const standalonePath = path.join(__dirname, '..', 'web', '.next', 'standalone');

let serverProcess;

function startServer() {
  const startPath = standalonePath;

  if (require('fs').existsSync(startPath)) {
    console.log('Starting Next.js server from standalone...');
    serverProcess = spawn('node', ['server.js'], {
      cwd: startPath,
      env: { ...process.env, PORT: '3000' },
      stdio: 'inherit'
    });
  } else {
    console.log('Starting Next.js server from server folder...');
    serverProcess = spawn('pnpm', ['start'], {
      cwd: path.join(__dirname, '..', 'web'),
      env: { ...process.env, PORT: '3000' },
      stdio: 'inherit'
    });
  }

  serverProcess.on('error', (err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

startServer();

process.on('SIGTERM', () => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
  process.exit(0);
});
