const modulePromise = import('./increment.js');

async function runCjsImport() {
	const {default: increment} = await modulePromise;
	return increment();
}

module.exports = runCjsImport;
