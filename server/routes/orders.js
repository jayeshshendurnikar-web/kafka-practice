import { Router } from 'express';
import { createOrder, getOrderById, listOrders } from '../services/orderService.js';

export const ordersRouter = Router();

// Create new order
ordersRouter.post('/', async (req, res) => {
  const { customer, items } = req.body || {};

  if (!customer || !customer.name || !customer.email) {
    return res.status(400).json({
      status: 'error',
      message: 'Customer name and email are required',
    });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Order must contain at least one item',
    });
  }

  try {
    const order = await createOrder({ customer, items });
    return res.status(201).json({
      status: 'success',
      message: 'Order created and payment processing initiated',
      data: order,
    });
  } catch (error) {
    console.error('[OrdersRoute] Failed to create order:', error);
    return res.status(500).json({
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
