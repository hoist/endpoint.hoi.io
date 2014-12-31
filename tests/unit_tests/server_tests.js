'use strict';
require('../bootstrap.js');
var Hapi = require('hapi');
var sinon = require('sinon');
var server = require('../../lib/server');
var expect = require('chai').expect;
var hoistModel = require('hoist-model');
var mongoose = hoistModel._mongoose;
describe('server', function () {
  describe('#start', function () {
    before(function () {
      sinon.stub(Hapi.Server.prototype, 'start').callsArg(0);
      sinon.spy(Hapi.Server.prototype, 'connection');
      sinon.stub(mongoose, 'connect').callsArg(1);
      server.start();
    });
    after(function () {
      Hapi.Server.prototype.start.restore();
      Hapi.Server.prototype.connection.restore();
      mongoose.connect.restore();
    });
    it('starts a hapi server', function () {
      return expect(Hapi.Server.prototype.start)
        .to.have.been.called;
    });
    it('listens to a port', function () {
      return expect(Hapi.Server.prototype.connection)
        .to.have.been.calledWith({
          port: 8080
        });
    });
    it('opens up a mongoose connection', function () {
      return expect(mongoose.connect)
        .to.have.been.calledWith('mongodb://localhost/hoist-test');
    });
  });
});
