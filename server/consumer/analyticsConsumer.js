import { startConsumer } from './consumer.js';
import { topics } from '../kafka/topics.js';
import { groups } from '../kafka/groups.js';
import { recordAnalyticsEvent } from '../services/analyticsService.js';
import { logKafkaEvent } from '../kafka/logger.js';

export const startAnalyticsConsumer = (subscribe = startConsumer) => subscribe(
  async (event) => {
    logKafkaEvent(event);
    await recordAnalyticsEvent(event);
  },
  {
    topics: [topics.orderCreated.name, topics.paymentProcessed.name, topics.notificationSent.name],
    groupId: groups.orderAnalytics,
    fromBeginning: true,
  },
);
