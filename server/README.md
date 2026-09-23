# Kafka practice server

This project has one HTTP API, one shared Kafka producer, and two independent consumers (message logger and analytics) for the `practice-messages` topic. MongoDB and Kafka must be reachable before the HTTP server starts.

## Run it

Put your MongoDB connection string in `server/.env` as `MONGODB_URI`. The other settings in `.env.example` are optional defaults.

Start the Docker broker from the project root if nothing else is using port 9092:

```bash
docker compose --env-file server/.env up -d --wait
```

If a Kafka Docker container is already running on port 9092, use that broker and skip the Compose command. Start Node in another terminal:

```bash
cd server
npm install
npm run dev
```

The server connects to MongoDB and Kafka, creates any missing topics listed in `kafka/topics.js`, starts its consumers, then listens on port 5000. If port 5000 is occupied, set `PORT` in `server/.env` and restart Node.

## Send a request

In Postman, choose `POST`, set the URL to `http://localhost:5000/api/messages`, and select **Body → raw → JSON**:

```json
{"message":"hello Kafka"}
```

Or use curl:

```bash
curl -X POST http://localhost:5000/api/messages \
  -H 'Content-Type: application/json' \
  -d '{"message":"hello Kafka"}'
```

The route validates `message`, calls `publishMessage`, and returns HTTP 202 after Kafka accepts the record. Both consumers use the shared logger in `kafka/logger.js` and print the received topic and value, prefixed with their group ID, in either order:

```text
[kafka-practice.messages.logger] Consumed from practice-messages: { message: 'hello Kafka' }
[kafka-practice.messages.analytics] Consumed from practice-messages: { message: 'hello Kafka' }
```

The route also accepts a trailing `/`.

The request flow is `Postman → Express route → shared producer → Kafka topic → consumer → logMessage`. HTTP 202 confirms the publish; consumer processing happens independently and might complete before or after the response.

## Configuration

`server/config/index.js` loads `server/.env`. Its settings are:

| Variable | Default | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | none | Required MongoDB connection string. |
| `PORT` | `5000` | HTTP server port. |
| `KAFKA_PORT` | `9092` | Host port used by Docker Compose and the default Node broker address. |
| `KAFKA_BROKERS` | `localhost:${KAFKA_PORT}` | Comma-separated broker addresses; overrides the default address. |
| `KAFKA_CLIENT_ID` | `kafka-practice-server` | Name Kafka uses to identify this application client. |

Topic names and their creation settings live in `server/kafka/topics.js`. Consumer group IDs live in `server/kafka/groups.js`. Neither topic names nor group IDs are read from `.env`.

`publishMessage(payload, { topic, key })` requires a topic. `startConsumer(handler, { topic, groupId, fromBeginning })` requires both a topic and a group ID. The generic helpers do not import either registry; routes and application startup choose the topic, group, and handler. Logging is centralized in `server/kafka/logger.js`; the message and analytics handler modules re-export that same function. Change the log format there to update both consumers.

Edit the registries to change names or add new entries. Changing a topic name creates a new topic on the next startup; it does not rename or delete the old Kafka topic. Changing a group ID creates a different subscriber with its own offsets. Restart the Node server after changing code or `.env`.

## Add a topic

Add an entry to the exported `topics` object in `server/kafka/topics.js`:

```js
orders: Object.freeze({
  name: 'orders',
  numPartitions: 3,
  replicationFactor: 1,
}),
```

Put it inside `Object.freeze({ ... })`, beside `messages`. On the next server start, `ensureKafkaTopics(Object.values(topics))` creates the `orders` topic if it does not exist. The single Docker broker supports replication factor `1`. The registry does not alter an existing topic's partition count or replication factor.

`numPartitions` is the number of independent ordered logs in the topic. One partition gives one ordered stream and at most one active consumer in each group for that topic. Three partitions can be assigned to up to three consumers in the same group. A producer `key` keeps records with that key on the same partition, preserving their order there. Kafka does not promise ordering across different partitions. Increasing partitions of an existing topic needs a separate admin operation and can change the partition chosen for a key.

## Publish to the new topic

The same connected producer can publish to any topic. Put a small wrapper in a new producer file if you want a reusable operation:

```js
import { publishMessage } from './producer.js';
import { topics } from '../kafka/topics.js';

export const publishOrder = (order) =>
  publishMessage(order, {
    topic: topics.orders.name,
    key: String(order.id),
  });
```

Call `publishOrder(order)` from a route or service. The shared `publishMessage` function converts objects to JSON and sends them with KafkaJS. A second Kafka connection is not needed for each topic.

## Consume the new topic

Add `orders: 'order-workers'` to `server/kafka/groups.js`. Start another consumer after `ensureKafkaTopics(Object.values(topics))` and before `app.listen(...)` in `server/server.js`:

```js
import { topics } from './kafka/topics.js';
import { groups } from './kafka/groups.js';

await startConsumer(
  async ({ value, partition, offset }) => {
    console.log('Processed order:', value, 'at', partition, offset);
  },
  { topic: topics.orders.name, groupId: groups.orders },
);
```

`startConsumer` makes a consumer for that call, subscribes to the selected topic, and waits until its group joins before the HTTP server starts. Its handler receives the group ID, parsed value, topic, partition, offset, and key. The server disconnects all created consumers on shutdown.

Consumers with the **same group ID** share partitions and split the work. Consumers with **different group IDs** each receive the topic's records independently. A new group starts at the earliest retained record by default (`fromBeginning: true`); an existing group resumes from its committed offsets. Pass `fromBeginning: false` only when a new group should skip earlier records.

## One producer, multiple independent consumers

Consumers subscribe to topics. This project registers the message logger and analytics consumer with different group IDs from `kafka/groups.js`:

```js
export const groups = Object.freeze({
  messages: 'kafka-practice.messages.logger',
  analytics: 'kafka-practice.messages.analytics',
});
```

Both consumers currently only log, so `consumer/analytics.js` re-exports the shared function under the name expected by `server.js`:

```js
export { logMessage as handleAnalytics } from '../kafka/logger.js';
```

In `server.js`, import the same **named export**, including matching spelling and case. An empty file or `export default` does not provide the named export used here:

```js
import { handleAnalytics } from './consumer/analytics.js';

// Inside startServer, after topic creation and before the HTTP listener:
await startConsumer(handleAnalytics, {
  topic: topics.messages.name,
  groupId: groups.analytics,
  fromBeginning: true,
});
```

The existing `groups.messages` consumer and the new `groups.analytics` consumer both read the same topic. A single call to `publishMessage(payload, { topic: topics.messages.name })` reaches both groups. Each handler can be moved into its own file as its processing grows. A shared producer connection serves every publisher; each `startConsumer` call owns its consumer connection.

For another consumer that only needs logging, import `logMessage` from `kafka/logger.js` and pass it directly to `startConsumer` with the desired topic and group. The actual topic and value come from the received record. If analytics later needs its own processing, replace its re-export with a handler that calls `await logMessage(message)` and then awaits the analytics work.

`startConsumer` returns the consumer instance. To stop one subscriber, pass it to `stopKafkaConsumer` from `config/kafka.js`. `disconnectKafka` closes the shared producer and all remaining consumers during application shutdown.

## Producer and consumer settings

Keep connection settings in `config/index.js` / `.env`, topic definitions in `kafka/topics.js`, and group IDs in `kafka/groups.js`. A publisher wrapper chooses its topic and key; a consumer registration chooses its topic, group, and handler. Add a wrapper/handler and its registration for a new use case, reusing the existing connection helpers.

These are the options exposed by this project's helpers:

| Setting | Current value / requirement | Where to set it |
| --- | --- | --- |
| Topic name | `practice-messages` | `kafka/topics.js`; callers use `topics.messages.name`. |
| Topic partitions | `1` | `numPartitions` in the topic registry, used when creating a missing topic. |
| Replication factor | `1` | `replicationFactor` in the topic registry; suitable for the single local broker. |
| Publish payload | Required, e.g. `{ message: 'hello' }` | First argument to `publishMessage`; objects are JSON-encoded. |
| Publish `topic` | Required string | Second argument to `publishMessage`. |
| Publish `key` | Optional string or Buffer | Second argument to `publishMessage`; use an entity ID for related messages. |
| Consumer handler | Required async function | First argument to `startConsumer`; receives `{ groupId, value, topic, partition, offset, key }`. |
| Consumer `topic` | Required string | Second argument to `startConsumer`. |
| Consumer `groupId` | Required, stable string | Add it to `kafka/groups.js` and pass the registry value to `startConsumer`. |
| Consumer `fromBeginning` | Helper default: `true` | Second argument to `startConsumer`; used when a valid committed offset is unavailable. |

Await asynchronous work in the handler. Let processing errors throw so that KafkaJS does not treat failed work as successful. Records can be delivered again after failures, so database updates and other side effects should tolerate replay.

Advanced KafkaJS options have different entry points. The current helpers do **not** forward arbitrary options added to their arguments:

| Options | Current behavior | KafkaJS entry point in this project |
| --- | --- | --- |
| `retry` | Explicit `{ retries: 3 }` | `new Kafka(...)` in `config/kafka.js`. |
| `createPartitioner` | Explicit `Partitioners.DefaultPartitioner` | `kafka.producer(...)` in `config/kafka.js`. |
| `acks`, `timeout`, `compression` | SDK defaults: all in-sync replicas (`-1`), `30000` ms, no compression | `producer.send(...)` in `producer/producer.js`. |
| `sessionTimeout`, `heartbeatInterval` | SDK defaults: `30000` / `3000` ms | `kafka.consumer(...)` in `config/kafka.js`. |
| `autoCommit`, `partitionsConsumedConcurrently` | SDK defaults: `true` / `1` | `consumer.run(...)` in `consumer/consumer.js`. |

If these need per-consumer overrides later, add explicit `consumerOptions` and `runOptions` arguments to the generic helper and forward them to those respective KafkaJS calls. Put shared defaults in a `kafka/settings.js` module and override them in registrations. Keep the required `groupId` and handler controlled by the helper. For producer overrides, expose the desired send options explicitly instead of silently accepting unused fields.

For the full SDK option reference, see [producer settings](https://kafka.js.org/docs/producing), [consumer settings](https://kafka.js.org/docs/consuming), and [client settings](https://kafka.js.org/docs/configuration).

## Check and stop

Run `npm test` for route, required-option, and KafkaJS timer regression tests. With Kafka running, `npm run test:integration` publishes one record and checks that two independent consumer groups both receive it. Stop this project's Docker broker from the project root with `docker compose --env-file server/.env down`. Do not run Compose if another container already owns port 9092.

## Messages are published but nothing appears in the terminal

Check the KafkaJS `Consumer has joined the group` log. For one server instance, this project's consumer should show `memberAssignment: {"practice-messages":[0]}`. An empty assignment means that instance has no partitions to read. Another instance in the same group may own the partition.

If the log says `Consumer group received unsubscribed topics` and mentions `test-topic`, another consumer with a different subscription is using the same group ID. The message logger now uses `kafka-practice.messages.logger` in `kafka/groups.js` to keep it separate from the old `kafka-practice-group`. Give each independent subscriber its own stable group ID; use the same ID only for instances that share the same work and subscriptions. See the [KafkaJS FAQ](https://kafka.js.org/docs/faq#why-am-i-receiving-messages-for-topics-i-m-not-subscribed-to).

After changing code, stop your running server with Ctrl+C and run `npm run dev` again. This command does not watch files. A new group can print earlier retained messages on its first start because `fromBeginning` defaults to `true`.

## Node 24 negative-timeout warning

KafkaJS 2.2.4 can schedule a negative timeout when its request queue is empty ([upstream issue](https://github.com/tulios/kafkajs/issues/1751)). This is separate from consumer group assignment.

`npm install` and `npm ci` run `scripts/patch-kafkajs.js` automatically. The version-checked patch stops scheduling an expired timer when there is no pending work, while retaining retries and broker throttling. It does not suppress Node warnings. KafkaJS is pinned to 2.2.4 so a dependency upgrade requires reviewing/removing the patch. If dependencies were installed with `--ignore-scripts`, run `npm run postinstall` before starting the server.
