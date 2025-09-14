const {createRequire} = require('node:module');

function runLateRequirePath() {
	const requireFunction = createRequire(__filename);
	const increment = requireFunction('./cjs-late-require-singleton-path.cjs');
	return increment();
}

module.exports = runLateRequirePath;
