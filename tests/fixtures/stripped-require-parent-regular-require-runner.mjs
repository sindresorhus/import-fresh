import Module, {createRequire, syncBuiltinESMExports} from 'node:module';
import {setTimeout as delay} from 'node:timers/promises';

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
	const freshImportPromise = importFresh('./esm-require-cjs-late-delayed.js');

	await delay(20);
	const requireFunction = createRequire(import.meta.url);
	const run = requireFunction('./cjs-require-import-late.cjs');
	const firstValue = await run();
	const secondValue = await run();
	await freshImportPromise;

	if (secondValue !== firstValue + 1) {
		throw new TypeError('Expected regular require() to keep shared cache when require parent URL search is stripped.');
	}
} finally {
	Module.registerHooks = originalRegisterHooks;
	syncBuiltinESMExports();
}
