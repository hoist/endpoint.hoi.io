'use strict';
var http = require('http');
var server;
var config = require('config');
var mongoose = require('hoist-model')._mongoose;

var server = {
  processRequest: function () {

  },
  start: function () {
    mongoose.connect(config.mongo.db, function () {
      server._server = http.createServer(server.processRequest);
      server._server.listen(config.http.port);
    });
  }
};
module.exports = server;
