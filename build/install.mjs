// build/install.mjs
// Copies compiled plugin files directly into the local Obsidian vault.
// Run after esbuild.mjs:
//   node build/esbuild.mjs && node build/install.mjs
//
// Vault path is resolved from (in order):
//   1. OBSIDIAN_VAULT_PATH env var
//   2. Default: ~/work/obsidian/work

import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const vaultPath = process.env.OBSIDIAN_VAULT_PATH
	?? resolve(homedir(), 'work/obsidian/work');

const pluginId = 'opencode-chat';
const pluginDir = resolve(vaultPath, '.obsidian/plugins', pluginId);

if (!existsSync(resolve(vaultPath, '.obsidian'))) {
	console.error(`Vault not found at: ${vaultPath}`);
	console.error('Set OBSIDIAN_VAULT_PATH env var to the correct path.');
	process.exit(1);
}

mkdirSync(pluginDir, { recursive: true });

const files = [
	{ src: resolve(root, 'build/dist/main.js'),     dst: resolve(pluginDir, 'main.js') },
	{ src: resolve(root, 'src/styles.css'),          dst: resolve(pluginDir, 'styles.css') },
	{ src: resolve(root, 'src/manifest.json'),       dst: resolve(pluginDir, 'manifest.json') },
];

for (const { src, dst } of files) {
	copyFileSync(src, dst);
	console.log(`  copied → ${dst}`);
}

console.log(`\nInstalled ${pluginId} → ${pluginDir}`);
console.log('Reload Obsidian or disable/enable the plugin to pick up changes.');
