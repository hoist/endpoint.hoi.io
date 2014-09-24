'use strict';
require('../bootstrap.js');
var http = require('http');
var httpMocks = require('node-mocks-http');
var sinon = require('sinon');
var server = require('../../lib/server');
var expect = require('chai').expect;
var hoistModel = require('hoist-model');
var Application = hoistModel.Application;
var mongoose = hoistModel._mongoose;
var BBPromise = require('bluebird');
var EventBroker = require('broker/lib/event_broker');
var ApplicationEvent = require('broker/lib/event_types/application_event');

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
        headers: {
          host: 'something.incomming.hoi.io'
        },
        url: '/invoice/new',
        method: 'POST',
        body:'some text'
      });
      var response = httpMocks.createResponse({});
      sinon.stub(Application, 'findAsync', function () {
        return BBPromise.resolve(new Application({
          _id:'applicationId',
          settings: {
            live: {
              endpoints: {
                '/invoice/:method': {
                  methods: ['POST'],
                  event: 'post.invoice',
                  authenticate: true
                }
              }
            }
          }
        }));
      });
      sinon.stub(EventBroker, 'publish').callsArg(1);
      server.processRequest(request, response);
    });
    after(function () {
      Application.findAsync.restore();
    });
    it('looks-up app based on host', function () {
      expect(Application.findAsync)
        .to.have.been.calledWith({
          subDomain: 'something'
        });
    });
    it('publishes application event', function () {
      expect(EventBroker.publish)
        .to.have.been.calledWith(sinon.match.instanceOf(ApplicationEvent));
    });
    it('publish the correct event', function () {
      expect(EventBroker.publish.firstCall.args[0])
        .to.eql(new ApplicationEvent({
          applicationId:'applicationId',
          eventName: 'post.invoice',
          environment:'live',
          body: {
            request: {
              headers: {
                host: 'something.incomming.hoi.io'
              },
              url: '/invoice/new',
              method: 'POST',
              body:'some text'
            },
            params: {
              authenticate: true,
              event: 'post.invoice',
              method: 'new'
            }
          }
        }));
    });
    it('sends a 200 response', function () {

    });
    it('replies with the CID', function () {

    });
  });
});
