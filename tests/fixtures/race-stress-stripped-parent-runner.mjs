/* eslint-disable no-await-in-loop */
import assert from 'node:assert/strict';
import Module, {syncBuiltinESMExports} from 'node:module';

const originalRegisterHooks = Module.registerHooks;
const originalFindPackageJSON = Module.findPackageJSON;
const fixtureDirectorySegment = '/tests/fixtures/no-format-commonjs-js/';

Module.findPackageJSON = specifier => {
	if (typeof specifier === 'string' && specifier.includes(fixtureDirectorySegment)) {
		return undefined;
	}

	return originalFindPackageJSON(specifier);
};

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

		const resolved = hooks.resolve(specifier, nextContext, nextResolve);

		if (
			typeof resolved?.url === 'string'
			&& resolved.url.endsWith('.js')
			&& resolved.format !== undefined
		) {
			const resolvedWithoutFormat = {...resolved};
			delete resolvedWithoutFormat.format;
			return resolvedWithoutFormat;
		}

		return resolved;
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
	const importFreshNoFormat = createImportFresh(new URL('no-format-commonjs-js/entry.mjs', import.meta.url));

	for (let iteration = 0; iteration < 30; iteration++) {
		const [first, second] = await Promise.all([
			importFresh('./esm-require-cjs.js'),
			importFresh('./esm-require-cjs.js'),
		]);
		const [firstValue, secondValue] = await Promise.all([
			first.default(),
			second.default(),
		]);
		assert.strictEqual(firstValue, 1);
		assert.strictEqual(secondValue, 1);

		const {default: nestedValues} = await importFresh('./nested-concurrent-cjs-bridge.js');
		assert.deepStrictEqual(nestedValues, [1, 1]);

		const noFormatFirst = await importFreshNoFormat('./entry.mjs');
		const noFormatSecond = await importFreshNoFormat('./entry.mjs');
		assert.strictEqual(noFormatFirst.default(), 1);
		assert.strictEqual(noFormatSecond.default(), 1);
	}
} finally {
	Module.findPackageJSON = originalFindPackageJSON;
	Module.registerHooks = originalRegisterHooks;
	syncBuiltinESMExports();
}
