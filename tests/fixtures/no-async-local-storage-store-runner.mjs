import {AsyncLocalStorage} from 'node:async_hooks';
import {createRequire} from 'node:module';
import {setTimeout as delay} from 'node:timers/promises';

const originalGetStore = AsyncLocalStorage.prototype.getStore;

AsyncLocalStorage.prototype.getStore = function () {
	return undefined;
};

try {
	const {default: createImportFresh} = await import('../../index.js');
	const importFresh = createImportFresh(import.meta.url);
	const freshImportPromise = importFresh('./esm-require-cjs-late-delayed.js');

	await delay(20);

	const requireFunction = createRequire(import.meta.url);
	const run = requireFunction('./cjs-require-import-late.cjs');
	const firstValue = await run();
	const secondValue = await run();

	await freshImportPromise;

	if (secondValue !== firstValue + 1) {
		throw new TypeError('Expected regular require() import() calls to keep shared cache when AsyncLocalStorage store is unavailable.');
	}
} finally {
	AsyncLocalStorage.prototype.getStore = originalGetStore;
}
