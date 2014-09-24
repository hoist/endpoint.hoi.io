'use strict';
var http = require('http');
var server;
var config = require('config');
var UrlMapper = require('./url_mapper');
var hoistModel = require('hoist-model');
var mongoose = hoistModel._mongoose;
var ApplicationEvent = require('broker/lib/event_types/application_event');
var EventBroker = require('broker/lib/event_broker');
require('bluebird').promisifyAll(EventBroker);
var server = {
  processRequest: function (request, response) {
    //get application based on url
    hoistModel.Application.findAsync(UrlMapper.queryFromHost(request.headers.host))
    //create event for application
    .then(function (application) {
      var environment = UrlMapper.environmentFromHost(request.headers.host);
      var endpoints = application.settings[environment].endpoints;
      var endpoint = UrlMapper.routeFromPath(endpoints, request);
      var event = new ApplicationEvent({
        applicationId: application._id,
        eventName: endpoint.event,
        environment: environment,
        correlationId:require('uuid').v4(),
        body: {
          request: {
            body: request.body,
            headers: request.headers,
            url: request.url,
            method: request.method
          },
          params: endpoint
        }
      });
      return event;
    })
    //post event
    .then(function (ev) {
      EventBroker.publishAsync(ev);
      return ev;
    }).then(function (ev) {
      response.setHeader('CID', ev.correlationId);
      response.send(200);
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
