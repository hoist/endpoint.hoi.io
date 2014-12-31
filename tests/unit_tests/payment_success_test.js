'use strict';
require('../bootstrap.js');
var sinon = require('sinon');
var server = require('../../lib/server');
var expect = require('chai').expect;
var hoistModel = require('hoist-model');
var Application = hoistModel.Application;
var Organisation = hoistModel.Organisation;
var BBPromise = require('bluebird');
var EventBroker = require('broker');
var jsonPaymentSuccess = require('./paymentSuccessPayloadJson');
var _ = require('lodash');


describe('When receiving payment success', function () {
  var app = server.createHapiServer();
  var _response;
  before(function (done) {
    sinon.stub(EventBroker.prototype, 'send', function () {
      return BBPromise.resolve(null);
    });
    sinon.stub(Organisation, 'findOneAsync').returns(BBPromise.resolve(
      new Organisation()
    ));
    sinon.stub(Application, 'findOneAsync', function () {
      return BBPromise.resolve(new Application({
        _id: 'applicationId',
        subdomain: 'test',
        settings: {
          live: {
            endpoints: {
              '/payment/success': {
                methods: ['POST'],
                event: 'chargify.payment.success',
                authenticate: true
              }
            }
          }
        }
      }));
    });
    app.inject({
      method: 'POST',
      payload: jsonPaymentSuccess,
      url: '/org/app/payment/success'
    }, function (res) {
      _response = res;
      done();
    });
  });
  after(function () {
    Application.findOneAsync.restore();
    Organisation.findOneAsync.restore();
    EventBroker.prototype.send.restore();
  });

  it('the server responds with status 201', function () {
    expect(_response.statusCode).to.eql(201);
  });

  it('the server responds with a cid', function () {
    expect(_response.headers).to.include.keys('x-hoist-cid');
  });

  it('Event broker#publish is called with original event', function () {
    /* jshint -W030 */
    expect(EventBroker.prototype.send).to.have.been.calledWith(sinon.match(function (actualEvent) {
      expect(actualEvent.correlationId).to.exist;
      expect(actualEvent.eventName).to.exist;
      expect(actualEvent.payload).to.exist;
      expect(actualEvent.applicationId).to.exist;
      _.forIn(jsonPaymentSuccess, function (i, key) {
        expect(actualEvent.payload[key]).to.eql(jsonPaymentSuccess[key]);
      });
      return true;
    }));
  });
});
