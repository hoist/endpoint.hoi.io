'use strict';
import { Server } from '../../lib/server';
import config from 'config';
import { expect } from 'chai';
import sinon from 'sinon';
import Bluebird from 'bluebird';
import fs from 'fs';
import path from 'path';
import { _mongoose, Organisation, Application } from '@hoist/model';
import FormData from 'form-data';
import streamToPromise from 'stream-to-promise';
import { Publisher } from '@hoist/broker';

Bluebird.promisifyAll(_mongoose);
describe('Posting Data', function() {
  before(function(done) {
    _mongoose.connectAsync(config.get('Hoist.mongo.core.connectionString'))
      .then(function() {
        return Promise.all([
          new Organisation({
            _id: 'orgid',
            name: 'test organisation',
            slug: 'organisation'
          }).saveAsync(),
          new Application({
            _id: 'appid',
            name: 'test application',
            slug: 'application',
            organisation: 'orgid',
            settings: {
              live: {
                endpoints: {
                  '/endpoint/for/data': {
                    methods: ['POST'],
                    event: 'post:data',
                    authenticate: true
                  }
                }
              }
            }
          }).saveAsync()
        ]);
      }).nodeify(done);
  });
  after(function() {
    return Promise.all([
      Organisation.removeAsync({}),
      Application.removeAsync({})
    ])
      .then(function() {
        return _mongoose.disconnectAsync();
      });
  });
  describe('text/xml', function() {
    var _response;
    var _brokerEvent;
    before(function(done) {
      sinon.stub(Publisher.prototype, 'publish', function(event) {
        _brokerEvent = event;

        return Promise.resolve(event);
      });
      var server = new Server();
      server._createHapiServer();
      server._hapi.inject({
        method: 'POST',
        url: '/organisation/application/endpoint/for/data',
        payload: fs.readFileSync(path.resolve(__dirname, '../fixtures/large_xml.xml')),
        headers: {
          'Content-Type': 'text/xml',
          'user-agent': "hoist-unit-test"
        }
      }, function(res) {
        //console.log(res);
        _response = res;
        done();
      });
    });
    after(function() {
      Publisher.prototype.publish.restore();
    });
    it('responds with 200', function() {
      expect(_response.statusCode).to.eql(200);
    });
    it('saves payload on event', function() {
      expect(_brokerEvent.payload).to.eql({
        _request: {
          body: fs.readFileSync(path.resolve(__dirname, '../fixtures/large_xml.xml')).toString(),
          headers: {
            'content-type': "text/xml",
            'content-length': "1065876",
            'user-agent': "hoist-unit-test"
          },
          url: '/endpoint/for/data',
          method: 'post'
        }
      });
    });
    it('sets brokeredevent details', function() {
      expect(_brokerEvent.applicationId).to.eql('appid');
      expect(_brokerEvent.environment).to.eql('live');
      expect(_brokerEvent.eventName).to.eql('post:data');
    });
    it('sets headers on response', function() {
      expect(_response.headers['x-hoist-cid']).to.eql(_brokerEvent.correlationId);
      expect(_response.headers['x-hoist-eid']).to.eql(_brokerEvent.eventId);
    });
    it('sends back event', function() {
      expect(_response.payload).to.eql(JSON.stringify(_brokerEvent));
    });
  });
  describe('application/json', function() {
    var _response;
    var _brokerEvent;
    before(function(done) {
      sinon.stub(Publisher.prototype, 'publish', function(brokerEvent) {
        _brokerEvent = brokerEvent;
        return Promise.resolve(brokerEvent);
      });
      var server = new Server();
      server._createHapiServer();
      server._hapi.inject({
        method: 'POST',
        url: '/organisation/application/endpoint/for/data',
        payload: {
          somekey: 'value'
        },
        headers: {
          'Content-Type': 'application/json',
          'user-agent': "hoist-unit-test"
        }
      }, function(res) {
        //console.log(res);
        _response = res;
        done();
      });
    });
    after(function() {
      Publisher.prototype.publish.restore();
    });
    it('responds with 200', function() {
      expect(_response.statusCode).to.eql(200);
    });
    it('saves payload on event', function() {
      expect(_brokerEvent.payload).to.eql({
        somekey: 'value',
        _request: {
          body: {
            somekey: 'value'
          },
          headers: {
            'content-type': "application/json",
            'content-length': "19",
            'user-agent': "hoist-unit-test"
          },
          url: '/endpoint/for/data',
          method: 'post'
        }
      });
    });
    it('sets brokeredevent details', function() {
      expect(_brokerEvent.applicationId).to.eql('appid');
      expect(_brokerEvent.environment).to.eql('live');
      expect(_brokerEvent.eventName).to.eql('post:data');
    });
    it('sets headers on response', function() {
      expect(_response.headers['x-hoist-cid']).to.eql(_brokerEvent.correlationId);
      expect(_response.headers['x-hoist-eid']).to.eql(_brokerEvent.eventId);
    });
    it('sends back event', function() {
      expect(_response.payload).to.eql(JSON.stringify(_brokerEvent));
    });
  });
  describe('form', function() {
    var _response;
    var _brokerEvent;
    var headers;
    before(function(done) {
      var form = new FormData();
      form.append('my_field', 'my_value');
      sinon.stub(Publisher.prototype, 'publish', function(brokerEvent) {
        _brokerEvent = brokerEvent;
        return Promise.resolve(brokerEvent);
      });
      var server = new Server();
      server._createHapiServer();
      headers = form.getHeaders();
      headers['user-agent'] = "hoist-unit-test";
      headers['content-length'] = "169";
      streamToPromise(form).then(function(payload) {
        server._hapi.inject({
          method: 'POST',
          url: '/organisation/application/endpoint/for/data',
          payload: payload,
          headers: headers
        }, function(res) {
          _response = res;
          done();
        });
      });
    });
    after(function() {
      Publisher.prototype.publish.restore();

    });
    it('responds with 200', function() {
      expect(_response.statusCode).to.eql(200);
    });
    it('saves payload on event', function() {
      expect(_brokerEvent.payload).to.eql({
        "my_field": "my_value",
        _request: {
          body: {
            "my_field": "my_value"
          },
          headers: headers,
          url: '/endpoint/for/data',
          method: 'post'
        }
      });
    });
    it('sets brokeredevent details', function() {
      expect(_brokerEvent.applicationId).to.eql('appid');
      expect(_brokerEvent.environment).to.eql('live');
      expect(_brokerEvent.eventName).to.eql('post:data');
    });
    it('sets headers on response', function() {
      expect(_response.headers['x-hoist-cid']).to.eql(_brokerEvent.correlationId);
      expect(_response.headers['x-hoist-eid']).to.eql(_brokerEvent.eventId);
    });
    it('sends back event', function() {
      expect(_response.payload).to.eql(JSON.stringify(_brokerEvent));
    });
  });
});
