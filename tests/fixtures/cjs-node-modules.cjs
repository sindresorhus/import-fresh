const increment = require('./node_modules/stateful-cjs/index.cjs');

const incrementFromNodeModules = () => increment();

module.exports = incrementFromNodeModules;
