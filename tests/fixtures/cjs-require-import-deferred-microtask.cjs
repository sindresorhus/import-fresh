const modulePromise = new Promise(resolve => {
	queueMicrotask(() => {
		resolve(import('./increment.js'));
	});
});

async function runDeferredCjsImport() {
	const {default: increment} = await modulePromise;
	return increment();
}

module.exports = runDeferredCjsImport;
