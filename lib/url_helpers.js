'use strict';
import Router from 'routes';
import {
  keys, assign, any
}
from 'lodash';
RegExp.escape = function (s) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

/**
 * maps a specific path to the correct route within an apps settings
 */
export function routeFromPath(endpoints, method, path) {
  var router = new Router();
  if (endpoints && path && method) {

    var routes = keys(endpoints);
    if (routes.length > 0) {
      routes.forEach((r) => {
        router.addRoute(r, () => {
          return endpoints[r];
        });
      });
      var match = router.match(path);
      if (match) {
        var endpoint = match.fn();
        var methods = [].concat(endpoint.methods);

        if (any(methods, function (m) {
            return m.toLowerCase() === method.toLowerCase();
          })) {
          var params = assign(match.params, endpoint);
          delete params.methods;
          return params;

        }
      }
    }
  }
  return null;
}
