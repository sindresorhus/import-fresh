const initialExports = {
	value: 'initial',
	replace() {
		module.exports = {value: 'replaced'};
		return module.exports;
	},
};

module.exports = initialExports;
