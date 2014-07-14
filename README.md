# grunt-selenium-server

> Start/stop a local Selenium standalon server.



## Getting Started

```shell
npm install grunt-selenium-server --save-dev
```

```js
grunt.loadNpmTasks('grunt-selenium-server');
```


Grunt config example:

```js
'selenium-server-start': {
  dev: {

  }
},
'selenium-server-stop': {
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

```js
grunt devUI
```


Kill selenium in case your grunt tasks fails before we reach 'stop-selenium-server':

```js
 var seleniumChildProcesses = {};
  grunt.event.on('selenium.start', function(target, process){
    grunt.log.ok('Saw process for target: ' +  target);
    seleniumChildProcesses[target] = process;
  });

  grunt.event.on('huxley.fail', function() {
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

Note that if you won't handle this event, if your phpunit (for example) will fail the selenium server process will remain active in the background.
