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
	t.is(childModule.parent, module);
});

test('self import', t => {
	const id = './fixture-importer';
	t.notThrows(() => {
		importFresh(id)(id);
	});
});

test('import when parent removed from cache', t => {
	const id = './fixture-importer';
	const importer = importFresh(id);
	t.true(require.cache[importer.__filename] !== undefined);
	delete require.cache[importer.__filename];
	t.notThrows(() => {
		importer(id);
	});
});

test('should not fail when there no parent module', t => {
	const targetPath = require.resolve('parent-module');
	const orignalModule = require.cache[targetPath];
	delete require.cache[targetPath];
	delete require.cache[require.resolve('.')];
	require.cache[targetPath] = {
		loaded: true,
		id: targetPath,
		exports: () => undefined
	};

	const id = './fixture-importer';
	const importer = importFresh(id);

	t.notThrows(() => {
		importer(id);
	});

	require.cache[targetPath] = orignalModule;
});
