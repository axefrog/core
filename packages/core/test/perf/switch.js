require('buba/register')
const Benchmark = require('benchmark');
const {fromArray, map, switchLatest} = require('.././index');
const {reduce} = require('.././combinator/reduce')
const rx = require('rx');
const rxjs = require('@reactivex/rxjs')
const kefir = require('kefir');
const bacon = require('baconjs');
const lodash = require('lodash');
const highland = require('highland');
const xs = require('xstream').default;

const runners = require('./runners');
const kefirFromArray = runners.kefirFromArray;

// Switching n streams, each containing m items.
// Because this creates streams from arrays, it ends up
// behaving like concatMap, but gives a sense of the
// relative overhead introduced by each lib's switching
// combinator.
const mn = runners.getIntArg2(10000, 1000);
const a = build(mn[0], mn[1]);

function build(m, n) {
  const a = new Array(n);
  for(let i = 0; i< a.length; ++i) {
    a[i] = buildArray(i*1000, m);
  }
  return a;
}

function buildArray(base, n) {
  const a = new Array(n);
  for(let i = 0; i< a.length; ++i) {
    a[i] = base + i;
  }
  return a;
}

const suite = Benchmark.Suite('switch ' + mn[0] + ' x ' + mn[1] + ' streams');
const options = {
  defer: true,
  onError: function(e) {
    e.currentTarget.failure = e.error;
  }
};

suite
  .add('most', function(deferred) {
    runners.runMost(deferred, reduce(sum, 0, switchLatest(map(fromArray, fromArray(a)))));
  }, options)
  .add('rx 5', function(deferred) {
    runners.runRx5(deferred,
      rxjs.Observable.from(a).switchMap(
        function(x) {return rxjs.Observable.from(x)}).reduce(sum, 0))
  }, options)
  .add('rx 4', function(deferred) {
    runners.runRx(deferred,
      rx.Observable.fromArray(a).flatMapLatest(
        function(x) {return rx.Observable.fromArray(x)}).reduce(sum, 0));
  }, options)
  .add('xstream', function(deferred) {
    runners.runXstream(deferred, xs.fromArray(a).map(xs.fromArray).flatten().fold(sum, 0).last());
  }, options)
  .add('kefir', function(deferred) {
    runners.runKefir(deferred, kefirFromArray(a).flatMapLatest(kefirFromArray).scan(sum, 0).last());
  }, options)
  .add('bacon', function(deferred) {
    runners.runBacon(deferred, bacon.fromArray(a).flatMapLatest(bacon.fromArray).reduce(0, sum));
  }, options)

runners.runSuite(suite);

function sum(x, y) {
  return x + y;
}

function even(x) {
  return x % 2 === 0;
}

function identity(x) {
  return x;
}
