import mongoose from 'mongoose';

// One projection per order. Each topic owns its own section, so cross-topic
// delivery order and replay cannot erase another stage or double-count it.
const orderAnalyticsSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  order: {
    type: new mongoose.Schema({
      totalAmount: Number,
      status: String,
      createdAt: Date,
    }, { _id: false }),
  },
  payment: {
    type: new mongoose.Schema({
      status: { type: String, enum: ['SUCCESS', 'FAILED'] },
      amount: Number,
      processedAt: Date,
    }, { _id: false }),
  },
  notification: {
    type: new mongoose.Schema({
      sent: Boolean,
      type: String,
      sentAt: Date,
    }, { _id: false }),
  },
}, { timestamps: true, versionKey: false });

export const OrderAnalytics = mongoose.models.OrderAnalytics || mongoose.model('OrderAnalytics', orderAnalyticsSchema);
