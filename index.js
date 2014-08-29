'use strict';
var path = require('path');
var resolveFrom = require('resolve-from');
var callerPath = require('caller-path');

module.exports = function (moduleId) {
	if (typeof moduleId !== 'string') {
		throw new TypeError('Expected a string');
	}

	var filePath = resolveFrom(path.dirname(callerPath()), moduleId);

	var cache = {};
	for (var beforeKey in require.cache) {
		cache[beforeKey] = true;
	}

	var ret = require(filePath);

	for (var afterKey in require.cache) {
		if (!cache[afterKey]) {
			delete require.cache[afterKey];
		}
	}

	return ret;
};
