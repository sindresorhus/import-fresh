const {createRequire} = require('node:module');

function loadReassignableModule() {
	const requireFunction = createRequire(__filename);
	return requireFunction('./cjs-module-exports-reassign-path.cjs');
}

module.exports = loadReassignableModule;
