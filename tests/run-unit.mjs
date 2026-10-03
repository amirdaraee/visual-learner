// Runs every tests/unit/*.test.mjs with the built-in test runner. Lists the files itself because `node --test "glob"`
// only works on newer Node versions and not on Windows shells.
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const dir = join(dirname(fileURLToPath(import.meta.url)), 'unit');
const files = readdirSync(dir).filter((f) => f.endsWith('.test.mjs')).sort().map((f) => join(dir, f));
if (!files.length) { console.error('No unit tests found.'); process.exit(1); }
process.exit(spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' }).status ?? 1);
