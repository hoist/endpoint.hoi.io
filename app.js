'use strict';
require("babel/register");
var logger = require('@hoist/logger');
var Server = require('./lib/server');
process.title = 'hoist-webhooks-listener';

var server = new Server();

var gracefullShutdown = function (SIG) {
  logger.info({
    SIG: SIG
  }, 'server stopping');
  return Promise.all([
    server.stop()
  ]).then(function () {
    process.kill(process.pid, SIG);
  }).catch(function (err) {
    logger.error(err);
    logger.alert(err);
    throw err;
  });
};
server.start().then(function () {
  logger.info('service started');
  process.once('SIGUSR2', function () {
    return gracefullShutdown('SIGUSR2');
  });
  process.once('SIGTERM', function () {
    return gracefullShutdown('SIGTERM');
  });
  process.once('SIGINT', function () {
    return gracefullShutdown('SIGINT');
  });
}).catch(function (err) {
  logger.error(err);
  logger.alert(err);
  process.exit(1);
});
