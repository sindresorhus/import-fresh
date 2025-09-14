import {createRequire} from 'node:module';

const exportedObject = createRequire(import.meta.url)('./cjs-object-late-load.cjs');

export default exportedObject;
