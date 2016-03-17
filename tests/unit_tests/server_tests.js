'use strict';
import Hapi from 'hapi';
import sinon from 'sinon';
import { Server } from '../../lib/server';
import { expect } from 'chai';
import { _mongoose } from '@hoist/model';

/** @test {Server} */
describe('Server', function() {
  let server;
  before(() => {
    server = new Server();
  });
  /** @test {Server#start} */
  describe('#start', function() {
    before(() => {
      sinon.stub(Hapi.Server.prototype, 'start').callsArg(0);
      sinon.spy(Hapi.Server.prototype, 'connection');
      sinon.stub(_mongoose, 'connect').callsArg(1);
      server.start();
    });
    after(function() {
      Hapi.Server.prototype.start.restore();
      Hapi.Server.prototype.connection.restore();
      _mongoose.connect.restore();
    });
    it('starts a hapi server', function() {
      return expect(Hapi.Server.prototype.start)
        .to.have.been.called;
    });
    it('listens to a port', function() {
      return expect(Hapi.Server.prototype.connection)
        .to.have.been.calledWith({
        host: "0.0.0.0",
        port: 8000
      });
    });
    it('opens up a mongoose connection', function() {
      return expect(_mongoose.connect)
        .to.have.been.calledWith('mongodb://db/hoist-test');
    });
  });
});
