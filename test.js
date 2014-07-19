'use strict';
var test = require('ava');
var requireUncached = require('./');

test('require a module', function (t) {
	var id = './fixture';
	t.assert(require(id)() === 1);
	t.assert(require(id)() === 2);
	t.assert(require(id)() === 3);
	t.assert(requireUncached(id)() === 1);
	t.assert(requireUncached(id)() === 1);
	t.assert(requireUncached(id)() === 1);
});
