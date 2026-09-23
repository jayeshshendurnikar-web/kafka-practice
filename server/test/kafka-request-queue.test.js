import assert from 'node:assert/strict';
import test from 'node:test';
import RequestQueue from 'kafkajs/src/network/requestQueue/index.js';

const createQueue = () => new RequestQueue({
  clientId: 'timer-test',
  broker: 'localhost:9092',
  maxInFlightRequests: 1,
  logger: { debug() {} },
});

test('an empty request queue does not schedule expired or negative timers', (t) => {
  t.mock.method(Date, 'now', () => 1000);
  const timeout = t.mock.method(globalThis, 'setTimeout', () => ({}));
  const queue = createQueue();

  for (const throttledUntil of [-1, 500, 1000]) {
    queue.throttledUntil = throttledUntil;
    queue.checkPendingRequests();
    assert.equal(queue.throttleCheckTimeoutId, null);
  }
  assert.equal(timeout.mock.callCount(), 0);
});

test('throttled requests are sent when the throttle expires, then polling stops', (t) => {
  let now = 1000;
  t.mock.method(Date, 'now', () => now);
  const timeout = t.mock.method(globalThis, 'setTimeout', () => ({}));
  const queue = createQueue();
  const send = t.mock.method(queue, 'sendSocketRequest', () => {});
  const request = { correlationId: 1, pendingDuration: 0 };
  queue.pending.push(request);
  queue.throttledUntil = 1250;

  queue.checkPendingRequests();
  queue.checkPendingRequests();
  assert.equal(send.mock.callCount(), 0);
  assert.equal(timeout.mock.callCount(), 1);
  assert.equal(timeout.mock.calls[0].arguments[1], 250);

  now = 1250;
  timeout.mock.calls[0].arguments[0]();
  assert.equal(send.mock.callCount(), 1);
  assert.equal(send.mock.calls[0].arguments[0], request);
  assert.equal(queue.pending.length, 0);
  assert.equal(queue.throttleCheckTimeoutId, null);
  assert.equal(timeout.mock.callCount(), 1);
});

test('requests blocked by the inflight limit still get a positive retry timer', (t) => {
  t.mock.method(Date, 'now', () => 1000);
  const timeout = t.mock.method(globalThis, 'setTimeout', () => ({}));
  const queue = createQueue();
  const send = t.mock.method(queue, 'sendSocketRequest', () => {});
  queue.inflight.set(1, {});
  queue.pending.push({ correlationId: 2, pendingDuration: 0 });

  queue.checkPendingRequests();
  assert.equal(send.mock.callCount(), 0);
  assert.ok(timeout.mock.calls[0].arguments[1] > 0);

  queue.inflight.clear();
  timeout.mock.calls[0].arguments[0]();
  assert.equal(send.mock.callCount(), 1);
  assert.equal(queue.throttleCheckTimeoutId, null);
  assert.equal(timeout.mock.callCount(), 1);
});
