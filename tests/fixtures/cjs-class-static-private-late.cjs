class StaticLateCounter {
	static #count = 0;

	static increment() {
		this.#count += 1;
		return this.#count;
	}

	static async importIncrement() {
		const {default: increment} = await import('./increment.js');
		return increment();
	}

	static get count() {
		return this.#count;
	}
}

module.exports = StaticLateCounter;
