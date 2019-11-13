const importFresh = require('.');

module.exports = what => {
	return importFresh(what);
};

module.exports.__filename = __filename;
