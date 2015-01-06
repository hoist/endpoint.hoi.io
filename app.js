'use strict';
var logger = require('hoist-logger');
var server = require('./lib/server');
process.title = 'hoist-webhooks-listener';
process.on('message', function (msg) {
  if (msg === 'shutdown') {

    process.nextTick(function () {
      server.stop(function () {
        logger.info('server shutdown complete');
        process.exit(0);
      });
    });
    logger.info('server shutdown initiated');
  }
});


server.start();
logger.info('started');
