const {createRequire} = require('node:module');

function requirePrimitiveWithPath() {
	const requireFunction = createRequire(__filename);
	return requireFunction('./cjs-primitive-global-counter.cjs');
}

module.exports = requirePrimitiveWithPath;
