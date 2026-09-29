import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const exportDirectory = resolve('.firebase-data');
const metadataFile = resolve(exportDirectory, 'firebase-export-metadata.json');
const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
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

const result = spawnSync(executable, args, { stdio: 'inherit' });
process.exit(result.status ?? 1);
