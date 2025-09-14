function exportedFunction() {
	return 'ok';
}

let localCount = 0;

exportedFunction.localCount = function () {
	localCount += 1;
	return localCount;
};

exportedFunction.importIncrement = async function () {
	const {default: increment} = await import('./increment.js');
	return increment();
};

exportedFunction.nested = {
	async importIncrement() {
		const {default: increment} = await import('./increment.js');
		return increment();
	},
};

class AttachedClass {
	static #count = 0;

	static increment() {
		this.#count += 1;
		return this.#count;
	}

	static async importIncrement() {
		const {default: increment} = await import('./increment.js');
		return increment();
	}
}

exportedFunction.AttachedClass = AttachedClass;

module.exports = exportedFunction;
