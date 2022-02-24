'use strict';
const path = require('path');
const resolveFrom = require('resolve-from');
const parentModule = require('parent-module');

const clear = filePath => {
	// Delete itself from module parent
	if (require.cache[filePath] && require.cache[filePath].parent) {
		let i = require.cache[filePath].parent.children.length;

		while (i--) {
			if (require.cache[filePath].parent.children[i].id === filePath) {
				require.cache[filePath].parent.children.splice(i, 1);
			}
		}
	}

	// Remove all descendants from cache as well
	if (require.cache[filePath] && require.cache[filePath].children) {
		const children = require.cache[filePath].children.map(child => child.id);

		// Delete module from cache
		delete require.cache[filePath];

		for (const id of children) {
			clear(id);
		}
	}
};

module.exports = moduleId => {
	if (typeof moduleId !== 'string') {
		throw new TypeError('Expected a string');
	}

	const parentPath = parentModule(__filename);

	const cwd = parentPath ? path.dirname(parentPath) : __dirname;
	const filePath = resolveFrom(cwd, moduleId);

	clear(filePath);

	const parent = require.cache[parentPath]; // If `filePath` and `parentPath` are the same, cache will already be deleted so we won't get a memory leak in next step

	return parent === undefined ? require(filePath) : parent.require(filePath); // In case cache doesn't have parent, fall back to normal require
};
