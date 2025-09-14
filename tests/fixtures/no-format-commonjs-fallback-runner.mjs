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
	const parentUrl = new URL('no-format-commonjs-js/entry.mjs', import.meta.url);
	const importFresh = createImportFresh(parentUrl);
	const first = await importFresh('./entry.mjs');
	const second = await importFresh('./entry.mjs');

	if (first.default() !== 1 || second.default() !== 1) {
		throw new TypeError('Expected package-less .js CJS fallback to stay fresh.');
	}
} finally {
	Module.findPackageJSON = originalFindPackageJSON;
	Module.registerHooks = originalRegisterHooks;
	syncBuiltinESMExports();
}
