'use strict';
var Router = require('routes');
var url = require('url');
var _ = require('lodash');
RegExp.escape = function (s) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

var mapper = {
  queryFromPath: function (path) {

    var query = {
      subDomain: mapper.sanitisePath(path).subDomain
    };
    return query;
  },
  environmentFromPath: function (path) {
    return mapper.sanitisePath(path).environment;
  },
  sanitisePath: function (path) {
    var parts = path.toLowerCase().split('/');
    var requestParts = {

    };
    if (parts[0] !== '') {
      parts.splice(0, 0, '');
    }
    requestParts.subDomain = parts[1];
    parts.splice(1, 1);
    if (parts[1] === 'test' || parts[1] === 'dev' || parts[1] === 'live') {
      requestParts.environment = parts[1];
      parts.splice(1, 1);
    }
    else{
      requestParts.environment = 'live';
    }
    requestParts.path = parts.join('/');
    return requestParts;
  },
  routeFromPath: function (endpoints, request) {
    var router = new Router();
    if (endpoints && request && request.url) {
      var reqPath = url.parse(request.url).pathname;
      reqPath = mapper.sanitisePath(reqPath).path;
      var routes = _.keys(endpoints);
      if (routes.length > 0) {
        routes.forEach(function (r) {
          router.addRoute(r, function () {
            return endpoints[r];
          });
        });
        var match = router.match(reqPath);
        if (match) {
          var endpoint = match.fn();
          var methods = [].concat(endpoint.methods);

          if (_.any(methods, function (method) {
            return method.toLowerCase() === request.method.toLowerCase();
          })) {
            var params = _.assign(match.params, endpoint);
            delete params.methods;
            return params;

          }
        }
      }
    }
    return null;
  }
};

module.exports = mapper;
