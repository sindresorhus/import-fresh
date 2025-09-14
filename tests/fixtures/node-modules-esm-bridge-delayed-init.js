import {runDelayedImport} from './node_modules/stateful-esm-bridge-delayed/index.mjs';

const valuePromise = runDelayedImport();

export default valuePromise;
