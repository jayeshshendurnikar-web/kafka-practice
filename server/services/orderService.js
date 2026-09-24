import { Order } from '../models/Order.js';
import { publishEvent } from '../producer/producer.js';
import { topics } from '../kafka/topics.js';

export const generateOrderId = () => {
  const timestamp = Date.now();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${timestamp}-${randomSuffix}`;
};

export const calculateTotal = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new TypeError('Order must contain at least one item');
  }
  return items.reduce((sum, item) => {
    const price = Number(item.price);
    const quantity = item.quantity === undefined ? 1 : Number(item.quantity);
    if (!Number.isFinite(price) || price < 0 || !Number.isInteger(quantity) || quantity <= 0) {
      throw new TypeError('Each item must have a valid non-negative price and positive quantity');
    }
    return sum + price * quantity;
  }, 0);
};

export const createOrder = async ({ customer, items, paymentApproved = true }) => {
  if (typeof customer?.name !== 'string' || !customer.name.trim() ||
      typeof customer?.email !== 'string' || !customer.email.trim()) {
    throw new TypeError('Customer name and email are required');
  }
  if (typeof paymentApproved !== 'boolean') {
    throw new TypeError('paymentApproved must be true (Yes) or false (No)');
  }

  const totalAmount = calculateTotal(items);
  if (!Number.isFinite(totalAmount) || items.some((item) => typeof item.name !== 'string' || !item.name.trim())) {
    throw new TypeError('Each item must have a name and the order total must be finite');
  }
  const orderId = generateOrderId();

  const newOrder = await Order.create({
    orderId,
    customer: {
      name: customer.name.trim(),
      email: customer.email.trim(),
      phone: customer.phone ? String(customer.phone).trim() : '',
    },
    items: items.map((item) => ({
      productId: String(item.productId || item.id || `PROD-${Math.random().toString(36).substring(7)}`),
      name: item.name.trim(),
      price: Number(item.price),
      quantity: Number(item.quantity) || 1,
    })),
    totalAmount,
    status: 'PENDING',
    paymentApproved,
  });

  const eventPayload = {
    orderId: newOrder.orderId,
    customer: newOrder.customer,
    items: newOrder.items,
    totalAmount: newOrder.totalAmount,
    status: newOrder.status,
    createdAt: newOrder.createdAt,
    paymentApproved: newOrder.paymentApproved,
  };

  console.log(`\n📦 ==================== [1. ORDER SERVICE: ORDER CREATED] ====================`);
  console.log(`Order ID   : ${newOrder.orderId}`);
  console.log(`Customer   : ${newOrder.customer.name} (${newOrder.customer.email})`);
  console.log(`Total      : $${totalAmount.toFixed(2)}`);
  console.log(`Items (${newOrder.items.length})  : ${newOrder.items.map((i) => `${i.name} (x${i.quantity})`).join(', ')}`);
  console.log(`Payment App: ${newOrder.paymentApproved ? 'Approved by user' : 'Declined by user'}`);
  console.log(`Kafka Event: Firing '${topics.orderCreated.name}' with key '${newOrder.orderId}'...`);
  console.log(`============================================================================\n`);

  // Publish event to Kafka with orderId as key for partition ordering
  await publishEvent(topics.orderCreated.name, eventPayload, {
    key: newOrder.orderId,
  });

  return newOrder;
};

export const getOrderById = async (orderId) => {
  if (!orderId || typeof orderId !== 'string') {
    throw new TypeError('A valid orderId is required');
  }
  return Order.findOne({ orderId }).lean();
};

export const listOrders = async ({ limit = 20, skip = 0, status } = {}) => {
  const query = status ? { status } : {};
  return Order.find(query)
    .sort({ createdAt: -1 })
    .skip(Number(skip) || 0)
    .limit(Math.min(Number(limit) || 20, 100))
    .lean();
};
