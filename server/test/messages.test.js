import assert from 'node:assert/strict';
import test from 'node:test';
import { createMessageHandler } from '../routes/messages.js';
import { topics } from '../kafka/topics.js';

const response = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test('publishes a trimmed message and returns its topic', async () => {
  let published;
  const handler = createMessageHandler(async (payload, options) => {
    published = { payload, options };
    return { topic: options.topic };
  });
  const res = response();

  await handler({ body: { message: '  hello Kafka  ' } }, res);

  assert.deepEqual(published, {
    payload: { message: 'hello Kafka' },
    options: { topic: topics.messages.name },
  });
  assert.equal(res.statusCode, 202);
  assert.deepEqual(res.body, { status: 'published', topic: topics.messages.name });
});

test('rejects empty messages without publishing', async () => {
  let calls = 0;
  const handler = createMessageHandler(async () => { calls += 1; });
  const res = response();

  await handler({ body: { message: '   ' } }, res);

  assert.equal(calls, 0);
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: 'message must be a non-empty string' });
});
