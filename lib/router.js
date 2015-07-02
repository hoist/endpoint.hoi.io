'use strict';
import EndpointHandler from './endpoint_handler';
import logger from '@hoist/logger';

/**
 * maps routes to handlers for this server
 */

class Router {
  /**
   * create a new router
   */
  constructor() {
    this._logger = logger.child({
      cls: this.constructor.name
    });
    this._endpointHandler = new EndpointHandler();
  }

  /**
   * map routes to endpoints on the server
   */
  mapRoutes(server) {
    server.route({
      path: '/{orgSlug}/{appSlug}/{endpoint*}',
      handler: this._endpointHandler.onRequest,
      config: {
        bind: this._endpointHandler,
        payload: {
          parse: true,
          maxBytes: '2097152',
          output: 'data'
        }
      },
      method: ['POST']
    });
    server.route({
      path: '/{orgSlug}/{appSlug}/{endpoint*}',
      handler: this._endpointHandler.onRequest,
      config: {
        bind: this._endpointHandler
      },
      method: ['GET']
    });
  }
}


export default Router;
