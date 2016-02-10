'use strict';
import errors from '@hoist/errors';
import logger from '@hoist/logger';
import Boom from 'boom';
import Moment from 'moment';
import {
  routeFromPath
}
from './url_helpers';
import {
  Publisher
}
from '@hoist/broker';
import {
  Organisation, Application, EventMetric, Event
}
from '@hoist/model';
import {
  clone, isObject, extend
}
from 'lodash';
import uuid from 'uuid';

/**
 * class to handle incoming requests
 */

export class EndpointHandler {
  /**
   * create new handler
   */
  constructor() {
    this._logger = logger.child({
      cls: this.constructor.name
    });
    this._publisher = new Publisher();
  }

  /**
   * handle incoming requests and turn them into events
   * @returns {Promise}
   */
  onRequest(req, reply) {
    this._logger.info('got a webhook request');
    return Organisation.findOneAsync({
        slug: req.params.orgSlug
      }).then((organisation) => {
        if (!organisation) {
          throw new errors.model.NotFoundError();
        }
        return Application.findOneAsync({
          slug: req.params.appSlug,
          organisation: organisation._id
        });
      }).then((application) => {
        if (!application) {
          throw new errors.model.NotFoundError();
        }
        if ((!application.settings.live) || (!application.settings.live.endpoints)) {
          throw new errors.Http404Error('No Endpoint Found');
        }
        this._logger.info({
          application: application._id
        }, 'found org and app');
        req.params.endpoint = '/' + req.params.endpoint;
        return Promise.resolve(routeFromPath(application.settings.live.endpoints, req.method, req.params.endpoint))
          .then((route) => {
            this._logger.info({
              application: application._id,
              route: route,
              endpoint: 'req.params.endpoint'
            }, 'mapped route');
            if (!route) {
              throw new errors.Http404Error('No Endpoint Found');
            }
            this._logger.info('got an endpoint');
            var payload = clone(route, true);
            delete payload.event;
            delete payload.method;
            delete payload.authenticate;
            if (req.method.toLowerCase() === 'post') {
              if (isObject(req.payload)) {
                payload = extend(payload, req.payload);
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
              payload._request.query = req.url.query;
            }
            var priority = req.headers['x-priority'] || 3;
            delete payload._request.headers.host;
            delete payload._request.headers['x-priority'];
            this._logger.info('building event');
            var ev = new Event({
              eventId: uuid.v4().split('-').join(''),
              applicationId: application._id,
              eventName: route.event,
              environment: 'live',
              correlationId: require('uuid').v4(),
              payload: payload,
              priority: priority
            });
            return ev;
          });
      })
      .then((event) => {
        this._logger.info({
          event: event
        }, 'sending event to broker');

        return this._publisher.publish(event)
          .then(() => {
            var raisedDate = new Moment();
            var update = {
              $inc: {}
            };
            update.$inc.totalRaised = 1;
            update.$inc['raised.' + raisedDate.utc().minutes()] = 1;
            EventMetric.updateAsync({
              application: event.applicationId,
              environment: 'live',
              eventName: event.eventName,
              timestampHour: raisedDate.utc().startOf('hour').toDate()
            }, update, {
              upsert: true
            }).catch(function (err) {
              this._logger.alert(err);
              this._logger.error(err);
            });
            return event;
          });
      })
      .then((event) => {
        this._logger.info('sending reply');
        var response = reply(event.toObject());
        response.header('x-hoist-cid', event.correlationId);
        response.header('x-hoist-eid', event.eventId);
        response.statusCode = 200;
      }).catch((err) => {
        this._logger.error(err);
        if (!errors.isHoistError(err)) {
          console.log(err);
          this._logger.alert(err);
          err = new errors.HoistError();
        }
        this._logger.info('sending error reply');
        reply(Boom.wrap(err, parseInt(err.code)));
      });
  }
}
