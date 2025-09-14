import {createRequire} from 'node:module';

const run = createRequire(import.meta.url)('./bridge.js');

export default function runBridge() {
	return run();
}
