import { Router } from 'express';
import { publishMessage } from '../producer/producer.js';
import { topics } from '../kafka/topics.js';

export const createMessageHandler = (publish = publishMessage) => async (req, res) => {
  const message = req.body?.message;
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message must be a non-empty string' });
  }

  try {
    const { topic } = await publish(
      { message: message.trim() },
      { topic: topics.messages.name },
    );
    return res.status(202).json({ status: 'published', topic });
  } catch (error) {
    console.error('Failed to publish Kafka message:', error);
    return res.status(503).json({ error: 'Kafka publish failed' });
  }
};

export const messagesRouter = Router();
messagesRouter.post('/', createMessageHandler());
