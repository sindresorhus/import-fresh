import {createRequire} from 'node:module';

export default function runLateRequire() {
	const require = createRequire(import.meta.url);
	const increment = require('./cjs-late-require-singleton.cjs');
	return increment();
}
