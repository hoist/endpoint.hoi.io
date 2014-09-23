'use strict';
var http = require('http');
var server;
var config = require('config');
var UrlMapper = require('./url_mapper');
var hoistModel = require('hoist-model');
var mongoose = hoistModel._mongoose;

var server = {
  processRequest: function (request, response) {
    //get application based on url
    hoistModel.Application.findQ(UrlMapper.queryFromHost(request.headers.host))
    //create event for application
    .then(function (application) {

    })
    //post event
    .then(function (applicationEvent) {

    }).done();
  },
  start: function () {
    mongoose.connect(config.mongo.db, function () {
      server._server = http.createServer(server.processRequest);
      server._server.listen(config.http.port);
    });
  }
};
module.exports = server;
