'use strict';
import config from 'config';
import {
  Server
}
from '../../lib/server';
import Bluebird from 'bluebird';
import sinon from 'sinon';
import {
  expect
}
from 'chai';
import {
  _mongoose, Organisation, Application
}
from '@hoist/model';
Bluebird.promisifyAll(_mongoose);

/** @test {EndpointHandler#onRequest} */
describe('EndpointHandler', function () {
  let server;
  before(() => {
    server = new Server();
    server._createHapiServer();
  });
  describe('#onRequest', function () {
    describe('with no matching organisation', function () {
      var _response;
      before(() => {
        return _mongoose.connectAsync(config.get('Hoist.mongo.core.connectionString'))
          .then(() => {
            return new Promise((resolve) => {
                server._hapi.inject({
                  method: 'GET',
                  url: '/org/app/endpoint'
                }, (res) => {
                  resolve(res);
                });
              })
              .then(function (res) {
                _response = res;
              });
          });
      });
      after(() => {
        return _mongoose.disconnectAsync();
      });
      it('returns a 404 response', function () {
        expect(_response.statusCode).to.eql(404);
      });
    });
    describe('with no matching application', function () {
      var _response;
      before(() => {
        sinon.stub(Organisation, 'findOneAsync').returns(Promise.resolve(
          new Organisation({
            _id: 'orgid'
          })
        ));
        return _mongoose.connectAsync(config.get('Hoist.mongo.core.connectionString'))
          .then(() => {
            return new Promise((resolve) => {
              server._hapi.inject({
                method: 'GET',
                url: '/org/app/endpoint'
              }, function (res) {
                resolve(res);
              });
            });
          }).then((res) => {
            _response = res;
          });
      });
      after(() => {
        Organisation.findOneAsync.restore();
        return _mongoose.disconnectAsync();
      });
      it('returns a 404 response', function () {
        expect(_response.statusCode).to.eql(404);
      });
    });
    describe('with no endpoints', function () {
      var _response;
      before(() => {
        sinon.stub(Organisation, 'findOneAsync').returns(Promise.resolve(
          new Organisation({
            _id: 'orgid'
          })
        ));
        sinon.stub(Application, 'findOneAsync').returns(Promise.resolve(
          new Application({

          })
        ));
        return _mongoose.connectAsync(config.get('Hoist.mongo.core.connectionString'))
          .then(() => {
            return new Promise((resolve) => {
              server._hapi.inject({
                method: 'GET',
                url: '/org/app/endpoint'
              }, function (res) {
                _response = res;
                resolve();
              });
            });
          });
      });
      after(() => {
        Application.findOneAsync.restore();
        Organisation.findOneAsync.restore();
        return _mongoose.disconnectAsync();
      });
      it('returns a 404 response', function () {
        expect(_response.statusCode).to.eql(404);
      });
    });
    describe('with no matching endpoints', function () {
      var _response;
      before(() => {
        sinon.stub(Organisation, 'findOneAsync').returns(Promise.resolve(
          new Organisation({
            _id: 'orgid'
          })
        ));
        sinon.stub(Application, 'findOneAsync').returns(Promise.resolve(
          new Application({
            settings: {
              live: {
                endpoints: {
                  '/something/else': {
                    methods: ['GET']
                  }
                }
              }
            }
          })
        ));
        return _mongoose.connectAsync(config.get('Hoist.mongo.core.connectionString'))
          .then(() => {
            return new Promise((resolve) => {
              server._hapi.inject({
                method: 'GET',
                url: '/org/app/endpoint',
                headers: {
                  'x-priority': 15
                }
              }, function (res) {
                _response = res;
                resolve();
              });
            });
          });
      });
      after(() => {
        Application.findOneAsync.restore();
        Organisation.findOneAsync.restore();
        return _mongoose.disconnectAsync();
      });
      it('returns a 404 response', function () {
        expect(_response.statusCode).to.eql(404);
      });
    });
  });
});
