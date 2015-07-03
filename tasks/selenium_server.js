var fs = require('fs');
var os = require('os');
var path = require('path');
var url = require('url');
var request = require('request');
var ProgressBar = require('progress');

module.exports = function (grunt) {
  /**
   * References running server processes.
   *
   * @type {Object}
   */
  var childProcesses = {};

  function kill() {
    for (target in childProcesses)
      childProcesses[target].kill('SIGINT');
  }

  function getDestination(options) {
    return path.join(options.downloadLocation, path.basename(options.downloadUrl));
  }

  /**
   * Download the Selenium Server jar file.
   *
   * @param  {Object}   options Grunt task options.
   * @param  {Function} cb
   */
  function downloadJar (options, cb) {
    // Where to save jar to.
    var destination = getDestination(options);

    // If it's already there don't download it.
    if (fs.existsSync(destination)) {
      return cb(destination, null);
    }

    grunt.log.ok('Saving jar to: ' + destination);

    var writeStream = fs.createWriteStream(destination);

    // Start downloading and showing progress.
    request(options.downloadUrl).on('response', function (res) {
      if(res.statusCode >= 400) {
          fs.unlink(destination, function (err) {
            if (err)
              grunt.log.error(err);
            cb(null, new Error(options.downloadUrl + " returns " + res.statusCode));
          })
          return;
      }
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

  function deleteJar(options, cb) {
    fs.unlink(getDestination(options), cb);
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

    Object.keys(options.systemProperties).forEach(function (key) {
      args.push('-D' + key + '=' + options.systemProperties[key]);
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

    // Reading stream see if selenium has started
    function hasSeleniumStarted(data) {
      var str = data.toString();
      var errRegex = /^Error: /;
      if (str.match(/Selenium is already running/)) {
        cb(new Error(str));
      } else if (str.match(errRegex)) {
        str = str.replace(errRegex, '');
        if (str.match(/^Invalid or corrupt jarfile /)) {
          deleteJar(options, function(err) {
            if (err)
              return cb(err);
            cb(new Error(str));
          });
        } else {
          cb(new Error(str));
        }
      } else if (str.match(/Selenium Server is up and running/) || str.match(/Started SocketListener on .+:\d+/)) {
        if (complete) {
          return;
        }
        grunt.log.ok('Selenium server SocketListener started.');

        // Wait a tiny bit more time just because it's java and I'm worried.
        setTimeout(function() {
          complete = true;
          cb(null);
        }, 2000);
      }
    }

    // < 2.43.0 outputs to stdout
    childProcesses[target].stdout.on('data', hasSeleniumStarted);
    // >= 2.43.0 outputs to stderr
    childProcesses[target].stderr.on('data', hasSeleniumStarted);

    childProcesses[target].on('error', cb);

    // Timeout case
    setTimeout(function() {
      if (!complete) {
        complete = true;
        // Try to clean up better after ourselves
        childProcesses[target].kill('SIGTERM');
        cb(new Error('Timeout waiting for selenium to start.  Check if an instance of selenium is already running.'));
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
      autostop: false,
      downloadUrl: 'https://selenium-release.storage.googleapis.com/2.46/selenium-server-standalone-2.46.0.jar',
      downloadLocation: os.tmpdir(),
      serverOptions: {},
      systemProperties: {}
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

    if (options.autostop) {
      process.on('exit', kill);
      process.on('SIGINT', kill);
      process.on('uncaughtException', kill);
    }
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
      childProcesses[target].kill('SIGINT');
    }
  });
};
