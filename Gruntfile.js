/*
 * grunt-selenium-server
 * http://gruntjs.com/
 *
 * Copyright (c) 2013 Aaron Forsander, contributors
 * Licensed under the MIT license.
 */


module.exports = function (grunt) {
  var seleniumVersion = grunt.option('seleniumVersion') || '2.46.0';
  var seleniumMinorVersion = seleniumVersion.split('.').slice(0, 2).join('.');

  grunt.initConfig({
    jshint: {
      all: [
        'Gruntfile.js',
        'tasks/*.js'
      ],
      options: {
        jshintrc: '.jshintrc'
      }
    },

    'start-selenium-server': {
      test: {
        options: {
          downloadUrl: 'https://selenium-release.storage.googleapis.com/' + seleniumMinorVersion + '/selenium-server-standalone-' + seleniumVersion + '.jar'
        }
      }
    },

    'stop-selenium-server': {
      test: {}
    }
  });

  grunt.loadTasks('tasks');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.registerTask('test', ['start-selenium-server:test', 'stop-selenium-server:test']);
  grunt.registerTask('default', ['jshint']);
};
