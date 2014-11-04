'use strict';
require('../bootstrap.js');
var sinon = require('sinon');
var server = require('../../lib/server');
var expect = require('chai').expect;
var hoistModel = require('hoist-model');
var Application = hoistModel.Application;
var mongoose = hoistModel._mongoose;
var BBPromise = require('bluebird');
var EventBroker = require('broker/lib/event_broker');
var ApplicationEvent = require('broker/lib/event_types/application_event');
var request = require('supertest');
var jsonPaymentSuccess = require('./paymentSuccessPayloadJson');


describe.only('When receiving payment success', function () {
  var app = server.createServer();
  var _response;
  before(function (done) {
    sinon.stub(EventBroker, 'publish', function () {
      return BBPromise.resolve(null);
    });
    sinon.stub(Application, 'findAsync', function () {
      return BBPromise.resolve([new Application({
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
      })]);
    });
     request(app)
      .post('/test/payment/success')
      .send(jsonPaymentSuccess)
      .end(function(err,response){

        _response = response;
        done();
      });
  });
  after(function () {
    Application.findAsync.restore();
    EventBroker.publish.restore();
  });

  it('the server responds with status 200', function(){
    expect(_response.statusCode).to.eql(200);
  });

  it('Event broker#publish is called with ', function(){
    expect(EventBroker.publish).to.have.been.calledWith({payload:jsonPaymentSuccess});
  });
});