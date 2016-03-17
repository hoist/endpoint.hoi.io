'use strict';
var gulp = require('gulp');
var del = require('del');

gulp.task('clean-coverage', function (callback) {
  return del('coverage/**/*');
});
gulp.task('clean-docs', function (callback) {
  return del('docs/**/*');
});
gulp.task('clean', ['clean-docs', 'clean-coverage']);
