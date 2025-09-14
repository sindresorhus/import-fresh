const {createRequire} = require('node:module');

module.exports = {
	async importIncrement() {
		const {default: increment} = await import('./increment.js');
		return increment();
	},
	requireIncrement() {
		const requireFunction = createRequire(__filename);
		const increment = requireFunction('./cjs-late-require-singleton-path.cjs');
		return increment();
	},
	nested: {
		async importIncrement() {
			const {default: increment} = await import('./increment.js');
			return increment();
		},
	},
};
