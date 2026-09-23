import express from "express";
import cors from "cors";
import { config } from "./config/index.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { connectKafka, disconnectKafka, ensureKafkaTopics } from "./config/kafka.js";
import { startConsumer } from "./consumer/consumer.js";

import { logMessage } from "./consumer/messages.js";
import { topics } from "./kafka/topics.js";
import { groups } from "./kafka/groups.js";
import { messagesRouter } from "./routes/messages.js";
import { handleAnalytics } from './consumer/analytics.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/messages", messagesRouter);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const startServer = async () => {
  try {
    await connectDB();

    await connectKafka();
    console.log("Connected to Kafka");
    await ensureKafkaTopics(Object.values(topics));
    await startConsumer(logMessage, {
      topic: topics.messages.name,
      groupId: groups.messages,
    });

    await startConsumer(handleAnalytics, {
      topic: topics.messages.name,
      groupId: groups.analytics,
    });

    console.log("Kafka consumers started");

    const server = await new Promise((resolve, reject) => {
      const listener = app.listen(config.port);
      listener.once("error", reject);
      listener.once("listening", () => {
        listener.off("error", reject);
        resolve(listener);
      });
    });
    console.log(`Server running on port ${config.port}`);

    let shuttingDown = false;
    const shutdown = async () => {
      if (shuttingDown) return;
      shuttingDown = true;

      try {
        await new Promise((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        });
      } catch (error) {
        console.error("HTTP server shutdown failed:", error);
        process.exitCode = 1;
      }

      const results = await Promise.allSettled([disconnectKafka(), disconnectDB()]);

      for (const result of results) {
        if (result.status === "rejected") {
          console.error("Shutdown failed:", result.reason);
          process.exitCode = 1;
        }
      }
    };

    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  } catch (error) {
    console.error("Server startup failed:", error.message);
    await Promise.allSettled([disconnectKafka(), disconnectDB()]);
    process.exit(1);
  }
};

startServer();
