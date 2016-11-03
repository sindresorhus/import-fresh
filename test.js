import test from 'ava';
import m from './';

test(t => {
	const id = './fixture';
	t.is(require(id)(), 1);
	t.is(require(id)(), 2);
	t.is(require(id)(), 3);
	t.is(m(id)(), 1);
	t.is(m(id)(), 1);
	t.is(m(id)(), 1);
});
