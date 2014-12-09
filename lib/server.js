'use strict';
var http = require('http');
var server;
var config = require('config');
var UrlMapper = require('./url_mapper');
var hoistModel = require('hoist-model');
var mongoose = hoistModel._mongoose;
var EventBroker = require('broker');
EventBroker.ModelResolver.set(hoistModel);
var ApplicationEvent = EventBroker.events.ApplicationEvent;
var hoistErrors = require('hoist-errors');
var BBPromise = require('bluebird');
var url = require('url');
var _ = require('lodash');
var logger = require('hoist-logger');
var anyBody = BBPromise.promisify(require('body/any'));
var server = {
  processRequest: function (request, response) {
    var path = url.parse(request.url).pathname;
    var applicationId = '';
    BBPromise.try(function parseBody() {

        if (request.method === 'POST') {
          return anyBody(request, response)
            .then(function (body) {
              request.body = body;
            });
        } else {
          return BBPromise.resolve(null);
        }
      })
      .then(function findApplication() {
        return hoistModel.Application.findAsync(UrlMapper.mongoQueryFromPath(path));
      })
      //create event for application
      .then(function generateEvent(applications) {
        if (!applications || applications.length < 1) {
          throw new hoistErrors.model.application.NotFoundError();
        }

        var application = applications[0];
        applicationId = application._id;
        var environment = UrlMapper.environmentFromPath(path);

        var endpoints = application.settings[environment].endpoints;
        var route = UrlMapper.routeFromPath(endpoints, request);
        if (!route) {
          throw new hoistErrors.Http404Error('No Endpoint Found');
        }
        var payload = _.clone(route, true);
        delete payload.event;
        delete payload.method;
        delete payload.authenticate;
        if (request.method === 'POST') {
          // payload = _.extend(_.clone(route, true), request.body);
          payload = _.extend(payload, request.body);
        }

        var sanitizedUrl = UrlMapper.sanitisePath(path).path;

        payload._request = {
          body: request.body,
          headers: request.headers,
          url: sanitizedUrl,
          method: request.method
        };
        var parsedUrl = url.parse(request.url, true);
        var queryString = parsedUrl.search;

        if (queryString) {
          payload._request.queryString = queryString;
        }
        /*istanbul ignore else */
        if (parsedUrl.query) {
          payload._request.query = parsedUrl.query;
        }
        delete payload._request.headers.host;

        var ev = new ApplicationEvent({
          applicationId: application._id,
          eventName: route.event,
          environment: environment,
          correlationId: require('uuid').v4(),
          payload: payload
        });
        return ev;
      })
      //post event
      .then(function publishEvent(ev) {
        logger.info({
          eventId: ev.messageId,
          application: ev.applicationId,
          environment: ev.environment
        }, 'publishing event');
        logger.debug({
          event: ev
        }, 'event');
        var eventBroker = new EventBroker();
        return eventBroker.send(ev).then(function () {
          return ev;
        });
      }).then(function generateResponse(ev) {
        logger.info({
          eventId: ev.messageId,
          application: ev.applicationId,
          environment: ev.environment
        }, 'sending event response');
        logger.debug({
          event: ev
        }, 'event');
        response.setHeader('X-Hoist-CID', ev.correlationId);
        response.setHeader('X-Hoist-EID', ev.messageId);
        response.writeHead(200);
        response.end();
      }).catch(function processError(err) {
        if (!hoistErrors.isError(err)) {
          logger.error(err);
          logger.alert(err, applicationId);
          err = new hoistErrors.Http500Error(err.message ||
            http.STATUS_CODES[500] + ' - ' + err.name);
        } else {
          logger.warn(err);
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
