'use strict';
const heapdump = require('heapdump'); // eslint-disable-line import/no-unresolved
const importFresh = require('.');

for (let i = 0; i < 100000; i++) {
	require('./fixture')();
}

heapdump.writeSnapshot(`require-${Date.now()}.heapsnapshot`);

for (let i = 0; i < 100000; i++) {
	importFresh('./fixture')();
}

heapdump.writeSnapshot(`import-fresh-${Date.now()}.heapsnapshot`);
