import Module, {syncBuiltinESMExports} from 'node:module';

const originalCreateRequire = Module.createRequire;
Module.createRequire = (...arguments_) => {
	const requireFunction = originalCreateRequire(...arguments_);
	requireFunction.cache = undefined;
	return requireFunction;
};

syncBuiltinESMExports();

try {
	const {default: createImportFresh} = await import('../../index.js');
	const importFresh = createImportFresh(new URL('../test.js', import.meta.url));
	const moduleNamespace = await importFresh('./fixtures/cjs.cjs');

	if (typeof moduleNamespace.default !== 'function') {
		throw new TypeError('Expected CommonJS function export.');
	}
} finally {
	Module.createRequire = originalCreateRequire;
	syncBuiltinESMExports();
}
