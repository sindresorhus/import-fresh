import {createRequire} from 'node:module';
import {setTimeout as delay} from 'node:timers/promises';

await delay(50);

const run = createRequire(import.meta.url)('./cjs-require-import.cjs');

export default async function runTopLevelAwaitCjsBridge() {
	return run();
}
