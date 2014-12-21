'use strict';
var Hapi = require('hapi');
var config = require('config');
var mongoose = require('hoist-model')._mongoose;
var router = require('./router');
var _ = require('lodash');
var logger = require('hoist-logger');

function Server() {

}


Server.prototype.createHapiServer = function () {
  var server = new Hapi.Server();
  server.connection({
    port: config.get('Hoist.http.port')
  });
  router.mapRoutes(server);
  return server;
};
Server.prototype.start = function () {
  mongoose.connect(config.get('Hoist.mongo.db'), _.bind(function () {
    this.hapi = this.createHapiServer();
    this.hapi.start(function () {
      logger.info('server started');
    });
  }, this));
};
Server.prototype.stop = function (cb) {
  /* istanbul ignore next */
  if (this.hapi) {
    logger.info('server shutting down');
    this.hapi.stop(function () {
      delete this.hapi;
      mongoose.disconnect(function () {
        logger.info('server shutdown');
        cb();
      });
    });
  } else {
    cb();
  }
};
module.exports = new Server();
