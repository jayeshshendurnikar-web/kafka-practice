import { Order } from '../models/Order.js';
import { publishEvent } from '../producer/producer.js';
import { topics } from '../kafka/topics.js';

export const processFakePayment = async (orderData) => {
  const { orderId, totalAmount, customer } = orderData || {};

  if (!orderId) {
    console.warn('[PaymentService] Skipped processing: missing orderId');
    return null;
  }

  console.log(`[PaymentService] Processing fake payment for Order: ${orderId}, Amount: $${totalAmount}`);

  // Simulate payment processing latency (e.g., 300ms)
  await new Promise((resolve) => setTimeout(resolve, 300));

  const transactionId = `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const paidAt = new Date();

  // Update order in MongoDB
  const updatedOrder = await Order.findOneAndUpdate(
    { orderId },
    {
      $set: {
        status: 'PAID',
        payment: {
          transactionId,
          status: 'SUCCESS',
          amount: totalAmount,
          paidAt,
        },
      },
    },
    { new: true },
  ).lean();

  if (!updatedOrder) {
    console.error(`[PaymentService] Order not found in database: ${orderId}`);
    return null;
  }

  console.log(`[PaymentService] Fake payment successful for Order: ${orderId}. Txn: ${transactionId}`);

  // Publish payment-processed event to Kafka
  const paymentEvent = {
    orderId,
    transactionId,
    totalAmount,
    customer,
    status: 'PAID',
    paidAt,
  };

  await publishEvent(topics.paymentProcessed.name, paymentEvent, {
    key: orderId,
  });

  return paymentEvent;
};
