// Use a different group for each independent subscriber to a topic.
export const groups = Object.freeze({
  messages: 'kafka-practice.messages.logger',
  analytics: 'kafka-practice.messages.analytics',
});
