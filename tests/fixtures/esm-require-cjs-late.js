import {createRequire} from 'node:module';

const run = createRequire(import.meta.url)('./cjs-require-import-late.cjs');

export default async function runLateCjsImport() {
	return run();
}
