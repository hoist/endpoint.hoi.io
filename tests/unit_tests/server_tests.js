'use strict';
require('../bootstrap.js');
var http = require('http');
var sinon = require('sinon');
var server = require('../../lib/server');
var expect = require('chai').expect;
var hoistModel = require('hoist-model');
var Application = hoistModel.Application;
var mongoose = hoistModel._mongoose;
var BBPromise = require('bluebird');
var EventBroker = require('broker/lib/event_broker');
var ApplicationEvent = require('broker/lib/event_types/application_event');
var supertest = require('supertest');
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
    describe('if endpoint exists', function () {
      var response;
      before(function (done) {
        sinon.stub(Application, 'findAsync', function () {
          return BBPromise.resolve([new Application({
            _id: 'applicationId',
            settings: {
              dev: {
                endpoints: {
                  '/invoice/:method': {
                    methods: ['POST'],
                    event: 'post.invoice',
                    authenticate: true
                  }
                }
              }
            }
          })]);
        });
        sinon.stub(EventBroker, 'publish').returns(BBPromise.resolve(null));
        supertest(server.createServer())
          .post('/domain/dev/invoice/new')
          .send({
            key: 'value'
          })
          .end(function (err, res) {
            response = res;
            done();
          });


      });
      after(function () {
        EventBroker.publish.restore();
        Application.findAsync.restore();
      });
      it('looks-up app based on host', function () {
        expect(Application.findAsync)
          .to.have.been.calledWith({
            subDomain: 'domain'
          });
      });
      it('publishes application event', function () {
        expect(EventBroker.publish)
          .to.have.been.calledWith(sinon.match.instanceOf(ApplicationEvent));
      });
      it('publish the correct event', function () {
        var eventExpected = new ApplicationEvent({
          applicationId: 'applicationId',
          eventName: 'post.invoice',
          environment: 'dev',
          correlationId: response.header.cid,
          payload: {
            _request: {
              body: {
                key: 'value'
                },
              headers: {
                'accept-encoding': 'gzip, deflate',
                connection: 'close',
                'content-length': '15',
                'content-type': 'application/json',
                'user-agent': 'node-superagent/0.19.0'
              },
              url: '/invoice/new',
              method: 'POST'
            }

          }
        });
        expect(EventBroker.publish.firstCall.args[0])
          .to.eql(eventExpected);
      });
      it('sends a 200 response', function () {
        expect(response.statusCode).to.eql(200);
      });
      it('replies with the CID', function () {
        /*jshint -W030*/
        expect(response.header.cid).to.exist;
      });
    });
    describe('with no matching endpoint', function () {
      var response;
      before(function (done) {

        sinon.stub(Application, 'findAsync', function () {
          return BBPromise.resolve([new Application({
            _id: 'applicationId',
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
          })]);
        });
        sinon.stub(EventBroker, 'publish').callsArg(1);
        supertest(server.createServer())
          .post('/something/something/else')
          .send({
            key: 'value'
          })
          .end(function (err, res) {
            response = res;
            done();
          });
      });
      after(function () {
        EventBroker.publish.restore();
        Application.findAsync.restore();
      });
      it('looks-up app based on host', function () {
        expect(Application.findAsync)
          .to.have.been.calledWith({
            subDomain: 'something'
          });
      });
      it('doesn\'t publish application event', function () {
        /*jshint -W030*/
        expect(EventBroker.publish)
          .to.have.not.been.called;
      });
      it('sends a 404 response', function () {
        expect(parseInt(response.statusCode)).to.eql(404);
      });
      it('should publish a message', function () {
        expect(response.text).to.eql('No Endpoint Found');
      });
    });
    describe('with no matching application', function () {
      var response;
      before(function (done) {
        sinon.stub(Application, 'findAsync', function () {
          return BBPromise.resolve([]);
        });
        sinon.stub(EventBroker, 'publish').callsArg(1);
        supertest(server.createServer())
          .post('/domain/something/else')
          .send({
            key: 'value'
          })
          .end(function (err, res) {
            response = res;
            done();
          });
      });
      after(function () {
        EventBroker.publish.restore();
        Application.findAsync.restore();
      });
      it('looks-up app based on host', function () {
        expect(Application.findAsync)
          .to.have.been.calledWith({
            subDomain: 'domain'
          });
      });
      it('doesn\'t publish application event', function () {
        /*jshint -W030*/
        expect(EventBroker.publish)
          .to.have.not.been.called;
      });
      it('sends a 404 response', function () {
        expect(parseInt(response.statusCode)).to.eql(404);
      });
      it('should publish a message', function () {
        expect(response.text).to.eql('The specified application could not be found');
      });
    });
  });
});
