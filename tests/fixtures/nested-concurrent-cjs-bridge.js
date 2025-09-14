import createImportFresh from '../../index.js';

const importFresh = createImportFresh(import.meta.url);
const [first, second] = await Promise.all([
	importFresh('./esm-require-cjs.js'),
	importFresh('./esm-require-cjs.js'),
]);
const values = await Promise.all([
	first.default(),
	second.default(),
]);

export default values;
