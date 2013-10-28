/*
 * grunt-selenium-server
 * http://gruntjs.com/
 *
 * Copyright (c) 2013 Aaron Forsander, contributors
 * Licensed under the MIT license.
 */

module.exports = function (grunt) {

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
      test: {}
    },

    'stop-selenium-server': {
      test: {}
    }
  });

  grunt.loadTasks('tasks');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.registerTask('default', ['jshint']);
};
