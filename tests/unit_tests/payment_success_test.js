'use strict';
require('../bootstrap.js');
var sinon = require('sinon');
var server = require('../../lib/server');
var expect = require('chai').expect;
var hoistModel = require('hoist-model');
var Application = hoistModel.Application;
var BBPromise = require('bluebird');
var EventBroker = require('broker/lib/event_broker');
var request = require('supertest');
var jsonPaymentSuccess = require('./paymentSuccessPayloadJson');
var _ = require('lodash');


describe('When receiving payment success', function () {
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

  it('the server responds with a cid', function(){
    expect(_response.header).to.include.keys('cid');
  });

  it('Event broker#publish is called with original event', function(){
     /* jshint -W030 */
    expect(EventBroker.publish).to.have.been.calledWith(sinon.match(function(actualEvent){
      expect(actualEvent.correlationId).to.exist;
      expect(actualEvent.eventName).to.exist;
      expect(actualEvent.payload).to.exist;
      expect(actualEvent.applicationId).to.exist;
      _.forIn(jsonPaymentSuccess,function(i,key){
        expect(actualEvent.payload[key]).to.eql(jsonPaymentSuccess[key]);
      });
      return true;
    }));
  });
});