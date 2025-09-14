import {createRequire} from 'node:module';

const run = createRequire(import.meta.url)('./cjs-require-import-deferred-microtask.cjs');

export default async function runDeferredMicrotaskCjsImport() {
	return run();
}
