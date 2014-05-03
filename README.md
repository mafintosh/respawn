# respawn

Spawn a process and restart it if it crashes.

	npm install respawn

[![Build Status](https://travis-ci.org/mafintosh/respawn.png)](https://travis-ci.org/mafintosh/respawn)

## Usage

It is easy to use

``` js
var respawn = require('respawn');

var monitor = respawn(['node', 'server.js'], {
	env: {ENV_VAR:'test'}, // set env vars
	cwd: '.',              // set cwd
	maxRestarts:10,        // how many restarts are allowed within 60s
	                       // or -1 for infinite restarts
	sleep:1000,            // time to sleep between restarts,
	stdio: [...]           // forward stdio options
});

monitor.start(); // spawn and watch
```

Optionally you can specify the command to to spawn in the option map as `command: [...]`

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
monitor.stop();
monitor.start();

// hard restart (wait for old process to die)
monitor.stop(function() {
	monitor.start();
});
```

## License

MIT
