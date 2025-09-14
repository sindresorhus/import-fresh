const exported = {
	value: 1,
};

Object.defineProperty(exported, 'lazy', {
	enumerable: true,
	get() {
		throw new Error('lazy getter should not run eagerly');
	},
});

module.exports = exported;
