/* eslint-disable unicorn/prefer-module */
const increment = require('./counter.js');

const run = () => increment();

module.exports = run;
