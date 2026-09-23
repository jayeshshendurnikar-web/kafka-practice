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
    if (isNaN(price) || price < 0 || isNaN(quantity) || quantity <= 0) {
      throw new TypeError('Each item must have a valid non-negative price and positive quantity');
    }
    return sum + price * quantity;
  }, 0);
};

export const createOrder = async ({ customer, items }) => {
  if (!customer?.name || !customer?.email) {
    throw new TypeError('Customer name and email are required');
  }

  const totalAmount = calculateTotal(items);
  const orderId = generateOrderId();

  const newOrder = await Order.create({
    orderId,
    customer: {
      name: customer.name.trim(),
      email: customer.email.trim(),
      phone: customer.phone ? customer.phone.trim() : '',
    },
    items: items.map((item) => ({
      productId: String(item.productId || item.id || `PROD-${Math.random().toString(36).substring(7)}`),
      name: item.name.trim(),
      price: Number(item.price),
      quantity: Number(item.quantity) || 1,
    })),
    totalAmount,
    status: 'PENDING',
  });

  const eventPayload = {
    orderId: newOrder.orderId,
    customer: newOrder.customer,
    items: newOrder.items,
    totalAmount: newOrder.totalAmount,
    status: newOrder.status,
    createdAt: newOrder.createdAt,
  };

  // Publish event to Kafka with orderId as key for partition ordering
  await publishEvent(topics.orderCreated.name, eventPayload, {
    key: newOrder.orderId,
  });

  console.log(`[OrderService] Order created & published to Kafka: ${newOrder.orderId} (Amount: $${totalAmount})`);
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
