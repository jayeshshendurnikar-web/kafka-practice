// Add every application topic here. The admin client creates missing topics at startup.
export const topics = Object.freeze({
  messages: Object.freeze({
    name: 'practice-messages',
    numPartitions: 1,
    replicationFactor: 1,
  }),
});
