import {createRequire} from 'node:module';

const StaticLateCounter = createRequire(import.meta.url)('./cjs-class-static-private-late.cjs');

export default StaticLateCounter;
