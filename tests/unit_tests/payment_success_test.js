'use strict';
import sinon from 'sinon';
import Server from '../../lib/server';
import {
  expect
}
from 'chai';
import {
  Organisation, Application
}
from '@hoist/model';
import {
  Publisher
}
from '@hoist/broker';
import jsonPaymentSuccess from './paymentSuccessPayloadJson';
import {
  forIn
}
from 'lodash';


describe('When receiving payment success', function () {
  let _response;
  before(function (done) {
    let server = new Server();
    server._createHapiServer();
    sinon.stub(Publisher.prototype, 'publish', function () {
      return Promise.resolve(null);
    });
    sinon.stub(Organisation, 'findOneAsync').returns(Promise.resolve(
      new Organisation()
    ));
    sinon.stub(Application, 'findOneAsync', function () {
      return Promise.resolve(new Application({
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
    server._hapi.inject({
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
    Publisher.prototype.publish.restore();
  });

  it('the server responds with status 200', function () {
    expect(_response.statusCode).to.eql(200);
  });

  it('the server responds with a cid', function () {
    expect(_response.headers).to.include.keys('x-hoist-cid');
  });

  it('Event broker#publish is called with original event', function () {
    expect(Publisher.prototype.publish).to.have.been.calledWith(sinon.match(function (actualEvent) {
      forIn(jsonPaymentSuccess, function (i, key) {
        return expect(actualEvent.payload[key]).to.eql(jsonPaymentSuccess[key]);
      });
      return expect(actualEvent.correlationId).to.exist &&
        expect(actualEvent.eventName).to.exist &&
        expect(actualEvent.payload).to.exist &&
        expect(actualEvent.applicationId).to.exist;
    }));
  });
});
