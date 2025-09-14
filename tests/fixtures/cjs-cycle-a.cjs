const dependency = require('./cjs-cycle-b.cjs');

const getValue = () => dependency.value + 1;

module.exports = getValue;
