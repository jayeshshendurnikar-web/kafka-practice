import assert from 'node:assert/strict';
import test from 'node:test';
import { publishMessage } from '../producer/producer.js';
import { startConsumer } from '../consumer/consumer.js';

test('publishing requires an explicit topic', async () => {
  await assert.rejects(publishMessage({ message: 'hello' }), /topic is required/);
  await assert.rejects(publishMessage('hello', { topic: ' ' }), /topic is required/);
});

test('subscribing requires an explicit topic and group', async () => {
  const handler = async () => {};
  await assert.rejects(startConsumer(handler, { groupId: 'workers' }), /topic is required/);
  await assert.rejects(startConsumer(handler, { topic: 'messages' }), /groupId is required/);
  await assert.rejects(
    startConsumer(handler, { topic: 'messages', groupId: ' ' }),
    /groupId is required/,
  );
});

test('subscribing rejects a missing handler before connecting', async () => {
  await assert.rejects(
    startConsumer(undefined, { topic: 'messages', groupId: 'workers' }),
    /message handler is required/,
  );
});
