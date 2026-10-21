import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { build } from 'esbuild';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const server = await createServer({ configFile: 'vite.config.mts' });
await server.listen();
const url = server.resolvedUrls.local[0];
await import('./build-electron.mjs');
const electron = spawn(require('electron'), ['.'], {
  stdio: 'inherit',
  env: { ...process.env, VITE_DEV_SERVER_URL: url }
});
electron.on('exit', async () => { await server.close(); process.exit(0); });
