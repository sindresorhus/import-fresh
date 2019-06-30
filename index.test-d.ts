import {expectType, expectError} from 'tsd';
import importFresh = require('.');

expectType<unknown>(importFresh('hello'));
expectError(importFresh());
