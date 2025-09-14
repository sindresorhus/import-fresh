async function runLateCjsImport() {
	const {default: increment} = await import('./increment.js');
	return increment();
}

module.exports = runLateCjsImport;
