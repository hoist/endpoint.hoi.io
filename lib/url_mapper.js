'use strict';
var config = require('config');
var Router = require('routes');
var url = require('url');
var _ = require('lodash');
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
  },
  routeFromPath: function (endpoints, request) {
    var router = new Router();
    if (endpoints&&request&&request.url) {
      var reqUrl = url.parse(request.url);
      var routes = _.keys(endpoints);
      if (routes.length > 0) {
        routes.forEach(function (r) {
          router.addRoute(r, function () {
            return endpoints[r];
          });
        });
        var match = router.match(reqUrl.pathname);
        if (match) {
          var endpoint = match.fn();
          var methods = [].concat(endpoint.methods);

          if (_.any(methods, function (method) {
            return method.toLowerCase() === request.method.toLowerCase();
          })) {
            return _.assign(match.params, endpoint);
          }
        }
      }
    }
    return null;
  }
};
