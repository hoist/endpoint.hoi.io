'use strict';
var server = require('../../lib/server');

var config = require('config');
var expect = require('chai').expect;
var sinon = require('sinon');
var BBPromise = require('bluebird');
var mongoose = BBPromise.promisifyAll(require('hoist-model')._mongoose);
var EventBroker = require('broker');
var fs = require('fs');
var path = require('path');
var Model = require('hoist-model');
var FormData = require('form-data');
var streamToPromise = require('stream-to-promise');
describe('Posting Data', function () {
  before(function (done) {
    mongoose.connectAsync(config.get('Hoist.mongo.db'))
      .then(function () {
        return BBPromise.all([
          new Model.Organisation({
            _id: 'orgid',
            name: 'test organisation',
            slug: 'organisation'
          }).saveAsync(),
          new Model.Application({
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
  after(function (done) {
    BBPromise.all([
        Model.Organisation.removeAsync({}),
        Model.Application.removeAsync({})
      ])
      .then(function () {
        return mongoose.disconnectAsync();
      }).nodeify(done);
  });
  describe('text/xml', function () {
    var _response;
    var _brokerEvent;
    before(function (done) {
      sinon.stub(EventBroker.prototype, 'send', function (brokerEvent) {
        _brokerEvent = brokerEvent;
        return BBPromise.resolve(brokerEvent);
      });
      var s = server.createHapiServer();
      s.inject({
        method: 'POST',
        url: '/organisation/application/endpoint/for/data',
        payload: fs.readFileSync(path.resolve(__dirname, '../fixtures/large_xml.xml')),
        headers: {
          'Content-Type': 'text/xml',
          'user-agent': "hoist-unit-test"
        },
      }, function (res) {
        //console.log(res);
        _response = res;
        done();
      });
    });
    after(function () {
      EventBroker.prototype.send.restore();
    });
    it('responds with 201', function () {
      expect(_response.statusCode).to.eql(201);
    });
    it('saves payload on event', function () {
      expect(_brokerEvent.payload).to.eql({
        _request: {
          body: fs.readFileSync(path.resolve(__dirname, '../fixtures/large_xml.xml')).toString(),
          headers: {
            'content-type': "text/xml",
            'user-agent': "hoist-unit-test"
          },
          url: '/endpoint/for/data',
          method: 'post'
        }
      });
    });
    it('sets brokeredevent details', function () {
      expect(_brokerEvent.applicationId).to.eql('appid');
      expect(_brokerEvent.environment).to.eql('live');
      expect(_brokerEvent.eventName).to.eql('post:data');
    });
    it('sets headers on response', function () {
      expect(_response.headers['x-hoist-cid']).to.eql(_brokerEvent.correlationId);
      expect(_response.headers['x-hoist-eid']).to.eql(_brokerEvent.eventId);
    });
    it('sends back event', function () {
      expect(_response.payload).to.eql(JSON.stringify(_brokerEvent));
    });
  });
  describe('application/json', function () {
    var _response;
    var _brokerEvent;
    before(function (done) {
      sinon.stub(EventBroker.prototype, 'send', function (brokerEvent) {
        _brokerEvent = brokerEvent;
        return BBPromise.resolve(brokerEvent);
      });
      var s = server.createHapiServer();
      s.inject({
        method: 'POST',
        url: '/organisation/application/endpoint/for/data',
        payload: {
          somekey: 'value'
        },
        headers: {
          'Content-Type': 'application/json',
          'user-agent': "hoist-unit-test"
        },
      }, function (res) {
        //console.log(res);
        _response = res;
        done();
      });
    });
    after(function () {
      EventBroker.prototype.send.restore();
    });
    it('responds with 201', function () {
      expect(_response.statusCode).to.eql(201);
    });
    it('saves payload on event', function () {
      expect(_brokerEvent.payload).to.eql({
        somekey: 'value',
        _request: {
          body: {
            somekey: 'value'
          },
          headers: {
            'content-type': "application/json",
            'user-agent': "hoist-unit-test"
          },
          url: '/endpoint/for/data',
          method: 'post'
        }
      });
    });
    it('sets brokeredevent details', function () {
      expect(_brokerEvent.applicationId).to.eql('appid');
      expect(_brokerEvent.environment).to.eql('live');
      expect(_brokerEvent.eventName).to.eql('post:data');
    });
    it('sets headers on response', function () {
      expect(_response.headers['x-hoist-cid']).to.eql(_brokerEvent.correlationId);
      expect(_response.headers['x-hoist-eid']).to.eql(_brokerEvent.eventId);
    });
    it('sends back event', function () {
      expect(_response.payload).to.eql(JSON.stringify(_brokerEvent));
    });
  });
  describe('form', function () {
    var _response;
    var _brokerEvent;
    var headers;
    before(function (done) {
      var form = new FormData();
      form.append('my_field', 'my_value');
      sinon.stub(EventBroker.prototype, 'send', function (brokerEvent) {
        _brokerEvent = brokerEvent;
        return BBPromise.resolve(brokerEvent);
      });
      var s = server.createHapiServer();
      headers = form.getHeaders();
      headers['user-agent'] = "hoist-unit-test";
      streamToPromise(form).then(function (payload) {
        s.inject({
          method: 'POST',
          url: '/organisation/application/endpoint/for/data',
          payload: payload,
          headers: headers
        }, function (res) {
          _response = res;
          done();
        });
      });
    });
    after(function () {
      EventBroker.prototype.send.restore();

    });
    it('responds with 201', function () {
      expect(_response.statusCode).to.eql(201);
    });
    it('saves payload on event', function () {
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
    it('sets brokeredevent details', function () {
      expect(_brokerEvent.applicationId).to.eql('appid');
      expect(_brokerEvent.environment).to.eql('live');
      expect(_brokerEvent.eventName).to.eql('post:data');
    });
    it('sets headers on response', function () {
      expect(_response.headers['x-hoist-cid']).to.eql(_brokerEvent.correlationId);
      expect(_response.headers['x-hoist-eid']).to.eql(_brokerEvent.eventId);
    });
    it('sends back event', function () {
      expect(_response.payload).to.eql(JSON.stringify(_brokerEvent));
    });
  });
});
