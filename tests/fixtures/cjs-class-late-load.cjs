const {createRequire} = require('node:module');

class LateLoadCounter {
	#calls = 0;

	async importIncrement() {
		this.#calls += 1;
		const {default: increment} = await import('./increment.js');
		return increment();
	}

	requireIncrement() {
		this.#calls += 1;
		const requireFunction = createRequire(__filename);
		const increment = requireFunction('./cjs-late-require-singleton-path.cjs');
		return increment();
	}

	get calls() {
		return this.#calls;
	}
}

module.exports = LateLoadCounter;
