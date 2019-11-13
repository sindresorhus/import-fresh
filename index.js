'use strict';
const path = require('path');
const resolveFrom = require('resolve-from');
const parentModule = require('parent-module');

module.exports = moduleId => {
	if (typeof moduleId !== 'string') {
		throw new TypeError('Expected a string');
	}

	const parentPath = parentModule(__filename);

	const filePath = resolveFrom(path.dirname(parentPath), moduleId);

	const oldModule = require.cache[filePath];
	// Delete itself from module parent
	if (oldModule && oldModule.parent) {
		let i = oldModule.parent.children.length;

		while (i--) {
			if (oldModule.parent.children[i].id === filePath) {
				oldModule.parent.children.splice(i, 1);
			}
		}
	}

	// Delete module from cache
	delete require.cache[filePath];

	// Return fresh module
	return require.cache[parentPath].require(filePath);
};
