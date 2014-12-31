'use strict';
var endpointHandler = require('./endpoint_handler');

function Router() {

}

Router.prototype.mapRoutes = function (server) {
  server.route({
    path: '/{orgSlug}/{appSlug}/{endpoint*}',
    handler: endpointHandler.onRequest,
    config: {
      bind: endpointHandler,
      payload: {
        parse: true,
        maxBytes: '2097152',
        output:'data'
      }
    },
    method: ['GET', 'POST']
  });
};

module.exports = new Router();
