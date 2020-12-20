import {expectType, expectError} from 'tsd';
import importFresh = require('.');
import path = require('path');

expectType<unknown>(importFresh('hello'));
expectError(importFresh());

expectType<(moduleId: string) => {}>(importFresh<(moduleId: string) => {}>('hello'));
expectType<path.PlatformPath>(importFresh<path.PlatformPath>('path'));

const foo = importFresh<path.PlatformPath>('path');
expectType<path.PlatformPath>(foo);
