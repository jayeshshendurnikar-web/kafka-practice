export const topics = Object.freeze({
  orderCreated: Object.freeze({
    name: 'order-created',
    numPartitions: 3,
    replicationFactor: 1,
  }),
  paymentProcessed: Object.freeze({
    name: 'payment-processed',
    numPartitions: 3,
    replicationFactor: 1,
  }),
  notificationSent: Object.freeze({
    name: 'notification-sent',
    numPartitions: 3,
    replicationFactor: 1,
  }),
});
