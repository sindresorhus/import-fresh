import type path from 'node:path';
import {expectType, expectError} from 'tsd';
import createImportFresh, {type ImportFreshFunction, type ImportFreshOptions, type Options} from '../index.js';

const importFresh: ImportFreshFunction = createImportFresh(import.meta.url);
expectType<ImportFreshFunction>(importFresh);
expectError(importFresh());

expectType<Promise<unknown>>(importFresh('hello'));
expectType<Promise<unknown>>(importFresh('hello', {importAttributes: {type: 'json'}}));
expectError(importFresh('hello', {importAttributes: 'json'}));

expectType<typeof path>(await importFresh<typeof path>('node:path'));

expectType<ImportFreshFunction>(createImportFresh(import.meta.url));

const options: Options = {skipNodeModules: true};
expectType<ImportFreshFunction>(createImportFresh(import.meta.url, options));

const importFreshOptions: ImportFreshOptions = {importAttributes: {type: 'json'}};
expectType<Promise<unknown>>(importFresh('hello', importFreshOptions));
