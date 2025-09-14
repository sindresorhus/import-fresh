import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import process from 'node:process';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import createImportFresh from '../index.js';

const importFresh = createImportFresh(import.meta.url);

test('fresh import returns a new ESM module instance', async () => {
	const {default: first} = await importFresh('./fixtures/increment.js');
	const {default: second} = await importFresh('./fixtures/increment.js');

	assert.strictEqual(first(), 1);
	assert.strictEqual(first(), 2);
	assert.strictEqual(second(), 1);
});

test('dependency graph is fresh per call for ESM dependencies', async () => {
	const {default: first} = await importFresh('./fixtures/parent.js');
	const {default: second} = await importFresh('./fixtures/parent.js');

	assert.strictEqual(first(), 1);
	assert.strictEqual(second(), 1);
});

test('top-level await can use importFresh without deadlock', async () => {
	const {default: increment} = await importFresh('./fixtures/top-level-await.js');

	assert.strictEqual(increment(), 1);
});

test('top-level await fresh imports remain isolated when started concurrently', async () => {
	const [first, second] = await Promise.all([
		importFresh('./fixtures/top-level-await-cjs-bridge.js'),
		importFresh('./fixtures/top-level-await-cjs-bridge.js'),
	]);
	const [firstValue, secondValue] = await Promise.all([
		first.default(),
		second.default(),
	]);

	assert.strictEqual(firstValue, 1);
	assert.strictEqual(secondValue, 1);
});

test('CommonJS entry modules are fresh across fresh imports', async () => {
	const {default: first} = await importFresh('./fixtures/cjs.cjs');
	const {default: second} = await importFresh('./fixtures/cjs.cjs');

	assert.notStrictEqual(first, second);
	assert.strictEqual(first(), 1);
	assert.strictEqual(second(), 1);
});

test('CommonJS dependencies are fresh across fresh ESM entries', async () => {
	const {default: first} = await importFresh('./fixtures/mixed.js');
	const {default: second} = await importFresh('./fixtures/mixed.js');

	assert.strictEqual(first(), 1);
	assert.strictEqual(second(), 1);
});

test('CommonJS cache tree clearing evicts all sibling dependencies', async () => {
	const {default: first} = await importFresh('./fixtures/cjs-cache-tree-siblings.cjs');
	const {default: second} = await importFresh('./fixtures/cjs-cache-tree-siblings.cjs');

	assert.deepStrictEqual(first(), {a: 1, b: 1});
	assert.deepStrictEqual(second(), {a: 1, b: 1});
});

test('CommonJS dynamic import bridges are fresh across fresh imports', async () => {
	const {default: first} = await importFresh('./fixtures/esm-require-cjs.js');
	const {default: second} = await importFresh('./fixtures/esm-require-cjs.js');

	assert.strictEqual(await first(), 1);
	assert.strictEqual(await second(), 1);
});

test('CommonJS deferred microtask dynamic import bridges are fresh across fresh imports', async () => {
	const {default: first} = await importFresh('./fixtures/esm-require-cjs-deferred-microtask.js');
	const {default: second} = await importFresh('./fixtures/esm-require-cjs-deferred-microtask.js');

	assert.strictEqual(await first(), 1);
	assert.strictEqual(await second(), 1);
});

test('concurrent fresh imports keep CJS bridge cache keys isolated', async () => {
	const [first, second] = await Promise.all([
		importFresh('./fixtures/esm-require-cjs.js'),
		importFresh('./fixtures/esm-require-cjs.js'),
	]);
	const [firstValue, secondValue] = await Promise.all([
		first.default(),
		second.default(),
	]);

	assert.strictEqual(firstValue, 1);
	assert.strictEqual(secondValue, 1);
});

test('concurrent fresh imports keep deferred microtask CJS bridge cache keys isolated', async () => {
	const [first, second] = await Promise.all([
		importFresh('./fixtures/esm-require-cjs-deferred-microtask.js'),
		importFresh('./fixtures/esm-require-cjs-deferred-microtask.js'),
	]);
	const [firstValue, secondValue] = await Promise.all([
		first.default(),
		second.default(),
	]);

	assert.strictEqual(firstValue, 1);
	assert.strictEqual(secondValue, 1);
});

test('regular require is not retargeted by previous fresh CJS bridge context', async () => {
	const {default: runFresh} = await importFresh('./fixtures/esm-require-cjs-late.js');
	await runFresh();

	const requireFunction = createRequire(import.meta.url);
	const run = requireFunction('./fixtures/cjs-require-import-late.cjs');
	const firstValue = await run();
	const secondValue = await run();

	assert.strictEqual(secondValue, firstValue + 1);
});

test('regular require is not retargeted during an active fresh CJS bridge import', async () => {
	const freshImportPromise = importFresh('./fixtures/esm-require-cjs-late-delayed.js');
	await delay(20);
	const requireFunction = createRequire(import.meta.url);
	const run = requireFunction('./fixtures/cjs-require-import-late.cjs');
	const firstValue = await run();
	const secondValue = await run();
	await freshImportPromise;

	assert.strictEqual(secondValue, firstValue + 1);
});

test('nested concurrent fresh CJS bridge imports remain isolated', async () => {
	const {default: values} = await importFresh('./fixtures/nested-concurrent-cjs-bridge.js');

	assert.deepStrictEqual(values, [1, 1]);
});

test('shared CommonJS imports from multiple ESM parents do not collide', async () => {
	const {default: moduleNamespace} = await importFresh('./fixtures/esm-shared-cjs-two-parents.js');

	assert.strictEqual(moduleNamespace.first, moduleNamespace.second);
});

test('ESM packages in node_modules are fresh by default', async () => {
	const importFreshFromFixtures = createImportFresh(new URL('fixtures/entry.js', import.meta.url));
	const {default: first} = await importFreshFromFixtures('stateful-esm-js');
	const {default: second} = await importFreshFromFixtures('stateful-esm-js');

	assert.strictEqual(first(), 1);
	assert.strictEqual(second(), 1);
});

test('CommonJS packages in node_modules are fresh by default', async () => {
	const importFreshFromFixtures = createImportFresh(new URL('fixtures/entry.js', import.meta.url));
	const {default: first} = await importFreshFromFixtures('stateful-cjs-js');
	const {default: second} = await importFreshFromFixtures('stateful-cjs-js');

	assert.strictEqual(first(), 1);
	assert.strictEqual(second(), 1);
});

test('relative specifiers resolve against parentURL', async () => {
	const importFreshFromParent = createImportFresh(new URL('fixtures/parent.js', import.meta.url));
	const {default: increment} = await importFreshFromParent('./increment.js');

	assert.strictEqual(increment(), 1);
});

test('CommonJS module parent is bound to the importFresh parentURL', async () => {
	const moduleNamespace = await importFresh('./fixtures/cjs-parent.cjs');

	assert.strictEqual(moduleNamespace.default.parent.filename, fileURLToPath(import.meta.url));
});

test('CommonJS loading works when require cache is unavailable', () => {
	const runnerPath = fileURLToPath(new URL('fixtures/no-cache-require-runner.mjs', import.meta.url));

	assert.doesNotThrow(() => {
		execFileSync(process.execPath, [runnerPath], {
			cwd: fileURLToPath(new URL('..', import.meta.url)),
		});
	});
});

test('regular require is not retargeted during active fresh import when AsyncLocalStorage store is unavailable', () => {
	const runnerPath = fileURLToPath(new URL('fixtures/no-async-local-storage-store-runner.mjs', import.meta.url));

	assert.doesNotThrow(() => {
		execFileSync(process.execPath, [runnerPath], {
			cwd: fileURLToPath(new URL('..', import.meta.url)),
		});
	});
});

test('CommonJS dynamic import bridges are fresh when require parent URL search is stripped', () => {
	const runnerPath = fileURLToPath(new URL('fixtures/stripped-require-parent-cjs-bridge-runner.mjs', import.meta.url));

	assert.doesNotThrow(() => {
		execFileSync(process.execPath, [runnerPath], {
			cwd: fileURLToPath(new URL('..', import.meta.url)),
		});
	});
});

test('missing format fallback treats package-less .js as CommonJS when require parent URL search is stripped', () => {
	const runnerPath = fileURLToPath(new URL('fixtures/stripped-require-parent-no-format-commonjs-runner.mjs', import.meta.url));

	assert.doesNotThrow(() => {
		execFileSync(process.execPath, [runnerPath], {
			cwd: fileURLToPath(new URL('..', import.meta.url)),
		});
	});
});

test('regular require is not retargeted during active fresh import when require parent URL search is stripped', () => {
	const runnerPath = fileURLToPath(new URL('fixtures/stripped-require-parent-regular-require-runner.mjs', import.meta.url));

	assert.doesNotThrow(() => {
		execFileSync(process.execPath, [runnerPath], {
			cwd: fileURLToPath(new URL('..', import.meta.url)),
		});
	});
});

test('missing format in resolve chain does not force .js modules through CJS path', () => {
	const runnerPath = fileURLToPath(new URL('fixtures/no-format-resolve-runner.mjs', import.meta.url));

	assert.doesNotThrow(() => {
		execFileSync(process.execPath, [runnerPath], {
			cwd: fileURLToPath(new URL('..', import.meta.url)),
		});
	});
});

test('missing format fallback treats package-less .js as CommonJS', () => {
	const runnerPath = fileURLToPath(new URL('fixtures/no-format-commonjs-fallback-runner.mjs', import.meta.url));

	assert.doesNotThrow(() => {
		execFileSync(process.execPath, [runnerPath], {
			cwd: fileURLToPath(new URL('..', import.meta.url)),
		});
	});
});

test('loader hooks are registered only once across cache-busted index imports', () => {
	const runnerPath = fileURLToPath(new URL('fixtures/register-hooks-once-runner.mjs', import.meta.url));

	assert.doesNotThrow(() => {
		execFileSync(process.execPath, [runnerPath], {
			cwd: fileURLToPath(new URL('..', import.meta.url)),
		});
	});
});

test('race stress: fresh imports remain isolated across repeated concurrent CJS bridge scenarios', () => {
	const runnerPath = fileURLToPath(new URL('fixtures/race-stress-runner.mjs', import.meta.url));

	assert.doesNotThrow(() => {
		execFileSync(process.execPath, [runnerPath], {
			cwd: fileURLToPath(new URL('..', import.meta.url)),
		});
	});
});

test('race stress: stripped require parent URL and missing format remain isolated', () => {
	const runnerPath = fileURLToPath(new URL('fixtures/race-stress-stripped-parent-runner.mjs', import.meta.url));

	assert.doesNotThrow(() => {
		execFileSync(process.execPath, [runnerPath], {
			cwd: fileURLToPath(new URL('..', import.meta.url)),
		});
	});
});

test('moduleSpecifier must be a string', async () => {
	await assert.rejects(importFresh(123), {message: /Expected a string/});
});

test('importFresh options must be an object', async () => {
	await assert.rejects(importFresh('./fixtures/increment.js', 123), {message: /Expected options to be an object/});
});

test('importFresh options must reject arrays', async () => {
	await assert.rejects(importFresh('./fixtures/increment.js', []), {message: /Expected options to be an object/});
});

test('importFresh importAttributes must be an object', async () => {
	await assert.rejects(importFresh('./fixtures/increment.js', {importAttributes: 123}), {message: /importAttributes/});
});

test('importFresh importAttributes must reject arrays', async () => {
	await assert.rejects(importFresh('./fixtures/increment.js', {importAttributes: []}), {message: /importAttributes/});
});

test('importFresh importAttributes values must be strings', async () => {
	await assert.rejects(importFresh('./fixtures/increment.js', {importAttributes: {type: 123}}), {message: /importAttributes\.type/});
});

test('parentURL must be a string or URL', () => {
	assert.throws(() => {
		createImportFresh(123);
	}, {message: /parentURL/});
});

test('parentURL must be a valid URL string', () => {
	assert.throws(() => {
		createImportFresh('/not-a-url');
	}, {message: /parentURL/});
});

test('parentURL must be a hierarchical URL string', () => {
	assert.throws(() => {
		createImportFresh('node:path');
	}, {message: /hierarchical URL string/});
});

test('parentURL must reject Windows path-like URL strings', () => {
	assert.throws(() => {
		createImportFresh('C:/foo/bar.js');
	}, {message: /hierarchical URL string/});
});

test('parentURL can be a URL instance', async () => {
	const importFreshFromUrl = createImportFresh(new URL(import.meta.url));
	const {default: increment} = await importFreshFromUrl('./fixtures/increment.js');

	assert.strictEqual(increment(), 1);
});

test('createImportFresh options must be an object', () => {
	assert.throws(() => {
		createImportFresh(import.meta.url, 123);
	}, {message: /Expected options to be an object/});
});

test('createImportFresh options must reject arrays', () => {
	assert.throws(() => {
		createImportFresh(import.meta.url, []);
	}, {message: /Expected options to be an object/});
});

test('createImportFresh skipNodeModules must be a boolean', () => {
	assert.throws(() => {
		createImportFresh(import.meta.url, {skipNodeModules: 'yes'});
	}, {message: /skipNodeModules/});
});

test('createImportFresh throws on conflicting options', () => {
	assert.throws(() => {
		createImportFresh(import.meta.url, {skipNodeModules: true});
	}, {message: /same options/});
});

test('createImportFresh can be called multiple times with the same options', async () => {
	const repeatedImportFresh = createImportFresh(import.meta.url);
	const {default: increment} = await repeatedImportFresh('./fixtures/increment.js');

	assert.strictEqual(increment(), 1);
});

test('absolute specifiers are supported', async () => {
	const specifier = new URL('fixtures/increment.js', import.meta.url).href;
	const {default: increment} = await importFresh(specifier);

	assert.strictEqual(increment(), 1);
});

test('builtin specifiers are supported', async () => {
	const moduleNamespace = await importFresh('node:path');

	assert.strictEqual(typeof moduleNamespace.sep, 'string');
});

test('JSON modules are supported', async () => {
	const first = await importFresh('./fixtures/data.json');
	const second = await importFresh('./fixtures/data.json');

	assert.deepStrictEqual(first.default, {count: 1});
	assert.deepStrictEqual(second.default, {count: 1});
});

test('explicit import attributes are forwarded', async () => {
	const moduleNamespace = await importFresh('./fixtures/data.json', {
		importAttributes: {type: 'json'},
	});

	assert.deepStrictEqual(moduleNamespace.default, {count: 1});
});

test('JSON modules keep automatic type attribute when importAttributes is empty', async () => {
	const moduleNamespace = await importFresh('./fixtures/data.json', {
		importAttributes: {},
	});

	assert.deepStrictEqual(moduleNamespace.default, {count: 1});
});

test('JSON modules keep automatic type attribute when importAttributes.type is non-enumerable', async () => {
	const importAttributes = {};
	Object.defineProperty(importAttributes, 'type', {
		value: 'json',
		enumerable: false,
	});

	const moduleNamespace = await importFresh('./fixtures/data.json', {
		importAttributes,
	});

	assert.deepStrictEqual(moduleNamespace.default, {count: 1});
});

test('fresh import busts cache for data URLs', async () => {
	const dataUrl = 'data:text/javascript,let count = 0; export default () => ++count;';
	const {default: first} = await importFresh(dataUrl);
	const {default: second} = await importFresh(dataUrl);

	assert.strictEqual(first(), 1);
	assert.strictEqual(second(), 1);
});

test('specifiers with search parameters are supported', async () => {
	const {default: first} = await importFresh('./fixtures/increment.js?test=1');
	const {default: second} = await importFresh('./fixtures/increment.js?test=2');

	assert.strictEqual(first(), 1);
	assert.strictEqual(second(), 1);
});

test('CommonJS specifiers with search parameters are fresh', async () => {
	const {default: first} = await importFresh('./fixtures/cjs.cjs?test=1');
	const {default: second} = await importFresh('./fixtures/cjs.cjs?test=2');

	assert.notStrictEqual(first, second);
	assert.strictEqual(first(), 1);
	assert.strictEqual(second(), 1);
});

test('CommonJS revoked proxy exports can be imported fresh', async () => {
	const moduleNamespace = await importFresh('./fixtures/cjs-revoked-proxy-export.cjs');

	assert.strictEqual(typeof moduleNamespace.default, 'object');
});

test('CommonJS undefined exports are treated as valid exports', async () => {
	const moduleNamespace = await importFresh('./fixtures/cjs-exports-undefined.cjs');

	assert.strictEqual(moduleNamespace.default, undefined);
	assert.strictEqual(moduleNamespace['module.exports'], undefined);
});

test('CommonJS named exports are exposed for exports assignments', async () => {
	const moduleNamespace = await importFresh('./fixtures/cjs-named-exports.cjs');

	assert.strictEqual(moduleNamespace.value, 1);
});

test('CommonJS non-enumerable data properties are exposed as named exports', async () => {
	const moduleNamespace = await importFresh('./fixtures/cjs-named-non-enumerable.cjs');

	assert.strictEqual(moduleNamespace.foo, 1);
});

test('CommonJS getters are not executed while building named exports', async () => {
	const moduleNamespace = await importFresh('./fixtures/cjs-getter-export.cjs');

	assert.strictEqual(moduleNamespace.default.value, 1);
	assert.strictEqual(moduleNamespace.value, 1);
	assert.strictEqual(Object.hasOwn(moduleNamespace, 'lazy'), false);
});

test('CommonJS function default export does not expose intrinsic function named exports', async () => {
	const moduleNamespace = await importFresh('./fixtures/cjs-function-default-only.cjs');

	assert.strictEqual(Object.hasOwn(moduleNamespace, 'length'), false);
	assert.strictEqual(Object.hasOwn(moduleNamespace, 'name'), false);
	assert.strictEqual(Object.hasOwn(moduleNamespace, 'prototype'), false);
});

test('CommonJS class default export does not expose intrinsic class named exports', async () => {
	const moduleNamespace = await importFresh('./fixtures/cjs-class-default-only.cjs');

	assert.strictEqual(Object.hasOwn(moduleNamespace, 'length'), false);
	assert.strictEqual(Object.hasOwn(moduleNamespace, 'name'), false);
	assert.strictEqual(Object.hasOwn(moduleNamespace, 'prototype'), false);
});
