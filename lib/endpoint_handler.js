'use strict';
var Model = require('hoist-model');
var errors = require('hoist-errors');
var logger = require('hoist-logger');
var Boom = require('boom');
var UrlMapper = require('./url_mapper');
var EventBroker = require('broker');
var _ = require('lodash');
var ApplicationEvent = EventBroker.events.ApplicationEvent;
var BBPromise = require('bluebird');

function EndpointHandler() {

}

EndpointHandler.prototype.onRequest = function (req, reply) {
  logger.info('got a webhook request');
  return Model.Organisation.findOneAsync({
      slug: req.params.orgSlug
    }).then(function (organisation) {
      if (!organisation) {
        throw new errors.model.NotFoundError();
      }
      return Model.Application.findOneAsync({
        slug: req.params.appSlug,
        organisation: organisation._id
      });
    }).then(function (application) {
      if (!application) {
        throw new errors.model.NotFoundError();
      }
      if ((!application.settings.live) || (!application.settings.live.endpoints)) {
        throw new errors.Http404Error('No Endpoint Found');
      }
      logger.info('found org and app');
      req.params.endpoint = '/' + req.params.endpoint;
      return BBPromise.resolve(UrlMapper.routeFromPath(application.settings.live.endpoints, req.method, req.params.endpoint)).then(function (route) {
        if (!route) {
          throw new errors.Http404Error('No Endpoint Found');
        }
        logger.info('got an endpoint');
        var payload = _.clone(route, true);
        delete payload.event;
        delete payload.method;
        delete payload.authenticate;
        if (req.method.toLowerCase() === 'post') {

          if (_.isObject(req.payload)) {
            payload = _.extend(payload, req.payload);
          }
        }

        payload._request = {
          body: req.payload,
          headers: req.headers,
          url: req.params.endpoint,
          method: req.method
        };

        var queryString = req.url.search;

        if (queryString) {
          payload._request.queryString = queryString;
        }

        delete payload._request.headers.host;
        logger.info('building event');
        var ev = new ApplicationEvent({
          applicationId: application._id,
          eventName: route.event,
          environment: 'live',
          correlationId: require('uuid').v4(),
          payload: payload
        });
        return ev;
      });
    })
    .then(function (event) {
      logger.info({
        event: event
      }, 'sending event to broker');
      var eventBroker = new EventBroker();
      return eventBroker.send(event)
        .then(function () {
          return event;
        });
    })
    .then(function (event) {
      logger.info('sending reply');
      var response = reply(event);
      response.header('x-hoist-cid', event.correlationId);
      response.header('x-hoist-eid', event.eventId);
      response.statusCode = 201;
    }).catch(function (err) {
      logger.error(err);
      if (!errors.isHoistError(err)) {
        console.log(err);
        logger.alert(err);
        err = new errors.hoistError();
      }
      logger.info('sending error reply');
      reply(Boom.wrap(err, parseInt(err.code)));
    });
};

module.exports = new EndpointHandler();
