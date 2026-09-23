import { createKafkaConsumer, stopKafkaConsumer } from '../config/kafka.js';

export const startConsumer = async (
  handleAnalytics,
  { topic, groupId, fromBeginning = true } = {},
) => {
  if (typeof handleAnalytics !== 'function') {
    throw new TypeError('A analytics handler is required');
  }
  
  if (typeof topic !== 'string' || !topic.trim()) {
    throw new TypeError('A non-empty topic is required');
  }

  const analyticsConsumer = await createKafkaConsumer(groupId);
  let timeoutId;
  let removeGroupListener;

  try {
    await analyticsConsumer.subscribe({ topic, fromBeginning });
    const groupJoined = new Promise((resolve, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Kafka consumer group join timed out')), 30000);
      removeGroupListener = analyticsConsumer.on(analyticsConsumer.events.GROUP_JOIN, resolve);
    });

    const running = analyticsConsumer.run({
      eachMessage: async ({ topic: messageTopic, partition, message }) => {
        const rawValue = message.value?.toString() ?? '';
        let value = rawValue;

        try {
          value = JSON.parse(rawValue);
        } catch {
          // Keep non-JSON messages readable for other producers.
        }

        await handleAnalytics({
          topic: messageTopic,
          partition,
          offset: message.offset,
          key: message.key?.toString() ?? null,
          value,
        });
      },
    });
    await Promise.all([running, groupJoined]);
    return analyticsConsumer;
  } catch (error) {
    await stopKafkaConsumer(analyticsConsumer).catch(() => {});
    throw error;
  } finally {
    clearTimeout(timeoutId);
    removeGroupListener?.();
  }
};
