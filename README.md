# grunt-selenium-server

> Start/stop a local Selenium standalon server.



## Getting Started

```shell
npm install grunt-selenium-server --save-dev
```

```js
grunt.loadNpmTasks('grunt-selenium-server');
```


Grunt config example (with default options):
```js
'start-selenium-server': {
  dev: {
    options: {
      downloadUrl: 'https://selenium-release.storage.googleapis.com/2.42/selenium-server-standalone-2.42.2.jar',
      downloadLocation: '/tmp',
      serverOptions: {},
      systemProperties: {}
    }
  }
},
'stop-selenium-server': {
  dev: {

  }
}
```

Grunt task example:
```js
grunt.registerTask('devUI', 'run selenium server and phpunit', function(){
   grunt.task.run(['start-selenium-server:dev', 'phpunit:dev', 'stop-selenium-server:dev']);
});
```

Run:
```shell
grunt devUI
```


Kill selenium in case your grunt tasks fails before we reach 'stop-selenium-server':
```js
        var seleniumChildProcesses = {};
        grunt.event.on('selenium.start', function(target, process){
            grunt.log.ok('Saw process for target: ' +  target);
            seleniumChildProcesses[target] = process;
        });

        grunt.util.hooker.hook(grunt.fail, function(){
            // Clean up selenium if we left it running after a failure.
            grunt.log.writeln('Attempting to clean up running selenium server.');
            for(var target in seleniumChildProcesses) {
                grunt.log.ok('Killing selenium target: ' + target);
                try {
                    seleniumChildProcesses[target].kill('SIGTERM');
                }
                catch(e) {
                    grunt.log.warn('Unable to stop selenium target: ' + target);
                }
            }
        });
 ```

## Notes:
1. If you won't handle this event, if your phpunit (for example) will fail the selenium server process will remain active in the background.

2. The "grunt.fail" event will be fired whenever any grunt task is failing. Thus you might want to consider using a more specific event related to the task that actually uses selenium server. i.e phpunit in the above example.

