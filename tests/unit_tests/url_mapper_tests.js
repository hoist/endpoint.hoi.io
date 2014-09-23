'use strict';
var UrlMapper = require('../../lib/url_mapper');
var expect = require('chai').expect;

describe('UrlMapper', function () {
  describe('.queryFromHost', function () {
    it('maps hoist domain to subdomain query', function () {
      var query = UrlMapper.queryFromHost('MixedCaseName.incomming.hoi.io');
      expect(query.subDomain).to.eql('mixedcasename');
    });
    it('maps non hoist domain to cname query',function(){
      var query = UrlMapper.queryFromHost('AppName.com');
      expect(query.alias).to.eql('appname.com');
    });
    it('maps environment domain to a subdomain query',function(){
      var query = UrlMapper.queryFromHost('DEV.MixedCaseName.incomming.hoi.io');
      expect(query.subDomain).to.eql('mixedcasename');
    });
  });
  describe('.environmentFromHost',function(){
    it('environment subdomains match',function(){
      expect(UrlMapper.environmentFromHost('Dev.app.com')).to.eql('dev');
      expect(UrlMapper.environmentFromHost('Live.aPpp.hoi.io')).to.eql('live');
      expect(UrlMapper.environmentFromHost('test.app.hoi.io')).to.eql('test');
    });
    it('should default to live',function(){
      expect(UrlMapper.environmentFromHost('something.app.hoi.dev')).to.eql('live');
    });
  });
});
