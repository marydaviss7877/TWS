#!/usr/bin/env node

const { execSync } = require('child_process');

const PORTS = [3000, 5000];

function unique(values) {
  return [...new Set(values)];
}

function getPidsOnPortWindows(port) {
  const output = execSync(`netstat -ano -p tcp | findstr :${port}`, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore']
  });

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\s+/))
    .filter((parts) => parts.length >= 5 && parts[3] === 'LISTENING')
    .map((parts) => Number(parts[4]))
    .filter((pid) => Number.isInteger(pid) && pid > 0);
}

function getPidsOnPortUnix(port) {
  const output = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore']
  });

  return output
    .split(/\r?\n/)
    .map((pid) => Number(pid.trim()))
    .filter((pid) => Number.isInteger(pid) && pid > 0);
}

function killPidWindows(pid) {
  execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
}

function killPidUnix(pid) {
  execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
}

function getPidsOnPort(port) {
  try {
    return process.platform === 'win32'
      ? getPidsOnPortWindows(port)
      : getPidsOnPortUnix(port);
  } catch {
    return [];
  }
}

function killPid(pid) {
  try {
    if (process.platform === 'win32') {
      killPidWindows(pid);
    } else {
      killPidUnix(pid);
    }
    return true;
  } catch {
    return false;
  }
}

function freePort(port) {
  const pids = unique(getPidsOnPort(port)).filter((pid) => pid !== process.pid);

  if (pids.length === 0) {
    console.log(`[ports] Port ${port} is already free`);
    return;
  }

  for (const pid of pids) {
    const killed = killPid(pid);
    if (killed) {
      console.log(`[ports] Freed port ${port} by stopping PID ${pid}`);
    } else {
      console.log(`[ports] Could not stop PID ${pid} on port ${port}`);
    }
  }
}

console.log('[ports] Checking required ports...');
PORTS.forEach(freePort);
console.log('[ports] Port check complete');
