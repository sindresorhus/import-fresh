import {createRequire} from 'node:module';

const exportedFunction = createRequire(import.meta.url)('./cjs-function-properties-late.cjs');

export default exportedFunction;
