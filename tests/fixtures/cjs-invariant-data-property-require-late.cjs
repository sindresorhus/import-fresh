const exportedObject = {};

Object.defineProperty(exportedObject, 'run', {
	value() {
		const increment = require('./cjs-late-require-singleton-path.cjs');
		return increment();
	},
	configurable: false,
	writable: false,
	enumerable: true,
});

module.exports = exportedObject;
