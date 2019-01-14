var test = require('tape')
var path = require('path')
var util = require('util')
var respawn = require('../index')

var crash = path.join(__dirname, 'apps', 'crash.js')
var run = path.join(__dirname, 'apps', 'run.js')
var hello = path.join(__dirname, 'apps', 'hello-world.js')
var env = path.join(__dirname, 'apps', 'env.js')
var fork = path.join(__dirname, 'apps', 'fork.js')
var node = process.execPath

test('restart', function(t) {
  t.plan(5)

  var mon = respawn([node, crash], {maxRestarts:1, sleep:1})

  var spawned = 0
  var exited = 0

  mon.on('spawn', function() {
    t.ok(spawned++ < 2, 'less than 2 spawns')
  })

  mon.on('exit', function() {
    t.ok(exited++ < 2, 'less than 2 exits')
  })

  mon.on('stop', function() {
    t.ok(true, 'should stop')
  })

  mon.start()
})

test('infinite restart', function(t) {
  t.plan(1)

  var mon = respawn([node, crash], {maxRestarts:-1, sleep:1})

  var spawned = 0

  mon.on('spawn', function() {
    if (spawned++ > 0) {
      t.ok(true, 'spawn more than once')
      mon.stop()
    }
  })

  mon.start()
})

test('stop', function(t) {
  t.plan(2)

  var mon = respawn([node, crash], {maxRestarts:10, sleep:1})
  var spawned = 0

  mon.on('spawn', function() {
    t.ok(spawned++ < 1, 'only spawn once')
  })

  mon.on('stop', function() {
    t.ok(true, 'should stop')
  })

  mon.start()
  process.nextTick(function() {
    mon.stop()
  })
})

test('stop in spawn', function(t) {
  t.plan(2)

  var mon = respawn([node, crash], {maxRestarts:10, sleep:1})
  var spawned = 0

  mon.on('spawn', function() {
    t.ok(spawned++ < 1, 'only spawn once')
    mon.stop()
  })

  mon.on('stop', function() {
    t.ok(true, 'should stop')
  })

  mon.start()
})

test('stop running', function(t) {
  t.plan(2)

  var mon = respawn([node, crash], {maxRestarts:10, sleep:1})
  var spawned = 0

  mon.on('spawn', function() {
    t.ok(spawned++ < 1, 'only spawn once')
    process.nextTick(function() {
      mon.stop()
    })
  })

  mon.on('stop', function() {
    t.ok(true, 'should stop')
  })

  mon.start()
})

test('start stop start', function(t) {
  t.plan(5)

  var mon = respawn([node, crash], {maxRestarts:1, sleep:1})
  var spawned = 0

  mon.on('spawn', function() {
    t.ok(spawned++ < 4, 'less than 4 spawns')
  })

  mon.once('stop', function() {
    mon.start()
    mon.on('stop', function() {
      t.ok(true, 'should stop')
    })
  })

  mon.start()
})

test('kill right away', function(t) {
  var mon = respawn([node, crash], {maxRestarts:1, sleep:1})
  var spawned = 0

  mon.on('spawn', function() {
    t.ok(spawned++ < 2, 'less than 2 spawns')
  })

  mon.on('stop', function() {
    t.ok(true, 'should stop')
    t.end()
  })

  mon.start()
  process.kill(mon.child.pid)
})

test('kill running', function(t) {
  t.plan(5)

  var mon = respawn([node, crash], {maxRestarts:1, sleep:1})
  var spawned = 0

  mon.on('spawn', function(child) {
    t.ok(spawned++ < 2, 'less than 2 spawns')
    process.nextTick(function() {
      process.kill(child.pid)
    })
  })

  mon.on('stop', function() {
    t.same(spawned, 2, 'spawned twice')
    t.ok(true, 'should stop')
    t.same(mon.status, 'crashed')
  })

  mon.start()
})

test('forward stdio', function(t) {
  t.plan(1)

  var mon = respawn([node, hello], {maxRestarts:1, sleep:1})
  var buf = []

  mon.on('stdout', function(data) {
    buf.push(data)
  })

  mon.on('stop', function() {
    t.same(Buffer.concat(buf).toString('utf-8'), 'hello world\nhello world\n')
  })

  mon.start()
})

test('env', function(t) {
  t.plan(1)

  process.env.TEST_A = 'TEST_A'

  var mon = respawn([node, env], {env:{TEST_B:'TEST_B'}, maxRestarts:1, sleep:1})
  var buf = []

  mon.on('stdout', function(data) {
    buf.push(data)
  })

  mon.on('stop', function() {
    t.same(Buffer.concat(buf).toString('utf-8'), 'TEST_A\nTEST_B\nTEST_A\nTEST_B\n')
  })

  mon.start()
})

test('crash status', function(t) {
  t.plan(2)

  var mon = respawn(['non-existing-program'])

  mon.on('stop', function() {
    t.same(mon.status, 'crashed')
  })

  mon.on('crash', function() {
    t.same(mon.status, 'crashed')
  })

  mon.start()
})

test('stop status', function(t) {
  t.plan(2)

  var mon = respawn([node, run])

  mon.on('stop', function() {
    t.same(mon.status, 'stopped')
  })

  mon.on('spawn', function() {
    mon.stop()
    t.same(mon.status, 'stopping')
  })

  mon.start()
})

test('restart using restart strategy', function (t) {
  var timeouts = [2, 100, 450, 40]
  var mon = respawn([node, crash], { maxRestarts: 5, sleep: timeouts})
  var times = [Date.now()]
  mon.on('sleep', function() {
    times.push(Date.now())
  })
  mon.on('crash', function() {
    times.forEach(function(current, key, times) {
      if (key <= 1) return
      var previous = times[key - 1]
      var timeout = (timeouts[key - 2] || 0) + 100
      var delta = (current - previous)
      var gracePeriod = 75
      t.ok(delta - timeout < gracePeriod, util.format(
        'should trigger shortly after defined timeout. '
      + 'Got %d ms, should have stayed within %d-%d ms',
        delta, timeout, timeout + gracePeriod)
      )
    })
    t.end()
  })
  mon.start()
})

test('restart using restart strategy function', function (t) {
  var timeouts = [50, 100, 200, 400]
  var mon = respawn([node, crash], {
    maxRestarts: 5,
    sleep: function(i) {
      return 50 << (i - 1)
    }
  })
  var times = [Date.now()]
  mon.on('sleep', function() {
    times.push(Date.now())
  })
  mon.on('crash', function() {
    times.forEach(function(current, key, times) {
      if (key <= 1) return
      var previous = times[key - 1]
      var timeout = (timeouts[key - 2] || 0) + 100
      var delta = (current - previous)
      var gracePeriod = 75
      t.ok(delta - timeout < gracePeriod, util.format(
        'should trigger shortly after defined timeout. '
      + 'Got %d ms, should have stayed within %d-%d ms',
        delta, timeout, timeout + gracePeriod)
      )
    })
    t.end()
  })
  mon.start()
})

test('fork', function(t) {
  t.plan(1)

  var mon = respawn([fork], {fork:true, maxRestarts:1, sleep:1})
  var messages = []

  mon.on('message', function(message) {
    messages.push(message)
  })

  mon.on('stop', function() {
    t.deepEqual(messages, [
      {foo: 'bar'},
      {foo: 'bar'}
    ])
  })

  mon.start()
})
