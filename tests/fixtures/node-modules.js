/* eslint-disable import-x/newline-after-import */
import {createRequire} from 'node:module';
const require = createRequire(new URL('entry.js', import.meta.url));
const increment = require('stateful-cjs');

export default function incrementFromNodeModules() {
	return increment();
}
