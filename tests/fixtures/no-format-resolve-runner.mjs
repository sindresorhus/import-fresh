import Module, {syncBuiltinESMExports} from 'node:module';

const originalRegisterHooks = Module.registerHooks;
Module.registerHooks = hooks => {
	const wrappedResolve = (specifier, context, nextResolve) => hooks.resolve(specifier, context, (nextSpecifier, nextContext) => {
		const resolved = nextResolve(nextSpecifier, nextContext);

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
	});

	return originalRegisterHooks({
		...hooks,
		resolve: wrappedResolve,
	});
};

syncBuiltinESMExports();

try {
	const {default: createImportFresh} = await import('../../index.js');
	const importFresh = createImportFresh(new URL('../test.js', import.meta.url));
	const moduleNamespace = await importFresh('./fixtures/top-level-await.js');

	if (typeof moduleNamespace.default !== 'function') {
		throw new TypeError('Expected top-level-await export to be a function.');
	}

	if (moduleNamespace.default() !== 1) {
		throw new TypeError('Expected top-level-await increment to start at 1.');
	}
} finally {
	Module.registerHooks = originalRegisterHooks;
	syncBuiltinESMExports();
}
