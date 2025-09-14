import assert from 'node:assert/strict';
import Module, {syncBuiltinESMExports} from 'node:module';

const originalRegisterHooks = Module.registerHooks;

Module.registerHooks = hooks => {
	const wrappedResolve = (specifier, context, nextResolve) => {
		const isRequireContext = Array.isArray(context?.conditions) && context.conditions.includes('require');
		const nextContext = isRequireContext ? {...context} : context;

		if (isRequireContext && typeof nextContext.parentURL === 'string') {
			try {
				const parsedParentUrl = new URL(nextContext.parentURL);
				parsedParentUrl.search = '';
				parsedParentUrl.hash = '';
				nextContext.parentURL = parsedParentUrl.href;
			} catch {}
		}

		return hooks.resolve(specifier, nextContext, nextResolve);
	};

	return originalRegisterHooks({
		...hooks,
		resolve: wrappedResolve,
	});
};

syncBuiltinESMExports();

try {
	const {default: createImportFresh} = await import('../../index.js');
	const importFresh = createImportFresh(import.meta.url);

	const {default: first} = await importFresh('./esm-require-cjs.js');
	const {default: second} = await importFresh('./esm-require-cjs.js');

	assert.strictEqual(await first(), 1);
	assert.strictEqual(await second(), 1);

	const [concurrentFirst, concurrentSecond] = await Promise.all([
		importFresh('./esm-require-cjs.js'),
		importFresh('./esm-require-cjs.js'),
	]);
	const [concurrentFirstValue, concurrentSecondValue] = await Promise.all([
		concurrentFirst.default(),
		concurrentSecond.default(),
	]);

	assert.strictEqual(concurrentFirstValue, 1);
	assert.strictEqual(concurrentSecondValue, 1);

	const {default: nestedValues} = await importFresh('./nested-concurrent-cjs-bridge.js');
	assert.deepStrictEqual(nestedValues, [1, 1]);
} finally {
	Module.registerHooks = originalRegisterHooks;
	syncBuiltinESMExports();
}
