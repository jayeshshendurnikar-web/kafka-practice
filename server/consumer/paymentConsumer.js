import { startConsumer } from './consumer.js';
import { topics } from '../kafka/topics.js';
import { groups } from '../kafka/groups.js';
import { processFakePayment } from '../services/paymentService.js';
import { logKafkaEvent } from '../kafka/logger.js';

export const startPaymentConsumer = async () => {
  return startConsumer(
    async (event) => {
      logKafkaEvent(event);
      await processFakePayment(event.value);
    },
    {
      topic: topics.orderCreated.name,
      groupId: groups.orderPayment,
      fromBeginning: true,
    },
  );
};
