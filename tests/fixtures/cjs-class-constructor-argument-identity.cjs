class ConstructorIdentity {
	constructor(argument) {
		this.matches = argument === module.exports;
	}
}

module.exports = ConstructorIdentity;
