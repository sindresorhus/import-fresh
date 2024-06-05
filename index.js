'use strict';
const path = require('path');
const resolveFrom = require('resolve-from');
const parentModule = require('parent-module');

// Use plain require in webpack context for dynamic import
const requireFunc = typeof __webpack_require__ === 'function' ? __non_webpack_require__ : require; // eslint-disable-line camelcase,no-undef

module.exports = moduleId => {
	if (typeof moduleId !== 'string') {
		throw new TypeError('Expected a string');
	}

	const parentPath = parentModule(__filename);

	const cwd = parentPath ? path.dirname(parentPath) : __dirname;
	const filePath = resolveFrom(cwd, moduleId);

	const oldModule = requireFunc.cache[filePath];
	// Delete itself from module parent
	if (oldModule && oldModule.parent) {
		let i = oldModule.parent.children.length;

		while (i--) {
			if (oldModule.parent.children[i].id === filePath) {
				oldModule.parent.children.splice(i, 1);
			}
		}
	}

	delete requireFunc.cache[filePath]; // Delete module from cache

	const parent = requireFunc.cache[parentPath]; // If `filePath` and `parentPath` are the same, cache will already be deleted so we won't get a memory leak in next step

	return parent === undefined ? requireFunc(filePath) : parent.require(filePath); // In case cache doesn't have parent, fall back to normal require
};
