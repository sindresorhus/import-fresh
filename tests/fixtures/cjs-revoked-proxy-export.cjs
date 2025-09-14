const {proxy, revoke} = Proxy.revocable({value: 1}, {});

revoke();

module.exports = proxy;
