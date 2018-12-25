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
});
