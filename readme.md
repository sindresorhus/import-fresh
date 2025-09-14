# import-fresh

> Import a module while bypassing the cache

Useful for testing purposes when you need to freshly import a module.

## Requirements

- Node.js 22.15 or later (uses module loader hooks)

## Install

```sh
npm install import-fresh
```

## Usage

```js
// foo.js
let count = 0;
export default function increment() {
	count += 1;
	return count;
}
```

```js
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
```

## API

### createImportFresh(parentURL, options?)

Returns an `importFresh` function bound to `parentURL`.

`parentURL` must be a valid hierarchical URL string (for example `import.meta.url`) or a `URL` instance.

#### options

Type: `object`

The options are process-global. Every call in the same process must use the same `skipNodeModules` value.

##### skipNodeModules

Type: `boolean`\
Default: `false`

When `true`, modules inside `node_modules` directories are not cache-busted. This means that dependencies from npm packages will share state across fresh imports, which can be useful when you only want to freshly import your own code.

### importFresh(moduleSpecifier, options?)

The function returned by `createImportFresh`.

#### options

Type: `object`

##### importAttributes

Type: `object`

Import attributes passed to `import()`. Each value must be a string. JSON modules are automatically imported with `{type: 'json'}` when the specifier ends with `.json`.

## Caveat

Intended for development usage only. Repeated calls grow the ESM module cache because each call uses a unique cache-busting URL. This is an unavoidable “memory leak” and not considered a vulnerability.

## Related

- [clear-module](https://github.com/sindresorhus/clear-module) - Clear a module from the import cache
- [import-from](https://github.com/sindresorhus/import-from) - Import a module from a given path
- [import-cwd](https://github.com/sindresorhus/import-cwd) - Import a module from the current working directory
- [import-lazy](https://github.com/sindresorhus/import-lazy) - Import modules lazily
