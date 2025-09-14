import heapdump from 'heapdump';
import createImportFresh from './index.js';

const importFresh = createImportFresh(import.meta.url);

const {default: fixture} = await import('./tests/fixtures/increment.js');

for (let index = 0; index < 100_000; index++) {
	fixture();
}

heapdump.writeSnapshot(`import-${Date.now()}.heapsnapshot`);

for (let index = 0; index < 100_000; index++) {
	// eslint-disable-next-line no-await-in-loop
	const {default: freshFixture} = await importFresh('./tests/fixtures/increment.js');
	freshFixture();
}

heapdump.writeSnapshot(`import-fresh-${Date.now()}.heapsnapshot`);
