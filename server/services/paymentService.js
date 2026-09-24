import { randomUUID } from 'node:crypto';
import { Order } from '../models/Order.js';
import { publishEvent } from '../producer/producer.js';
import { topics } from '../kafka/topics.js';

export const createPaymentProcessor = ({ orders = Order, publish = publishEvent } = {}) => async (orderData) => {
  const { orderId } = orderData || {};
  if (!orderId) throw new TypeError('Payment event requires an orderId');

  // Use the persisted choice and amount; replay must not change a payment result.
  const order = await orders.findOne({ orderId }).lean();
  if (!order) throw new Error(`Payment order not found: ${orderId}`);
  const approved = order.paymentApproved !== false;
  const processedAt = new Date();
  const payment = {
    status: approved ? 'SUCCESS' : 'FAILED',
    amount: order.totalAmount,
    processedAt,
    ...(approved
      ? { transactionId: `TXN-${randomUUID()}`, paidAt: processedAt }
      : { failureReason: 'Payment declined: you selected No. No money was charged.' }),
  };
  const updated = await orders.findOneAndUpdate(
    { orderId, payment: null },
    { $set: { status: approved ? 'PAID' : 'PAYMENT_FAILED', payment } },
    { new: true },
  ).lean() || await orders.findOne({ orderId }).lean();
  if (!updated?.payment) throw new Error(`Payment result missing for ${orderId}`);

  const result = updated.payment;
  const paymentEvent = {
    orderId,
    customer: updated.customer,
    totalAmount: updated.totalAmount,
    status: result.status === 'FAILED' ? 'PAYMENT_FAILED' : 'PAID',
    paymentStatus: result.status,
    transactionId: result.transactionId,
    paidAt: result.paidAt,
    processedAt: result.processedAt,
    failureReason: result.failureReason,
  };

  console.log(`\n💳 ==================== [2. PAYMENT SERVICE: PROCESSED] ====================`);
  console.log(`Order ID   : ${orderId}`);
  console.log(`Amount     : $${updated.totalAmount}`);
  console.log(`Status     : ${result.status === 'SUCCESS' ? '✅ SUCCESS (Paid)' : '❌ DECLINED (Failed)'}`);
  if (result.status === 'SUCCESS') {
    console.log(`Txn ID     : ${result.transactionId}`);
  } else {
    console.log(`Reason     : ${result.failureReason}`);
  }
  console.log(`Kafka Event: Firing '${topics.paymentProcessed.name}' with key '${orderId}'...`);
  console.log(`============================================================================\n`);

  // Both outcomes reach the notification consumer. Republish on retry if a previous send failed.
  await publish(topics.paymentProcessed.name, paymentEvent, { key: orderId });
  return paymentEvent;
};

export const processFakePayment = createPaymentProcessor();
