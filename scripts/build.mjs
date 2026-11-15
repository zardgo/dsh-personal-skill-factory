import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const { version } = JSON.parse(await readFile('package.json', 'utf8'));
await mkdir('lib', { recursive: true });
for (const name of (await readdir('src')).filter(name=>/\.(?:mjs|js)$/.test(name)&&!name.endsWith('-panel.js'))) {
  if(name==='client.js'){
    const client=await readFile('src/client.js','utf8');
    const panel=await readFile('src/architect-panel.js','utf8');
    const evalPanel=await readFile('src/eval-panel.js','utf8');
    await writeFile('lib/client.js',client.replace('/* ARCHITECT_PANEL */',()=>panel+'\n'+evalPanel));
  }else await copyFile('src/' + name, 'lib/' + name);
  const result = spawnSync(process.execPath, ['--check', 'lib/' + name], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const hostVersion = (await import('../lib/version.mjs')).VERSION;
const client = await readFile('lib/client.js', 'utf8');
if (hostVersion !== version || !client.includes("const VERSION='" + version + "';")) {
  throw new Error('Package, Host and client versions must match');
}
