'use strict';
var http = require('http');
var server;
var config = require('config');
var UrlMapper = require('./url_mapper');
var hoistModel = require('hoist-model');
var mongoose = hoistModel._mongoose;
var ApplicationEvent = require('broker/lib/event_types/application_event');
var EventBroker = require('broker/lib/event_broker');
var hoistErrors = require('hoist-errors');
require('bluebird').promisifyAll(EventBroker);
var server = {
  processRequest: function (request, response) {
    //get application based on url
    hoistModel.Application.findAsync(UrlMapper.queryFromHost(request.headers.host))
    //create event for application
    .then(function (application) {
      if (!application) {
        throw new hoistErrors.model.application.NotFoundError();
      }
      var environment = UrlMapper.environmentFromHost(request.headers.host);
      var endpoints = application.settings[environment].endpoints;
      var endpoint = UrlMapper.routeFromPath(endpoints, request);
      if (!endpoint) {
        throw new hoistErrors.Http404Error('No Endpoint Found');
      }
      var ev = new ApplicationEvent({
        applicationId: application._id,
        eventName: endpoint.event,
        environment: environment,
        correlationId: require('uuid').v4(),
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
      return ev;
    })
    //post event
    .then(function (ev) {
      EventBroker.publishAsync(ev);
      return ev;
    }).then(function (ev) {
      response.setHeader('CID', ev.correlationId);
      response.send(200);
    }).catch(function (err) {
      if (!hoistErrors.isError(err)) {
        err = new hoistErrors.Http500Error(err.message ||
          http.STATUS_CODES[500] + ' - ' + err.name);
      }
      response.writeHead(err.status);
      response.end(err.message);
    }).done();
  },
  start: function () {
    mongoose.connect(config.mongo.db, function () {
      server._server = http.createServer(server.processRequest);
      server._server.listen(config.http.port, function (err) {
        /* istanbul ignore next */
        if (err) {
          console.error('unable to listen to port', config.http.port, err);
          mongoose.disconnect(function(){
            delete server._server;
          });
          return;
        }
        console.log('server listening at port', config.http.port);
      });
    });
  },
  /* istanbul ignore next */
  stop: function (cb) {
    /* istanbul ignore next */
    if (server._server) {
      server._server.close(function () {
        delete server._server;
        mongoose.disconnect(function () {
          cb();
        });
      });
    } else {
      cb();
    }
  }
};
module.exports = server;
