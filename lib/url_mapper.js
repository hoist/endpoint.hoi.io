'use strict';
var Router = require('routes');
var _ = require('lodash');
RegExp.escape = function (s) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

var mapper = {
  routeFromPath: function (endpoints, method, path) {
    var router = new Router();
    if (endpoints && path && method) {

      var routes = _.keys(endpoints);
      if (routes.length > 0) {
        routes.forEach(function (r) {
          router.addRoute(r, function () {
            return endpoints[r];
          });
        });
        var match = router.match(path);
        if (match) {
          var endpoint = match.fn();
          var methods = [].concat(endpoint.methods);

          if (_.any(methods, function (m) {
              return m.toLowerCase() === method.toLowerCase();
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
