import { Kafka, Partitioners } from 'kafkajs';
import { config } from './index.js';

const kafka = new Kafka({
  clientId: config.kafka.clientId,
  brokers: config.kafka.brokers,
  retry: { retries: 3 },
});

export const ensureKafkaTopics = async (definitions) => {
  if (!Array.isArray(definitions)) {
    throw new TypeError('Topic definitions must be an array');
  }
  if (definitions.length === 0) return;

  const admin = kafka.admin();
  await admin.connect();
  try {
    const existing = new Set(await admin.listTopics());
    const missing = definitions
      .filter(({ name }) => !existing.has(name))
      .map(({ name, numPartitions, replicationFactor }) => ({
        topic: name,
        numPartitions,
        replicationFactor,
      }));

    if (missing.length > 0) {
      await admin.createTopics({
        topics: missing,
        waitForLeaders: true,
      });
    }
  } finally {
    await admin.disconnect();
  }
};

let producer = null;
const consumers = new Set();

export const connectKafka = async () => {
  if (producer) return producer;

  const nextProducer = kafka.producer({
    createPartitioner: Partitioners.DefaultPartitioner,
  });

  try {
    await nextProducer.connect();
    producer = nextProducer;
    return producer;
  } catch (error) {
    await nextProducer.disconnect().catch(() => {});
    throw error;
  }
};

export const createKafkaConsumer = async (groupId) => {
  if (typeof groupId !== 'string' || !groupId.trim()) {
    throw new TypeError('A non-empty groupId is required');
  }
  const consumer = kafka.consumer({ groupId });
  try {
    await consumer.connect();
    consumers.add(consumer);
    return consumer;
  } catch (error) {
    await consumer.disconnect().catch(() => {});
    throw error;
  }
};

export const stopKafkaConsumer = async (consumer) => {
  try {
    await consumer.disconnect();
  } finally {
    consumers.delete(consumer);
  }
};

export const disconnectKafka = async () => {
  const activeProducer = producer;
  const activeConsumers = [...consumers];
  producer = null;
  consumers.clear();

  const results = await Promise.allSettled(
    [activeProducer, ...activeConsumers]
      .filter(Boolean)
      .map((client) => client.disconnect()),
  );
  const failure = results.find((result) => result.status === 'rejected');
  if (failure) {
    throw failure.reason;
  }
};

export const getKafkaProducer = () => {
  if (!producer) {
    throw new Error('Kafka producer is not connected');
  }
  return producer;
};
