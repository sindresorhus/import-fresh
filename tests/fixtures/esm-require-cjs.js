import {createRequire} from 'node:module';

const run = createRequire(import.meta.url)('./cjs-require-import.cjs');

export default async function runCjsRequireImport() {
	return run();
}
