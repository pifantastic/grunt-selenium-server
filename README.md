# grunt-selenium-server

> Start/stop a local Selenium standalon server.

## Getting Started

```shell
npm install grunt-selenium-server --save-dev
```

Grunt config example (with default options):
```js
module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-selenium-server');
  grunt.initConfig({
    'start-selenium-server': {
      dev: {
        options: {
          autostop: false,
          downloadUrl: 'https://selenium-release.storage.googleapis.com/2.46/selenium-server-standalone-2.46.0.jar',
          downloadLocation: os.tmpdir(),
          serverOptions: {},
          systemProperties: {}
        }
      }
    },
    'stop-selenium-server': {
      dev: {}
    }
  });
};
```

## Running grunt-selenium-server

Grunt task example:
```js
grunt.registerTask('devUI', 'run selenium server and phpunit', function() {
  grunt.task.run('start-selenium-server:dev', 'phpunit:dev', 'stop-selenium-server:dev');
});
```

Run:
```shell
grunt devUI
```

## Stopping grunt-selenium-server

Selenium will need to be stopped after it has started.

**Set the `autostop` option to `true`**

The selenium proccess will stop when the grunt proccess ends.
```js
'start-selenium-server': {
  dev: {
    options: {
      autostop: true,
      downloadUrl: 'https://selenium-release.storage.googleapis.com/2.46/selenium-server-standalone-2.46.0.jar'
    }
  }
}
```

**Use [grunt-force-task](https://github.com/floriangosse/grunt-force-task) to force a task**

Any tasks (expected) to fail will continue
```js
grunt.registerTask('test', ['start-selenium-server:dev', 'force:mochaTest', 'stop-selenium-server:dev']);
```

**Create custom grunt.fail handler**

Kill selenium in case your grunt tasks fails before we reach 'stop-selenium-server':
```js
var seleniumChildProcesses = {};
grunt.event.on('selenium.start', function(target, process) {
  grunt.log.ok('Saw process for target: ' +  target);
  seleniumChildProcesses[target] = process;
});

grunt.util.hooker.hook(grunt.fail, function() {
  // Clean up selenium if we left it running after a failure.
  grunt.log.writeln('Attempting to clean up running selenium server.');
  for (var target in seleniumChildProcesses) {
    grunt.log.ok('Killing selenium target: ' + target);
    try {
      seleniumChildProcesses[target].kill('SIGINT');
    } catch(e) {
      grunt.log.warn('Unable to stop selenium target: ' + target);
    }
  }
});
```

#### Notes:
1. If you won't handle this event, if your phpunit (for example) will fail the selenium server process will remain active in the background.

2. The "grunt.fail" event will be fired whenever any grunt task is failing. Thus you might want to consider using a more specific event related to the task that actually uses selenium server. i.e phpunit in the above example.
