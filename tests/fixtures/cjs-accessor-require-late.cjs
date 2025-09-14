const {createRequire} = require('node:module');

const requireFunction = createRequire(__filename);
let lastSetValue;

const exportedObject = {};

Object.defineProperty(exportedObject, 'value', {
	enumerable: true,
	get() {
		const increment = requireFunction('./cjs-late-require-singleton-path.cjs');
		return increment();
	},
	set(value) {
		const increment = requireFunction('./cjs-late-require-singleton-path.cjs');
		lastSetValue = `${value}:${increment()}`;
	},
});

Object.defineProperty(exportedObject, 'lastSetValue', {
	enumerable: true,
	get() {
		return lastSetValue;
	},
});

module.exports = exportedObject;
