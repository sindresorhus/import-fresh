import assert from 'node:assert/strict';
import test from 'node:test';
import createImportFresh from '../index.js';

const importFresh = createImportFresh(import.meta.url, {skipNodeModules: true});

test('skipNodeModules keeps CommonJS node_modules cached', async () => {
	const {default: first} = await importFresh('./fixtures/node-modules.js');
	const {default: second} = await importFresh('./fixtures/node-modules.js');

	const firstValue = first();
	const secondValue = second();
	assert.ok(secondValue > firstValue);
});

test('skipNodeModules keeps ESM node_modules cached', async () => {
	const importFreshFromFixtures = createImportFresh(new URL('fixtures/entry.js', import.meta.url), {skipNodeModules: true});
	const {default: first} = await importFreshFromFixtures('stateful-esm-js');
	const {default: second} = await importFreshFromFixtures('stateful-esm-js');

	const firstValue = first();
	const secondValue = second();
	assert.ok(secondValue > firstValue);
});

test('skipNodeModules also keeps downstream non-node_modules imports shared', async () => {
	const {default: first} = await importFresh('./fixtures/node-modules-esm-bridge-call.js');
	const {default: second} = await importFresh('./fixtures/node-modules-esm-bridge-call.js');

	assert.ok(second > first);
});

test('skipNodeModules importFresh function can be recreated with same options', async () => {
	const secondImportFresh = createImportFresh(import.meta.url, {skipNodeModules: true});
	const {default: value} = await secondImportFresh('./fixtures/node-modules-esm-bridge-call.js');

	assert.strictEqual(typeof value, 'number');
});
