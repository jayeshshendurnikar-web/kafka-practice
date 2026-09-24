import { Router } from 'express';
import { createOrder, getOrderById, listOrders } from '../services/orderService.js';

export const ordersRouter = Router();

// Create new order
ordersRouter.post('/', async (req, res) => {
  const body = req.body || {};

  // Support both nested { customer: { name, email } } and flat { name, email }
  const customer = body.customer || {
    name: body.name,
    email: body.email,
    phone: body.phone != null ? String(body.phone) : '',
  };

  const items = Array.isArray(body.items)
    ? body.items
    : body.item
    ? [body.item]
    : body.name && body.price
    ? [{ productId: 'PROD-1', name: body.name, price: Number(body.price), quantity: 1 }]
    : [];

  if (!customer?.name || !customer?.email) {
    return res.status(400).json({
      status: 'error',
      message: 'Customer name and email are required (e.g., inside customer: { name, email } or top-level)',
      exampleBody: {
        customer: {
          name: 'Jayesh',
          email: 'jayesh@example.com',
          phone: '9876543210',
        },
        items: [
          {
            productId: 'P1',
            name: 'Mechanical Keyboard',
            price: 99.99,
            quantity: 1,
          },
        ],
      },
    });
  }

  if (items.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Order must contain at least one item in the items array',
      exampleBody: {
        customer: {
          name: customer.name,
          email: customer.email,
        },
        items: [
          {
            productId: 'PROD-101',
            name: 'Sample Item',
            price: 50.0,
            quantity: 1,
          },
        ],
      },
    });
  }

  try {
    const order = await createOrder({ customer, items, paymentApproved: body.paymentApproved });
    return res.status(201).json({
      status: 'success',
      message: 'Order created and payment processing initiated',
      data: order,
    });
  } catch (error) {
    console.error('[OrdersRoute] Failed to create order:', error);
    return res.status(error instanceof TypeError || error.name === 'ValidationError' ? 400 : 500).json({
      status: 'error',
      message: error.message || 'Internal server error while creating order',
    });
  }
});

// List recent orders
ordersRouter.get('/', async (req, res) => {
  try {
    const { limit, skip, status } = req.query;
    const orders = await listOrders({ limit, skip, status });
    return res.status(200).json({
      status: 'success',
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error('[OrdersRoute] Failed to fetch orders:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve orders',
    });
  }
});

// Get order by orderId
ordersRouter.get('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await getOrderById(orderId);

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: `Order with ID '${orderId}' not found`,
      });
    }

    return res.status(200).json({
      status: 'success',
      data: order,
    });
  } catch (error) {
    console.error('[OrdersRoute] Failed to get order:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve order',
    });
  }
});
