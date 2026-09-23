import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

export const config = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI,
  kafka: {
    clientId: process.env.KAFKA_CLIENT_ID || 'kafka-practice-server',
    brokers: (process.env.KAFKA_BROKERS || `localhost:${process.env.KAFKA_PORT || '9092'}`)
      .split(',')
      .map((broker) => broker.trim())
      .filter(Boolean),
  },
};
