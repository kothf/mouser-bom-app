// Assemble a self-contained, runnable copy of the app from the Next.js
// standalone build: node package-release.mjs <output-dir>
// The result runs with `node server.js` (Node.js 20+), no npm install needed.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.resolve(process.argv[2] || path.join(root, 'dist', 'bom-studio'));
const standalone = path.join(root, '.next', 'standalone');

if (!fs.existsSync(path.join(standalone, 'server.js'))) {
  console.error('No standalone build found. Run `npm run build` first.');
  process.exit(1);
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

fs.cpSync(standalone, outDir, { recursive: true });
fs.cpSync(path.join(root, '.next', 'static'), path.join(outDir, '.next', 'static'), { recursive: true });
fs.cpSync(path.join(root, 'public'), path.join(outDir, 'public'), { recursive: true });
// Never ship BOM data saved by the build machine.
fs.rmSync(path.join(outDir, 'data'), { recursive: true, force: true });

for (const file of fs.readdirSync(path.join(root, 'release'))) {
  fs.copyFileSync(path.join(root, 'release', file), path.join(outDir, file));
}
fs.chmodSync(path.join(outDir, 'start.sh'), 0o755);

const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8')).version;
fs.writeFileSync(path.join(outDir, 'VERSION'), `${version}\n`);

console.log(`Packaged BOM Studio ${version} into ${outDir}`);
