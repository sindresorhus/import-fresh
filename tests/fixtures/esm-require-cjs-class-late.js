import {createRequire} from 'node:module';

const Counter = createRequire(import.meta.url)('./cjs-class-late-load.cjs');

export default Counter;
