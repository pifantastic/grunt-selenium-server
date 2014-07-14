
module.exports = function (grunt) {

  var fs = require('fs');
  var path = require('path');
  var url = require('url');
  var request = require('request');
  var ProgressBar = require('progress');

  /**
   * References running server processes.
   *
   * @type {Object}
   */
  var childProcesses = {};

  /**
   * Download the Selenium Server jar file.
   *
   * @param  {Object}   options Grunt task options.
   * @param  {Function} cb
   */
  function downloadJar (options, cb) {
    // Where to save jar to.
    var destination = path.join(options.downloadLocation, path.basename(options.downloadUrl));

    // If it's already there don't download it.
    if (fs.existsSync(destination)) {
      return cb(destination, null);
    }

    grunt.log.ok('Saving jar to: ' + destination);

    var writeStream = fs.createWriteStream(destination);

    // Start downloading and showing progress.
    request(options.downloadUrl).on('response', function (res) {
      // Full length of file.
      var len = parseInt(res.headers['content-length'], 10);

      // Super nifty progress bar.
      var bar = new ProgressBar(' downloading [:bar] :percent :etas', {
        complete: '=',
        incomplete: ' ',
        width: 20,
        total: len
      });

      // Write new data to file.
      res.on('data', function (chunk) {
        writeStream.write(chunk);
        bar.tick(chunk.length);
      });

      // Close file and holla back.
      res.on('end', function () {
        writeStream.end();
        grunt.log.ok('done.');
        cb(destination, null);
      });

      // Download error.
      res.on('error', function (err) {
        cb(null, err);
      });
    });
  }

  /**
   * Start a selenium server.
   *
   * @param  {String}   target  Grunt task target.
   * @param  {String}   jar     Full path to server jar.
   * @param  {Object}   options Grunt task options.
   * @param  {Function} cb
   */
  function startServer (target, jar, options, cb) {
    var args = ['-jar', jar];

    // Add additional options to command.
    Object.keys(options.serverOptions).forEach(function (key) {
      args.push('-' + key);
      args.push(options.serverOptions[key]);
    });

    grunt.log.ok('Starting Selenium server...');

    // Spawn server process.
    grunt.log.ok('Using (roughly) command: java ' + args.join(' '));
    var spawn = require('child_process').spawn;
    childProcesses[target] = spawn('java', args);

    grunt.event.emit('selenium.start', target, childProcesses[target]);

    var pid = childProcesses[target].pid;
    grunt.log.ok('Boom, got it. pid is ' + pid + ' in case you give a shit.');

    var complete = false;

    childProcesses[target].stdout.on('data', function(data) {
      if (data.toString().match(/Started SocketListener on .+:\d+/)) {
        if (complete) return;
        grunt.log.ok('Selenium server SocketListener started.');

        // Wait a tiny bit more time just because it's java and I'm worried.
        setTimeout(function(){
          complete = true;
          cb(null);
        }, 2000);
      }
    });

    childProcesses[target].stderr.on('data', function(data) {
      grunt.log.error(data.toString());
    });

    // Timeout case
    setTimeout(function() {
      if (!complete) {
        complete = true;
        // Try to clean up better after ourselves
        childProcesses[target].kill('SIGTERM');
        cb(new Error('Timeout waiting for selenium to start.'));
      }
    }, 30000);
  }

  /**
   * Start a Selenium server.
   */
  grunt.registerMultiTask('start-selenium-server', 'Start Selenium server.', function () {
    var done = this.async();
    var target = this.target;

    // Set default options.
    var options = this.options({
      downloadUrl: 'https://selenium-release.storage.googleapis.com/2.42/selenium-server-standalone-2.42.2.jar',
      downloadLocation: '/tmp',
      serverOptions: {}
    });

    grunt.verbose.writeflags(options, 'Options');

    // Download jar file. Doesn't do anything if the file's already been downloaded.
    downloadJar(options, function (jar, err) {
      if (err) {
        grunt.log.error(err);
        return done(false);
      }

      // Start the selenium server in a child process.
      startServer(target, jar, options, function (err) {
        if (err) {
          grunt.log.error(err);
          return done(false);
        }

        done(true);
      });
    });
  });

  /**
   * Stop a Selenium server.
   */
  grunt.registerMultiTask('stop-selenium-server', 'Stop Selenium server.', function () {
    var target = this.target;

    // Make sure we have a reference to the running server process.
    if (!childProcesses[target]) {
      grunt.log.error('Server not running.');
    }
    else {
      grunt.log.ok('Sending kill signal to child process.');
      childProcesses[target].kill('SIGTERM');
    }
  });

};
