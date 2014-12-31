'use strict';
var config = require('config');
var server = require('../../lib/server');
var BBPromise = require('bluebird');
var Model = require('hoist-model');
var sinon = require('sinon');
var expect = require('chai').expect;
var mongoose = BBPromise.promisifyAll(Model._mongoose);
describe('EndpointHandler', function () {
  describe('#onRequest', function () {

    describe('with no matching organisation', function () {
      var _response;
      before(function (done) {
        mongoose.connectAsync(config.get('Hoist.mongo.db'))
          .then(function () {
            var hapi = server.createHapiServer();
            hapi.inject({
              method: 'GET',
              url: '/org/app/endpoint'
            }, function (res) {
              _response = res;
              done();
            });
          });
      });
      after(function () {
        return mongoose.disconnectAsync();
      });
      it('returns a 404 response', function () {
        expect(_response.statusCode).to.eql(404);
      });
    });
    describe('with no matching application', function () {
      var _response;
      before(function (done) {
        sinon.stub(Model.Organisation, 'findOneAsync').returns(BBPromise.resolve(
          new Model.Organisation({
            _id: 'orgid'
          })
        ));
        mongoose.connectAsync(config.get('Hoist.mongo.db'))
          .then(function () {
            var hapi = server.createHapiServer();
            hapi.inject({
              method: 'GET',
              url: '/org/app/endpoint'
            }, function (res) {
              _response = res;
              done();
            });
          });
      });
      after(function () {
        Model.Organisation.findOneAsync.restore();
        return mongoose.disconnectAsync();
      });
      it('returns a 404 response', function () {
        expect(_response.statusCode).to.eql(404);
      });
    });
    describe('with no endpoints', function () {
      var _response;
      before(function (done) {
        sinon.stub(Model.Organisation, 'findOneAsync').returns(BBPromise.resolve(
          new Model.Organisation({
            _id: 'orgid'
          })
        ));
        sinon.stub(Model.Application, 'findOneAsync').returns(BBPromise.resolve(
          new Model.Application({

          })
        ));
        mongoose.connectAsync(config.get('Hoist.mongo.db'))
          .then(function () {
            var hapi = server.createHapiServer();
            hapi.inject({
              method: 'GET',
              url: '/org/app/endpoint'
            }, function (res) {
              _response = res;
              done();
            });
          });
      });
      after(function () {
        Model.Application.findOneAsync.restore();
        Model.Organisation.findOneAsync.restore();
        return mongoose.disconnectAsync();
      });
      it('returns a 404 response', function () {
        expect(_response.statusCode).to.eql(404);
      });
    });
    describe('with matching endpoints', function () {
      var _response;
      before(function (done) {
        sinon.stub(Model.Organisation, 'findOneAsync').returns(BBPromise.resolve(
          new Model.Organisation({
            _id: 'orgid'
          })
        ));
        sinon.stub(Model.Application, 'findOneAsync').returns(BBPromise.resolve(
          new Model.Application({
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
        mongoose.connectAsync(config.get('Hoist.mongo.db'))
          .then(function () {
            var hapi = server.createHapiServer();
            hapi.inject({
              method: 'GET',
              url: '/org/app/endpoint'
            }, function (res) {
              _response = res;
              done();
            });
          });
      });
      after(function () {
        Model.Application.findOneAsync.restore();
        Model.Organisation.findOneAsync.restore();
        return mongoose.disconnectAsync();
      });
      it('returns a 404 response', function () {
        expect(_response.statusCode).to.eql(404);
      });
    });
  });
});
