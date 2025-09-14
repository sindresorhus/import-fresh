const modulePromise = import('./increment.js');

const incrementWithDynamicImport = async () => {
	const {default: increment} = await modulePromise;
	return increment();
};

module.exports = incrementWithDynamicImport;
