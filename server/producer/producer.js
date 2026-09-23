import { getKafkaProducer } from '../config/kafka.js';

export const publishMessage = async (payload, { topic, key } = {}) => {
  if (typeof topic !== 'string' || !topic.trim()) {
    throw new TypeError('A non-empty topic is required');
  }

  const value = typeof payload === 'string' ? payload : JSON.stringify(payload);
  if (!value) {
    throw new TypeError('Kafka message must have a value');
  }

  const metadata = await getKafkaProducer().send({
    topic,
    messages: [{ value, ...(key == null ? {} : { key }) }],
  });

  return { topic, metadata };
};
