import path from 'path';
import test from 'ava';
import importFresh from '.';

test('main', t => {
	const id = './fixture';
	t.is(require(id)(), 1);
	t.is(require(id)(), 2);
	t.is(require(id)(), 3);
	t.is(importFresh(id)(), 1);
	t.is(importFresh(id)(), 1);
	t.is(importFresh(id)(), 1);
	t.is(require(id)(), 2);
});

test('proper parent value', t => {
	const id = './fixture';

	importFresh(id);

	const childModule = require.cache[path.resolve(__dirname, `${id}.js`)];
	t.true(childModule.parent === module);
});
