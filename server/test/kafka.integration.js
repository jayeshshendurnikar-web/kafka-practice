import assert from 'node:assert/strict';
import test from 'node:test';

import {
  connectKafka,
  disconnectKafka,
  ensureKafkaTopics,
} from '../config/kafka.js';
import { topics } from '../kafka/topics.js';
import { publishMessage } from '../producer/producer.js';
import { startConsumer } from '../consumer/consumer.js';

test('publishes a message to two independent consumer groups', { timeout: 30000 }, async () => {
  await connectKafka();
  try {
    await ensureKafkaTopics(Object.values(topics));

    const expected = `integration-${process.pid}-${Date.now()}`;
    const groupId = `kafka-practice-test-${expected}`;
    const topic = topics.messages.name;
    let resolveMessage;
    const received = new Promise((resolve) => { resolveMessage = resolve; });
    let resolveSecondMessage;
    const receivedBySecondGroup = new Promise((resolve) => { resolveSecondMessage = resolve; });
    await startConsumer(({ value }) => {
      if (value?.message === expected) resolveMessage(value);
    }, { topic, groupId });
    await startConsumer(({ value }) => {
      if (value?.message === expected) resolveSecondMessage(value);
    }, { topic, groupId: `${groupId}-second` });

    const result = await publishMessage({ message: expected }, { topic });
    assert.equal(result.topic, topics.messages.name);

    let timeoutId;
    const timeout = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Consumer did not receive the message')), 10000);
    });
    try {
      assert.deepEqual(
        await Promise.race([Promise.all([received, receivedBySecondGroup]), timeout]),
        [{ message: expected }, { message: expected }],
      );
    } finally {
      clearTimeout(timeoutId);
    }
  } finally {
    await disconnectKafka();
  }
});
