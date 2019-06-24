import {expectType, expectError} from 'tsd';
import importFresh = require('.');

expectType<any>(importFresh('hello'));
expectError(importFresh());
