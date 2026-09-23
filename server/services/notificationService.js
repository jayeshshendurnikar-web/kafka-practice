import { Order } from '../models/Order.js';
import { publishEvent } from '../producer/producer.js';
import { topics } from '../kafka/topics.js';

export const sendFakeNotification = async (paymentData) => {
  const { orderId, customer, transactionId, totalAmount } = paymentData || {};

  if (!orderId) {
    console.warn('[NotificationService] Skipped notification: missing orderId');
    return null;
  }

  const recipient = customer?.email || 'customer@example.com';
  const sentAt = new Date();

  console.log(`\n======================================================`);
  console.log(` 📧 [FAKE NOTIFICATION SENT - EMAIL]`);
  console.log(` To:      ${customer?.name || 'Customer'} <${recipient}>`);
  console.log(` Subject: Order ${orderId} Confirmed! Payment Received ($${totalAmount})`);
  console.log(` Details: Transaction ID ${transactionId}`);
  console.log(`======================================================\n`);

  // Update order in MongoDB with notification status
  const updatedOrder = await Order.findOneAndUpdate(
    { orderId },
    {
      $set: {
        status: 'NOTIFIED',
        notification: {
          sent: true,
          channel: 'EMAIL',
          sentAt,
          recipient,
        },
      },
    },
    { new: true },
  ).lean();

  const notificationEvent = {
    orderId,
    recipient,
    channel: 'EMAIL',
    sentAt,
    status: 'SENT',
  };

  // Publish notification-sent event to Kafka
  await publishEvent(topics.notificationSent.name, notificationEvent, {
    key: orderId,
  });

  return notificationEvent;
};
