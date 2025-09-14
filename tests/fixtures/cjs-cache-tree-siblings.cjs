const siblingA = require('./cjs-cache-tree-sibling-a.cjs');
const siblingB = require('./cjs-cache-tree-sibling-b.cjs');

const runSiblings = () => ({
	a: siblingA(),
	b: siblingB(),
});

module.exports = runSiblings;
