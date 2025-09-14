const {createRequire} = require('node:module');

const requireFunction = createRequire(__filename);

function exportedFunction() {
	return 'ok';
}

Object.defineProperty(exportedFunction, 'value', {
	enumerable: true,
	get() {
		const increment = requireFunction('./cjs-late-require-singleton-path.cjs');
		return increment();
	},
});

module.exports = exportedFunction;
