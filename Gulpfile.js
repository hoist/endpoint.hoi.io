'use strict';
var gulp = require('gulp');
var requireDir = require('require-dir');
var runSequence = require('run-sequence');
require('git-guppy')(gulp);
var helpers = require('./gulp/helpers');
requireDir('./gulp/tasks', {
  recurse: true
});
gulp.task('test', function (cb) {
  return runSequence('clean', ['eslint-build', 'mocha-server'], function () {
    cb(helpers.getError());
  });
});
gulp.task('default', function (cb) {
  runSequence('test', 'esdoc', () => {
    cb();
  });
});

gulp.task('post-commit', ['test', 'esdoc']);

gulp.task('pre-commit', function () {

});
