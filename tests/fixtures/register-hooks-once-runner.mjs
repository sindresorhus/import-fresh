import Module, {syncBuiltinESMExports} from 'node:module';

let registerHooksCallCount = 0;
const originalRegisterHooks = Module.registerHooks;
Module.registerHooks = hooks => {
	registerHooksCallCount++;
	return originalRegisterHooks(hooks);
};

syncBuiltinESMExports();

try {
	const {default: createImportFresh} = await import('../../index.js');
	const importFresh = createImportFresh(new URL('../test.js', import.meta.url));
	await importFresh('./fixtures/top-level-await.js');
	await importFresh('./fixtures/top-level-await.js');
	await importFresh('./fixtures/top-level-await.js');

	if (registerHooksCallCount !== 1) {
		throw new TypeError(`Expected registerHooks to be called once, got ${registerHooksCallCount}.`);
	}
} finally {
	Module.registerHooks = originalRegisterHooks;
	syncBuiltinESMExports();
}
