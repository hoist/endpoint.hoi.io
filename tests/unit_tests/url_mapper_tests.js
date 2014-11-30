'use strict';
var UrlMapper = require('../../lib/url_mapper');
var expect = require('chai').expect;

describe('UrlMapper', function () {
  describe('.queryFromPath', function () {
    it('maps firstPart of path to subdomain query', function () {
      var query = UrlMapper.queryFromPath('/mixedCaseName/dev/some/end/point');
      expect(query.subDomain).to.eql('mixedcasename');
    });
    it('maps queryString of path to path query', function () {
      var query = UrlMapper.queryFromPath('/mixedCaseName/dev/some/end/point/?somekey=some-value%20here');
      expect(query.queryString).to.eql('somekey=some-value%20here');
    });
  });
  describe('.environmentFromPath', function () {
    it('environment subdomains match', function () {
      expect(UrlMapper.environmentFromPath('/mixedCaseName/Dev/some/end/point')).to.eql('dev');
      expect(UrlMapper.environmentFromPath('/mixedCaseName/LiVe/some/end/point')).to.eql('live');
      expect(UrlMapper.environmentFromPath('/mixedCaseName/tesT/some/end/point')).to.eql('test');
    });
    it('should default to live', function () {
      expect(UrlMapper.environmentFromPath('/mixedCaseName/some/end/point')).to.eql('live');
    });
  });
  describe('.routeFromPath', function () {
    it('returns null if no endpoints', function () {
      expect(UrlMapper.routeFromPath({}, '/mixedCaseName/status?name=ryan')).to.eql(null);
    });
    it('returns null if null endpoints', function () {
      expect(UrlMapper.routeFromPath(null, '/mixedCaseName/status?name=ryan')).to.eql(null);
    });
    it('returns endpoint if direct match', function () {
      expect(UrlMapper.routeFromPath({
        '/status': {
          'methods': ['GET'],
          'event': 'get.invoices',
          'authenticated': true
        }
      }, {
        url: '/subDomain/status?name=ryan',
        method: 'GET'
      })).to.eql({
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
      }, {
        url: '/subDomain/status/ryan',
        method: 'POST'
      })).to.eql({
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
      }, {
        url: '/subDomain/status/ryan',
        method: 'POST'
      })).to.eql(null);
    });
  });
  describe('.sanitisePath', function () {
    it('clears subdomain from path',function(){
      expect(UrlMapper.sanitisePath('/subDomain/some/path').path)
      .to.eql('/some/path');

    });
    it('clears environment from path',function(){
      expect(UrlMapper.sanitisePath('/subDomain/Live/some/path').path)
      .to.eql('/some/path');
      expect(UrlMapper.sanitisePath('/subDomain/dev/some/path').path)
      .to.eql('/some/path');
      expect(UrlMapper.sanitisePath('/subDomain/tesT/some/path').path)
      .to.eql('/some/path');
    });
  });
});
