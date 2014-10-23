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
var BBPromise = require('bluebird');
var url = require('url');
var _ = require('lodash');
var anyBody = BBPromise.promisify(require('body/any'));
var server = {
  processRequest: function (request, response) {
    var path = url.parse(request.url).pathname;
    BBPromise.try(function () {

      if (request.method === 'POST') {
        anyBody(request, response)
          .then(function (body) {
            request.body = body;
          });
      } else {
        return BBPromise.resolve(null);
      }
    })
      .then(function () {
        return hoistModel.Application.findAsync(UrlMapper.queryFromPath(path));
      })
    //create event for application
    .then(function (applications) {
      if (!applications || applications.length < 1) {
        throw new hoistErrors.model.application.NotFoundError();
      }

      var application = applications[0];
      var environment = UrlMapper.environmentFromPath(path);

      var endpoints = application.settings[environment].endpoints;
      var payload = UrlMapper.routeFromPath(endpoints, request);
      if (!payload) {
        throw new hoistErrors.Http404Error('No Endpoint Found');
      }

      if (request.method === 'POST') {
        payload = _.extend(payload, request.body);
      }
      var ev = new ApplicationEvent({
        applicationId: application._id,
        eventName: payload.event,
        environment: environment,
        correlationId: require('uuid').v4(),
        body: {
          request: {
            body: request.body,
            headers: request.headers,
            url: request.url,
            method: request.method
          },
          payload: payload
        }
      });
      return ev;
    })
    //post event
    .then(function (ev) {
      console.log('publishing event', ev);
      return EventBroker.publish(ev).then(function () {
        return ev;
      });
    }).then(function (ev) {
      response.setHeader('CID', ev.correlationId);
      response.writeHead(200);
      response.end();
    }).catch(function (err) {

      if (!hoistErrors.isError(err)) {
        console.log(err);
        err = new hoistErrors.Http500Error(err.message ||
          http.STATUS_CODES[500] + ' - ' + err.name);
      }
      response.writeHead(err.status);
      response.end(err.message);
    }).done();
  },
  createServer: function () {
    return http.createServer(server.processRequest);
  },
  start: function () {
    mongoose.connect(config.get('Hoist.mongo.db'), function () {
      server._server = server.createServer();
      server._server.listen(config.get('Hoist.http.port'), function (err) {
        /* istanbul ignore next */
        if (err) {
          console.error('unable to listen to port', config.get('Hoist.http.port'), err);
          mongoose.disconnect(function () {
            delete server._server;
          });
          return;
        }
        console.log('server listening at port', config.get('Hoist.http.port'));
      });
    });
  },
  /* istanbul ignore next */
  stop: function (cb) {
    /* istanbul ignore next */
    if (server._server) {
      console.log('closing server');
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
