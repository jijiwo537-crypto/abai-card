/**
 * The build the tests drive.
 *
 * `VITE_TEST_HOOK=1` compiles in a handful of windows onto the game's own state — the harnesses
 * need to ask what is in a hand or whose turn it is, and reading that off a WebGL board through
 * screenshots is not a test, it is a guess. Those windows are also exactly what must never ship,
 * so the flagged build goes to `dist-hook/`, which is git-ignored, and the shipped build made by
 * `npm run build` never sets the flag.
 *
 * Spawned from here rather than written inline in package.json so the environment variable is
 * set the same way on every platform.
 */
import { spawnSync } from 'node:child_process';

const r = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite', 'build', '-c', 'vite.single.config.ts', '--outDir', 'dist-hook'],
  { stdio: 'inherit', env: { ...process.env, VITE_TEST_HOOK: '1' } },
);
process.exit(r.status ?? 1);
