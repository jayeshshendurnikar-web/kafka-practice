import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: false },
);

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const paymentDetailsSchema = new mongoose.Schema(
  {
    transactionId: { type: String, trim: true },
    status: { type: String, enum: ['SUCCESS', 'FAILED'], default: 'SUCCESS' },
    amount: { type: Number },
    paidAt: { type: Date },
    failureReason: { type: String },
  },
  { _id: false },
);

const notificationDetailsSchema = new mongoose.Schema(
  {
    sent: { type: Boolean, default: false },
    channel: { type: String, enum: ['EMAIL', 'SMS'], default: 'EMAIL' },
    sentAt: { type: Date },
    recipient: { type: String },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    customer: {
      type: customerSchema,
      required: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'Order must contain at least one item',
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'PAYMENT_FAILED', 'NOTIFIED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    payment: {
      type: paymentDetailsSchema,
      default: null,
    },
    notification: {
      type: notificationDetailsSchema,
      default: () => ({ sent: false, channel: 'EMAIL' }),
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
