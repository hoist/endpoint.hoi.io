'use strict';
var config = require('config');
RegExp.escape = function (s) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

module.exports = {
  queryFromHost: function (hostHeader) {
    hostHeader = hostHeader.toLowerCase();

    var domainRegex = new RegExp('([^\\.]*)' + RegExp.escape(config.hoist.domains.webhooks));
    var query = {};
    var domain = hostHeader.replace('live.', '');
    domain = domain.replace('dev.', '');
    domain = domain.replace('test.', '');
    var match = domainRegex.exec(domain);
    if (match) {
      query.subDomain = match[1];
    } else {
      query.alias = domain;
    }
    return query;
  },
  environmentFromHost: function (hostHeader) {
    var domainRegex = /^([^.]*)./;
    var match = domainRegex.exec(hostHeader.toLowerCase());
    var environment = 'live';
    if (match) {
      if (match[1] === 'dev' || match[1] === 'test') {
        environment = match[1];
      }
    }
    return environment;
  }
};
