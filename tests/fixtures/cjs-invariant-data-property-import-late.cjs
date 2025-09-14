const exportedObject = {};

Object.defineProperty(exportedObject, 'run', {
	async value() {
		const {default: increment} = await import('./increment.js');
		return increment();
	},
	configurable: false,
	writable: false,
	enumerable: true,
});

module.exports = exportedObject;
