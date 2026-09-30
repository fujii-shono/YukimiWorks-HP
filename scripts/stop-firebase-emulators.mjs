import { spawnSync } from 'node:child_process';

const emulatorPorts = [8080, 9099, 9199, 4000];
const emulatorCommandPattern = /cloud-firestore-emulator|firebase.*emulator|emulators:(start|exec)/i;

function commandOutput(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : '';
}

function getListeningProcesses(port) {
  const pids = commandOutput('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'])
    .split('\n')
    .filter(Boolean);

  return pids.map((pid) => {
    const [ppid, ...command] = commandOutput('ps', ['-p', pid, '-o', 'ppid=', '-o', 'command=']).trim().split(/\s+/);
    return { pid, ppid: Number(ppid), command: command.join(' ') };
  });
}

function stopProcess(pid) {
  const result = spawnSync('kill', ['-TERM', pid], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`Firebase Emulator (PID: ${pid}) を終了できませんでした。`);
}

export function stopOrphanedFirebaseEmulators() {
  const processes = emulatorPorts.flatMap(getListeningProcesses);
  const orphanedEmulators = processes.filter((process) => process.ppid === 1 && emulatorCommandPattern.test(process.command));

  for (const process of orphanedEmulators) {
    console.log(`孤立したFirebase Emulatorを終了します（PID: ${process.pid}）。`);
    stopProcess(process.pid);
  }

  const blockingProcesses = processes.filter((process) => !orphanedEmulators.includes(process));
  if (blockingProcesses.length) {
    const details = blockingProcesses.map((process) => `PID ${process.pid}: ${process.command}`).join('\n');
    throw new Error(`Firebase用ポートを別の実行中プロセスが使用しています。安全のため自動終了しません。\n${details}`);
  }
}

if (process.argv[1]?.endsWith('stop-firebase-emulators.mjs')) {
  stopOrphanedFirebaseEmulators();
}
