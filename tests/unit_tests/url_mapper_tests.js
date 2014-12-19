'use strict';
var UrlMapper = require('../../lib/url_mapper');
var expect = require('chai').expect;

describe('UrlMapper', function () {
  describe('.routeFromPath', function () {
    it('returns null if no endpoints', function () {
      expect(UrlMapper.routeFromPath({}, 'POST', '/mixedCaseName/status?name=ryan')).to.eql(null);
    });
    it('returns null if null endpoints', function () {
      expect(UrlMapper.routeFromPath(null, 'GET', '/mixedCaseName/status?name=ryan')).to.eql(null);
    });
    it('returns endpoint if direct match', function () {
      expect(UrlMapper.routeFromPath({
        '/status': {
          'methods': ['GET'],
          'event': 'get.invoices',
          'authenticated': true
        }
      }, 'GET', '/status')).to.eql({
        'event': 'get.invoices',
        'authenticated': true
      });
    });
    it('returns endpoint if parametered match', function () {
      expect(UrlMapper.routeFromPath({
        '/status/:name': {
          'methods': ['GET', 'POST'],
          'event': 'get.invoices',
          'authenticated': true
        }
      }, 'POST', '/status/ryan')).to.eql({
        'event': 'get.invoices',
        'authenticated': true,
        'name': 'ryan'
      });
    });
    it('returns null if methods dont match', function () {
      expect(UrlMapper.routeFromPath({
        '/status/:name': {
          'methods': ['GET'],
          'event': 'get.invoices',
          'authenticated': true
        }
      }, 'POST', '/status/ryan')).to.eql(null);
    });
  });
});
