function checkIdentity(argument) {
	return argument === module.exports;
}

module.exports = checkIdentity;
