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
