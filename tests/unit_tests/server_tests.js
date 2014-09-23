'use strict';
require('../bootstrap.js');
var http = require('http');
var httpMocks = require('node-mocks-http');
var sinon = require('sinon');
var server = require('../../lib/server');
var expect = require('chai').expect;
var mongoose = require('hoist-model')._mongoose;

describe('server', function () {
  describe('#start', function () {
    var stubbedServer = {
      listen: sinon.stub()
    };
    before(function () {
      sinon.stub(http, 'createServer').returns(stubbedServer);
      sinon.stub(mongoose, 'connect').callsArg(1);
      server.start();
    });
    after(function () {
      http.createServer.restore();
    });
    it('creates a server', function () {
      expect(http.createServer)
        .to.have.been.calledWith(server.processRequest);
    });
    it('listens to a port', function () {
      expect(stubbedServer.listen)
        .to.have.been.calledWith(8080);
    });
    it('opens up a mongoose connection', function () {
      expect(mongoose.connect)
        .to.have.been.calledWith('mongodb://localhost/hoist-test');
    });
  });
  describe('#processRequest', function () {
    before(function () {
      var request = httpMocks.createRequest({
        headers:{
          host:'something.internal.hoi.io'
        }
      });
      var response = httpMocks.createResponse({});
      server.processRequest(request, response);
    });
    after(function () {

    });
    it('looks-up app based on host', function () {

    });
    it('publishes application event', function () {

    });
  });
});
