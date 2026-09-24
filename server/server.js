import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { connectDB, disconnectDB } from './config/db.js';
import { connectKafka, disconnectKafka, ensureKafkaTopics } from './config/kafka.js';
import { topics } from './kafka/topics.js';
import { startPaymentConsumer } from './consumer/paymentConsumer.js';
import { startNotificationConsumer } from './consumer/notificationConsumer.js';
import { ordersRouter } from './routes/orders.js';
import { analyticsRouter } from './routes/analytics.js';
import { startAnalyticsConsumer } from './consumer/analyticsConsumer.js';
import { OrderAnalytics } from './models/OrderAnalytics.js';

const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/orders', ordersRouter);
app.use('/api/analytics', analyticsRouter);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'order-management-service',
    timestamp: new Date().toISOString(),
  });
});

const startServer = async () => {
  try {
    // 1. Connect MongoDB
    await connectDB();
    await OrderAnalytics.init();

    // 2. Connect Kafka & ensure topics
    await connectKafka();
    console.log('Connected to Kafka producer');
    await ensureKafkaTopics(Object.values(topics));
    console.log('Kafka topics verified / created:', Object.values(topics).map((t) => t.name));

    // 3. Start decoupled consumers (Skip if running in Producer/API-only mode)
    if (process.env.START_CONSUMERS !== 'false') {
      await startPaymentConsumer();
      await startNotificationConsumer();
      await startAnalyticsConsumer();
      console.log('Order event consumers started successfully');
    } else {
      console.log('⚡ [PRODUCER MODE] Running Express API only. Consumers run in their own terminal.');
    }

    // 4. Start HTTP Server
    const server = await new Promise((resolve, reject) => {
      const listener = app.listen(config.port);
      listener.once('error', reject);
      listener.once('listening', () => {
        listener.off('error', reject);
        resolve(listener);
      });
    });

    console.log(`🚀 Order Management Server running on port ${config.port}`);

    // Graceful Shutdown
    let isShuttingDown = false;
    const shutdown = async (signal) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      console.log(`\nReceived ${signal}. Initiating graceful shutdown...`);

      try {
        await new Promise((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        });
        console.log('HTTP server closed');
      } catch (error) {
        console.error('HTTP server close error:', error);
      }

      const results = await Promise.allSettled([disconnectKafka(), disconnectDB()]);
      for (const res of results) {
        if (res.status === 'rejected') {
          console.error('Shutdown cleanup error:', res.reason);
        }
      }
      console.log('Graceful shutdown completed');
      process.exit(0);
    };

    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('Server startup failed:', error);
    await Promise.allSettled([disconnectKafka(), disconnectDB()]);
    process.exit(1);
  }
};

startServer();
