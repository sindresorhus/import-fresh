import {createRequire} from 'node:module';
import {setTimeout as delay} from 'node:timers/promises';

const run = createRequire(import.meta.url)('./cjs-require-import-late.cjs');

await delay(200);

export default async function runLateCjsImportDelayed() {
	return run();
}
