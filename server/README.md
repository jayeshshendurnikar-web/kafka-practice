# Kafka order processing

The Express API creates orders in MongoDB and publishes Kafka events. Payment, notification, and analytics consumers each use their own consumer group.

## Run

Set `MONGODB_URI` in `server/.env`. Start Kafka from the project root if a broker is not already running:

```bash
docker compose --env-file server/.env up -d --wait
```

Start the backend with `cd server && npm run dev` and the frontend in another terminal with `cd client && npm run dev`. Restart the backend after code changes; the current dev command does not watch files. Vite proxies `/api` and `/health` to port 5000.

## Payment choices and flow

```text
POST /api/orders → order-created
                      ├─ order-payment-group → payment-processed
                      │                           ├─ order-notification-group → notification-sent
                      │                           │                              │
                      └───────────────────────────┴──────────────────────────────┘
                                                  ↓
                                       order-analytics-group
                                                  ↓
                                      MongoDB orderanalytics
                                                  ↓
                                      GET /api/analytics → dashboard
```

Example order body:

```json
{
  "customer": { "name": "Alex", "email": "alex@example.com" },
  "items": [{ "productId": "BOOK-1", "name": "Kafka Book", "price": 25, "quantity": 1 }],
  "paymentApproved": false
}
```

- **Yes / `true`:** payment succeeds, then a confirmation notification is sent. The order moves from `PENDING` to `PAID` to `NOTIFIED`.
- **No / `false`:** payment fails with a reason, then a payment-failed notification is sent. The order remains `PAYMENT_FAILED`, including after notification. No successful transaction or paid timestamp is recorded.
- Omitting `paymentApproved` defaults to `true` for existing API clients. Strings such as `"no"` are rejected with HTTP 400.

HTTP 201 means the order was created and its event published. Payment and notification results arrive asynchronously. Both payment outcomes use `payment-processed`; the notification consumer reads the saved payment outcome. Payments and emails are simulated: notifications are logged to the server console and recorded in MongoDB.

## Analytics consumer

`consumer/analyticsConsumer.js` subscribes to `order-created`, `payment-processed`, and `notification-sent` with its own `order-analytics-group`. It receives all three event streams independently of the payment and notification groups. It starts with the other consumers before the HTTP listener and disconnects during shutdown.

`services/analyticsService.js` stores one analytics projection per `orderId` in a separate `orderanalytics` collection. Each topic updates only its own section, so delivery across topics in a different order is safe. Replayed events update the same record rather than incrementing counters. Unique order IDs and atomic upserts prevent duplicate counts across consumer instances.

`GET /api/analytics` aggregates this projection, **not the orders collection**, and returns:

- `totalOrders`, `paymentsCompleted`, `paymentsFailed`, `paymentsPending`, `ordersCancelled`
- `notificationsSent`, `successNotifications`, `failureNotifications`, `notificationsPending`
- `totalRevenue` (successful payments only), `updatedAt` (snapshot time)

The dashboard polls every three seconds. Counts cover all orders observed by the analytics consumer, independently of the recent order feed's 100-order limit. They are eventually consistent: events can reach analytics before or after the other consumers update the order. A new analytics group replays retained Kafka events; events already removed by Kafka retention cannot be recovered from that replay. An existing group resumes its committed offsets. Keep the projection collection and group offsets together; deleting the projection alone does not reset Kafka offsets.

`GET /api/orders` lists recent orders; `GET /api/orders/:orderId` returns the payment result, failure reason, and notification details. The client tracks an order until its notification is sent, including failed payments.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Required | MongoDB connection string |
| `PORT` | `5000` | API port |
| `KAFKA_PORT` | `9092` | Local broker port |
| `KAFKA_BROKERS` | `localhost:${KAFKA_PORT}` | Comma-separated broker addresses |
| `KAFKA_CLIENT_ID` | `kafka-practice-server` | Kafka client name |

Topic definitions are in `kafka/topics.js`; groups are in `kafka/groups.js`. The shared consumer accepts either `topic` or a `topics` array. Handler failures propagate so failed processing is not treated as completed work.

## Checks

```bash
cd server
npm test
npm run test:integration
```

Unit tests cover both payment choices, notification outcomes, retries, analytics subscriptions, validation, and empty analytics. The integration test uses the configured MongoDB with isolated temporary collections and removes them afterward. It verifies more than 100 orders, event reordering, concurrent replay, notification counts, and successful-payment-only revenue; event publication is simulated in that test.

```bash
cd client
npm run lint
npm run build
```
