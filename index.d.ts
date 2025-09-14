/**
Import a module while bypassing the cache.

@example
```
// foo.js
let count = 0;
export default function increment() {
	count += 1;
	return count;
}

// index.js
import createImportFresh from 'import-fresh';

const importFresh = createImportFresh(import.meta.url);
const {default: increment} = await importFresh('./foo.js');

increment();
//=> 1

increment();
//=> 2

const {default: freshIncrement} = await importFresh('./foo.js');

freshIncrement();
//=> 1

const foo = await importFresh<typeof import('./foo.js')>('./foo.js');
```
*/
export type Options = {
	/**
	When `true`, modules under `node_modules` are not cache-busted.

	This option is process-global, so every `createImportFresh()` call in one process must use the same value.
	*/
	skipNodeModules?: boolean;
};

export type ImportAttributes = Record<string, string>;

export type ImportFreshOptions = {
	/**
	Import attributes passed to `import()`.

	Each value must be a string.
	*/
	importAttributes?: ImportAttributes;
};

export type ImportFreshFunction = <T = unknown>(moduleSpecifier: string, options?: ImportFreshOptions) => Promise<T>;

export default function createImportFresh(parentURL: string | URL, options?: Options): ImportFreshFunction;
