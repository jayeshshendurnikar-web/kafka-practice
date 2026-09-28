import { Order } from "../models/Order.js";
import { publishEvent } from "../producer/producer.js";
import { topics } from "../kafka/topics.js";

export const createNotificationSender =
  ({ orders = Order, publish = publishEvent, log = console.log } = {}) =>
    async (paymentData) => {
      const { orderId } = paymentData || {};
      if (!orderId) throw new TypeError("Notification event requires an orderId");
      const order = await orders.findOne({ orderId }).lean();
      if (!order?.payment)
        throw new Error(`Payment result not found for ${orderId}`);

      const failed = order.payment.status === "FAILED";
      const notification = {
        sent: true,
        channel: "EMAIL",
        sentAt: new Date(),
        recipient: order.customer.email,
        type: failed ? "PAYMENT_FAILED" : "PAYMENT_SUCCESS",
        message: failed
          ? `Payment failed for order ${orderId}. ${order.payment.failureReason}`
          : `Order ${orderId} confirmed. Payment received ($${order.payment.amount.toFixed(2)}).`,
      };
      const updated = await orders
        .findOneAndUpdate(
          { orderId, "notification.sent": { $ne: true } },
          {
            $set: {
              status: failed ? "PAYMENT_FAILED" : "NOTIFIED",
              notification,
            },
          },
          { new: true },
        )
        .lean();
      // This app simulates delivery in the console. Only the first delivery is logged and counted.
      if (updated)
        log(
          `[FAKE EMAIL SENT] To: ${notification.recipient}\n${notification.message}`,
        );
      const stored = updated || (await orders.findOne({ orderId }).lean());
      if (!stored?.notification?.sent)
        throw new Error(`Notification result missing for ${orderId}`);
      const notificationEvent = {
        orderId,
        ...stored.notification,
        status: "SENT",
      };
      await publish(topics.notificationSent.name, notificationEvent, {
        key: orderId,
      });
      return notificationEvent;
    };

export const sendFakeNotification = createNotificationSender();
