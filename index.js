const chaiHttp = require('./src/http');
const cache = require('./src/cache')

module.exports = {
  httpClient: chaiHttp,
  setup: (conf) => cache.setup(conf),
  skipFailedTests: (d)=> cache.skip(d)
};
