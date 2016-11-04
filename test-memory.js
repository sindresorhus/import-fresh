const heapdump = require('heapdump');
const uncached = require('./index.js');

for (let i = 0; i < 100000; i++) {
	require('./fixture.js')();
}

heapdump.writeSnapshot('./require-' + Date.now() + '.heapsnapshot');

for (let i = 0; i < 100000; i++) {
	uncached('./fixture.js')();
}

heapdump.writeSnapshot('./require-uncached-' + Date.now() + '.heapsnapshot');
