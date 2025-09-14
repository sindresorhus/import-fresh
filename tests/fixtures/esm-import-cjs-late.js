export default async function runLateCjsImport() {
	const {default: increment} = await import('./cjs-late-require-singleton.cjs');
	return increment();
}
