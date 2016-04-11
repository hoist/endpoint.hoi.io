'use strict';
import { EndpointHandler } from './endpoint_handler';
import logger from '@hoist/logger';
import { ConnectorHandler } from './connector_handler';

/**
 * maps routes to handlers for this server
 */

export class Router {
  /**
   * create a new router
   */
  constructor() {
    this._logger = logger.child({
      cls: this.constructor.name
    });
    this._endpointHandler = new EndpointHandler();
    this._connectorHandler = new ConnectorHandler();
  }

  /**
   * map routes to endpoints on the server
   */
  mapRoutes(server) {
    server.route({
      path: '/connector/{connectorKey}/{endpoint*}',
      handler: this._connectorHandler.onRequest,
      config: {
        bind: this._connectorHandler,
        payload: {
          parse: true,
          maxBytes: '2097152',
          output: 'data'
        }
      },
      method: ['*']
    });
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
      method: ['*']
    });
    server.route({
      path: '/{orgSlug}/{appSlug}/wait/{endpoint*}',
      handler: this._endpointHandler.onRequest,
      config: {
        bind: this._endpointHandler,
        payload: {
          parse: true,
          maxBytes: '2097152',
          output: 'data'
        },
        timeout: {
          server: 179999,
          socket: 180000 //timeout of three minutes
        }
      },
      method: ['*']
    });
  }
}
