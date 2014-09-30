'use strict';

var server = require('./lib/server');

process.on('message', function (msg) {
  console.log('got message',msg);
  if (msg === 'shutdown') {
    // Your process is going to be reloaded
    // You have to close all database/socket.io/* connections

    console.log('Closing all connections...');

    // You will have 4000ms to close all connections before
    // the reload mechanism will try to do its job
    server.stop(function () {
      process.exit(0);
    });
  }
});


server.start();
console.log('started');
