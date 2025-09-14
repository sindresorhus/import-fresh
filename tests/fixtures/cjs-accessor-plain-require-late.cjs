let lastSetValue;

const exportedObject = {};

Object.defineProperty(exportedObject, 'value', {
	enumerable: true,
	get() {
		const increment = require('./cjs-late-require-singleton.cjs');
		return increment();
	},
	set(value) {
		const increment = require('./cjs-late-require-singleton.cjs');
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
