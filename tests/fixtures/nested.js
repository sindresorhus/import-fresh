import createImportFresh from '../../index.js';

export default async function nestedImportFresh() {
	const importFresh = createImportFresh(import.meta.url);
	const {default: increment} = await importFresh('./increment.js');
	return increment();
}
