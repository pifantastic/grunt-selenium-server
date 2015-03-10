
module.exports = function (grunt) {

  var fs = require('fs');
  var os = require('os');
  var path = require('path');
  var url = require('url');
  var request = require('request');
  var ProgressBar = require('progress');
  var async = require('async');
  var unzip = require('unzip');

  /**
   * References running server processes.
   *
   * @type {Object}
   */
  var childProcesses = {};

  /**
   * Download file from web.
   *
   * @param {string}   fileTo  - path save a file.
   * @param {string}   urlFrom - url for downloading a file
   * @param {Function} cb      - callback function
   */
  function downloadFile (fileTo, urlFrom, cb) {
    // Where to save jar to.
    // If it's already there don't download it.
    if (fs.existsSync(fileTo)) {
      return cb(fileTo, null);
    }

    grunt.log.ok('Saving file to: ' + fileTo);

    var writeStream = fs.createWriteStream(fileTo);

    // Start downloading and showing progress.
    request(urlFrom).on('response', function (res) {
      if(res.statusCode > 200 && res.statusCode < 300) {
        grunt.log.ok("grunt fail");
        grunt.fail.fatal(urlFrom + " returns " + res.statusCode);
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
        cb(fileTo, null);
      });

      // Download error.
      res.on('error', function (err) {
        cb(null, err);
      });
    });
  }

  /**
   * Download files for Selenium Server.
   *
   * @param {Object}   options - options Grunt task options.
   * @param {Function} cb      - callback function
   */
  function downloadFiles(options, cb) {
    var callback = cb;
    var serverFileName;
    var destination = path.join(options.downloadLocation, path.basename(options.downloadUrls.server));
    downloadFile(destination, options.downloadUrls.server, function(fileName){
      serverFileName = fileName;
      async.eachSeries(options.downloadUrls.drivers, function(driver, cb2){
        if (fs.existsSync(path.join(options.downloadLocation, path.basename(driver.url))) ||
            driver.bin && fs.existsSync(path.join(options.downloadLocation, path.basename(driver.bin)))) {
          cb2(null);
        } else
          downloadFile(path.join(options.downloadLocation, path.basename(driver.url)), driver.url, function(fileName){
            if (path.extname(fileName) == '.zip'){
              if (driver.bin) {
                fs.createReadStream(fileName)
                  .pipe(unzip.Parse())
                  .on(
                  'entry', function (entry) {
                    var fName = entry.path;
                    var type = entry.type; // 'Directory' or 'File'
                    var size = entry.size;
                    if (path.basename(fName, path.extname(fName)) === path.basename(driver.bin, path.extname(driver.bin))) {
                      entry.pipe(fs.createWriteStream(path.join(options.downloadLocation, fName)));
                      fs.unlink(fileName);
                      cb2(null);
                    } else {
                      entry.autodrain();
                    }
                  }
                );
              } else {
                fs.createReadStream(fileName).pipe(unzip.Extract({ path: options.downloadLocation }));
              }
            } else {
              cb2(null);
            }
          });
      }, function(result){
        if (!result){
          cb(serverFileName, null);
        } else {
          cb(null, result);
        }
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
      if (data.toString().match(/Started SocketListener on .+:\d+/)) {
        if (complete) return;
        grunt.log.ok('Selenium server SocketListener started.');

        // Wait a tiny bit more time just because it's java and I'm worried.
        setTimeout(function(){
          complete = true;
          cb(null);
        }, 2000);
      }
    }

    // < 2.43.0 outputs to stdout
    childProcesses[target].stdout.on('data', hasSeleniumStarted);
    // >= 2.43.0 outputs to stdout
    childProcesses[target].stderr.on('data', hasSeleniumStarted);

    // Timeout case
    setTimeout(function() {
      if (!complete) {
        complete = true;
        // Try to clean up better after ourselves
        childProcesses[target].kill('SIGTERM');
        cb(new Error('Timeout waiting for selenium to start.  Check if an instance of selenium is already running.'));
      }
    }, 180000);
  }

  /**
   * Start a Selenium server.
   */
  grunt.registerMultiTask('start-selenium-server', 'Start Selenium server.', function () {
    var done = this.async();
    var target = this.target;

    // Set default options.
    var options = this.options(
      {
        downloadUrls    : {
          "server" : 'http://selenium-release.storage.googleapis.com/2.45/selenium-server-standalone-2.45.0.jar',
          "drivers": [
            {
              "name": "chrome",
              "url" : "http://chromedriver.storage.googleapis.com/2.14/chromedriver_win32.zip",
              "bin" : "chromedriver.exe"
            },
            {
              "name": "ie",
              "url" : "http://selenium-release.storage.googleapis.com/2.45/IEDriverServer_Win32_2.45.0.zip",
              "bin" : "IEDriverServer.exe"
            }
          ]
        },
        downloadLocation: os.tmpdir(),
        serverOptions: {
          "port" : "4444"
        },
        systemProperties: {}
      }
    );

    grunt.verbose.writeflags(options, 'Options');

    // Download jar file. Doesn't do anything if the file's already been downloaded.
    downloadFiles(options, function (jar, err) {
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
