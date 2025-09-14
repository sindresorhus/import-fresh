import createImportFresh from '../../index.js';

const importFresh = createImportFresh(import.meta.url);
const {default: increment} = await importFresh('./increment.js');

export default increment;
