import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { stopOrphanedFirebaseEmulators } from './stop-firebase-emulators.mjs';

const exportDirectory = resolve('.firebase-data');
const metadataFile = resolve(exportDirectory, 'firebase-export-metadata.json');
const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
stopOrphanedFirebaseEmulators();
const args = [
  'firebase',
  'emulators:start',
  '--project',
  'demo-yukimiworks',
  '--only',
  'auth,firestore,storage',
  `--export-on-exit=${exportDirectory}`,
];

if (existsSync(metadataFile)) args.push(`--import=${exportDirectory}`);

const child = spawn(executable, args, { stdio: 'inherit' });
let terminationRequested = false;

function requestTermination(signal) {
  if (terminationRequested) return;
  terminationRequested = true;
  // ターミナルからのSIGINTは子プロセスへも届く。ここでは親プロセスが終了を待つため、自動終了させない。
  if (signal === 'SIGTERM') child.kill('SIGTERM');
}

process.on('SIGINT', () => requestTermination('SIGINT'));
process.on('SIGTERM', () => requestTermination('SIGTERM'));

child.on('error', (error) => {
  console.error(error);
  process.exitCode = 1;
});

child.on('close', (code, signal) => {
  if (signal) process.exitCode = 1;
  else process.exitCode = code ?? 1;
});
