import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const callback = globalThis.__importFreshInterleavedCallback;

if (typeof callback === 'function') {
	callback();
}

export default function runLateRequirePathInterleaved() {
	const require = createRequire(fileURLToPath(import.meta.url));
	const increment = require('./cjs-late-require-singleton.cjs');
	return increment();
}
