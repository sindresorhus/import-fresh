import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

export default function runLateRequirePath() {
	const require = createRequire(fileURLToPath(import.meta.url));
	const increment = require('./cjs-late-require-singleton.cjs');
	return increment();
}
