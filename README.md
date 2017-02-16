# respawn

Spawn a process and restart it if it crashes.

```
npm install respawn
```

[![Build Status](https://travis-ci.org/mafintosh/respawn.png)](https://travis-ci.org/mafintosh/respawn)

## Usage

It is easy to use

``` js
var respawn = require('respawn')

var monitor = respawn(['node', 'server.js'], {
  name: 'test',          // set monitor name
  env: {ENV_VAR:'test'}, // set env vars
  cwd: '.',              // set cwd
  maxRestarts:10,        // how many restarts are allowed within 60s
                         // or -1 for infinite restarts
  sleep:1000,            // time to sleep between restarts,
  kill:30000,            // wait 30s before force killing after stopping
  stdio: [...],          // forward stdio options
  fork: true             // fork instead of spawn
})

monitor.start() // spawn and watch
```

Optionally you can specify the command to to spawn in the option map as `command: [...]`

Per default respawn will restart you app indefinitely. To set a max restart limit set the `maxRestarts` option.

If `sleep` is an array of numbers it will use the value at the position of the current number of restarts as the timeout value. If the number of restarts exceed the length of the array it will use the last value in the array until it hits the maxRestarts.

`sleep: [1000, 60000, 60000, 12000, 1000]` will wait 1000ms before retrying, then it will wait 60000 before the next retry and so forth.

If `sleep` is a function it will be passed the number of times (including this one) that the app has been restarted (i.e. first time will be called with 1, second time 2 etc.) and should return a time in milliseconds.

## API

* `monitor.start()` Starts the monitor

* `monitor.stop(cb)` Stops the monitor (kills the process if its running with SIGTERM)

* `monitor.status` Get the current monitor status. Available values are `running`, `stopping`, `stopped`, `crashed` and `sleeping`

## Events

* `monitor.on('start')` The monitor has started

* `monitor.on('stop')`  The monitor has fully stopped and the process is killed

* `monitor.on('crash')`  The monitor has crashed (too many restarts or spawn error).

* `monitor.on('sleep')` monitor is sleeping

* `monitor.on('spawn', process)` New child process has been spawned

* `monitor.on('exit', code, signal)` child process has exited

* `monitor.on('stdout', data)` child process stdout has emitted data

* `monitor.on('stderr', data)` child process stderr has emitted data

* `monitor.on('warn', err)` child process has emitted an error

## Graceful restart

To do graceful restart simply have your app stop gracefully when receiving `SIGTERM` and do

``` js
// graceful restart (do not wait for old process to die)
monitor.stop()
monitor.start()

// hard restart (wait for old process to die)
monitor.stop(function() {
  monitor.start()
})
```

## License

MIT
