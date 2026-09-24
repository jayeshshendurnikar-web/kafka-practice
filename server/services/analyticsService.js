import { OrderAnalytics } from "../models/OrderAnalytics.js";
import { topics } from "../kafka/topics.js";

export const recordAnalyticsEvent = async (
  { topic, value },
  analytics = OrderAnalytics,
) => {
  if (typeof value?.orderId !== "string" || !value.orderId.trim()) {
    console.warn(`⚠️ [AnalyticsService] Skipping malformed message on topic '${topic}': missing valid orderId`);
    return;
  }
  let update;
  if (topic === topics.orderCreated.name) {
    update = {
      order: {
        totalAmount: value.totalAmount,
        status: value.status,
        createdAt: value.createdAt,
      },
    };
  } else if (topic === topics.paymentProcessed.name) {
    const status =
      value.paymentStatus ||
      (value.status === "PAYMENT_FAILED"
        ? "FAILED"
        : value.status === "PAID"
          ? "SUCCESS"
          : null);
    if (!["SUCCESS", "FAILED"].includes(status)) {
      console.warn(`⚠️ [AnalyticsService] Skipping invalid payment outcome on order ${value.orderId}:`, status);
      return;
    }
    if (!Number.isFinite(value.totalAmount) || value.totalAmount < 0) {
      console.warn(`⚠️ [AnalyticsService] Skipping invalid payment amount on order ${value.orderId}:`, value.totalAmount);
      return;
    }
    update = {
      payment: {
        status,
        amount: value.totalAmount,
        processedAt: value.processedAt || value.paidAt,
      },
    };
  } else if (topic === topics.notificationSent.name) {
    if (value.status !== "SENT") {
      console.warn(`⚠️ [AnalyticsService] Skipping unsent notification on order ${value.orderId}:`, value.status);
      return;
    }
    update = {
      notification: { sent: true, type: value.type, sentAt: value.sentAt },
    };
  } else {
    console.warn(`⚠️ [AnalyticsService] Unsupported topic: ${topic}`);
    return;
  }

  // Upsert stage facts, not counters: repeats are harmless and topics may arrive in any order.
  const filter = { orderId: value.orderId };
  try {
    await analytics.updateOne(
      filter,
      { $set: update },
      { upsert: true, runValidators: true },
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
    // Another consumer instance may have inserted this order from a different topic.
    await analytics.updateOne(
      filter,
      { $set: update },
      { runValidators: true },
    );
  }

  console.log(`\n📊 ==================== [4. ANALYTICS SERVICE: RECORDED] ====================`);
  console.log(`Order ID   : ${value.orderId}`);
  console.log(`Topic      : ${topic}`);
  console.log(`Action     : Updated live stage metrics in MongoDB OrderAnalytics`);
  console.log(`==============================================================================\n`);
};

const countWhen = (condition) => ({ $sum: { $cond: [condition, 1, 0] } });
const paid = { $eq: ["$payment.status", "SUCCESS"] };
const failed = { $eq: ["$payment.status", "FAILED"] };
const sent = { $eq: ["$notification.sent", true] };

// Read only the analytics consumer's projection, independently of the orders service.
export const getAnalytics = async (analytics = OrderAnalytics) => {
  const [totals] = await analytics.aggregate([
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        paymentsCompleted: countWhen(paid),
        paymentsFailed: countWhen(failed),
        paymentsPending: countWhen({
          $and: [
            { $eq: [{ $ifNull: ["$payment.status", null] }, null] },
            { $ne: ["$order.status", "CANCELLED"] },
          ],
        }),
        ordersCancelled: countWhen({ $eq: ["$order.status", "CANCELLED"] }),
        notificationsSent: countWhen(sent),
        successNotifications: countWhen({ $and: [sent, paid] }),
        failureNotifications: countWhen({ $and: [sent, failed] }),
        notificationsPending: countWhen({
          $and: [
            { $or: [paid, failed] },
            { $ne: ["$notification.sent", true] },
          ],
        }),
        totalRevenue: { $sum: { $cond: [paid, "$payment.amount", 0] } },
      },
    },
    { $project: { _id: 0 } },
  ]);

  return {
    totalOrders: 0,
    paymentsCompleted: 0,
    paymentsFailed: 0,
    paymentsPending: 0,
    ordersCancelled: 0,
    notificationsSent: 0,
    successNotifications: 0,
    failureNotifications: 0,
    notificationsPending: 0,
    totalRevenue: 0,
    ...totals,
    updatedAt: new Date().toISOString(),
  };
};
