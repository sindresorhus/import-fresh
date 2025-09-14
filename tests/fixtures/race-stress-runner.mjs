/* eslint-disable no-await-in-loop */
import assert from 'node:assert/strict';
import createImportFresh from '../../index.js';

const importFresh = createImportFresh(import.meta.url);
const importFreshNoFormat = createImportFresh(new URL('no-format-commonjs-js/entry.mjs', import.meta.url));

for (let iteration = 0; iteration < 30; iteration++) {
	const [topLevelFirst, topLevelSecond] = await Promise.all([
		importFresh('./top-level-await-cjs-bridge.js'),
		importFresh('./top-level-await-cjs-bridge.js'),
	]);
	const [topLevelFirstValue, topLevelSecondValue] = await Promise.all([
		topLevelFirst.default(),
		topLevelSecond.default(),
	]);
	assert.strictEqual(topLevelFirstValue, 1);
	assert.strictEqual(topLevelSecondValue, 1);

	const [first, second] = await Promise.all([
		importFresh('./esm-require-cjs.js'),
		importFresh('./esm-require-cjs.js'),
	]);
	const [firstValue, secondValue] = await Promise.all([
		first.default(),
		second.default(),
	]);
	assert.strictEqual(firstValue, 1);
	assert.strictEqual(secondValue, 1);

	const [deferredFirst, deferredSecond] = await Promise.all([
		importFresh('./esm-require-cjs-deferred-microtask.js'),
		importFresh('./esm-require-cjs-deferred-microtask.js'),
	]);
	const [deferredFirstValue, deferredSecondValue] = await Promise.all([
		deferredFirst.default(),
		deferredSecond.default(),
	]);
	assert.strictEqual(deferredFirstValue, 1);
	assert.strictEqual(deferredSecondValue, 1);

	const {default: nestedValues} = await importFresh('./nested-concurrent-cjs-bridge.js');
	assert.deepStrictEqual(nestedValues, [1, 1]);

	const noFormatFirst = await importFreshNoFormat('./entry.mjs');
	const noFormatSecond = await importFreshNoFormat('./entry.mjs');
	assert.strictEqual(noFormatFirst.default(), 1);
	assert.strictEqual(noFormatSecond.default(), 1);
}
