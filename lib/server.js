'use strict';
import Hapi from 'hapi';
import config from 'config';
import {
  _mongoose
}
from '@hoist/model';
import Router from './router';
import logger from '@hoist/logger';
import Bluebird from 'bluebird';
Bluebird.promisifyAll(_mongoose);


/**
 * the Hoist endpoint server
 */
class Server {
  /**
   * create a new instance of the server
   */
  constructor() {
    this._logger = logger.child({
      cls: this.constructor.name
    });
    this._router = new Router();
  }
  _createHapiServer() {
    this._logger.info('creating hapi server');
    this._hapi = new Hapi.Server();
    Bluebird.promisifyAll(this._hapi);
    this._hapi.connection({
      port: config.get('Hoist.http.port')
    });
    this._router.mapRoutes(this._hapi);
  }

  /**
   * start the server
   * @returns {Promise}
   */
  start() {
    return _mongoose.connectAsync(config.get('Hoist.mongo.db'))
      .then(() => {
        this._createHapiServer();
        return this._hapi.startAsync()
          .then(() => {
            logger.info('server started');
          });
      });
  }

  /**
   * stop the server
   * @returns {Promise}
   */
  stop() {
    this._logger.info('stoping server');
    return Promise.resolve()
      .then(() => {
        if (this._hapi) {
          this._logger.info('server shutting down');
          return this._hapi.stopAsync().then(() => {
            delete this._hapi;
            return _mongoose.disconnectAsync().then(() => {
              logger.info('server shutdown');
            });
          });
        }
      });
  }
}

export default Server;
