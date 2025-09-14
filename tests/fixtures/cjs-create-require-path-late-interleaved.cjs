const {createRequire} = require('node:module');

const callback = globalThis.__importFreshInterleavedCallback;

if (typeof callback === 'function') {
	callback();
}

function runLateRequirePathInterleaved() {
	const requireFunction = createRequire(__filename);
	const increment = requireFunction('./cjs-late-require-singleton-path.cjs');
	return increment();
}

module.exports = runLateRequirePathInterleaved;
