import { startConsumer } from './consumer.js';
import { topics } from '../kafka/topics.js';
import { groups } from '../kafka/groups.js';
import { sendFakeNotification } from '../services/notificationService.js';
import { logKafkaEvent } from '../kafka/logger.js';

export const startNotificationConsumer = async () => {
  return startConsumer(
    async (event) => {
      logKafkaEvent(event);
      await sendFakeNotification(event.value);
    },
    {
      topic: topics.paymentProcessed.name,
      groupId: groups.orderNotification,
      fromBeginning: true,
    },
  );
};
