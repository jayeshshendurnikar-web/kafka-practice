import { createKafkaConsumer, stopKafkaConsumer } from '../config/kafka.js';

export const startConsumer = async (
  handleMessage,
  { topic, groupId, fromBeginning = true } = {},
) => {
  if (typeof handleMessage !== 'function') {
    throw new TypeError('A message handler is required');
  }
  if (typeof topic !== 'string' || !topic.trim()) {
    throw new TypeError('A non-empty topic is required');
  }

  const consumer = await createKafkaConsumer(groupId);
  let timeoutId;
  let removeGroupListener;

  try {
    await consumer.subscribe({ topic, fromBeginning });
    const groupJoined = new Promise((resolve, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Kafka consumer group join timed out')), 30000);
      removeGroupListener = consumer.on(consumer.events.GROUP_JOIN, resolve);
    });

    const running = consumer.run({
      eachMessage: async ({ topic: messageTopic, partition, message }) => {
        const rawValue = message.value?.toString() ?? '';
        let value = rawValue;

        try {
          value = JSON.parse(rawValue);
        } catch {
          // Keep non-JSON messages readable for other producers.
        }

        await handleMessage({
          groupId,
          topic: messageTopic,
          partition,
          offset: message.offset,
          key: message.key?.toString() ?? null,
          value,
        });
      },
    });
    await Promise.all([running, groupJoined]);
    return consumer;
  } catch (error) {
    await stopKafkaConsumer(consumer).catch(() => {});
    throw error;
  } finally {
    clearTimeout(timeoutId);
    removeGroupListener?.();
  }
};
