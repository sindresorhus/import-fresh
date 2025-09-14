const first = require('./cjs-singleton-dependency.cjs');
const second = require('./cjs-singleton-dependency.cjs');

module.exports = first === second;
