export const logKafkaEvent = ({ groupId, topic, partition, offset, key, value }) => {
  const timestamp = new Date().toISOString();
  const groupTag = groupId ? `[${groupId}]` : '';
  const keyTag = key ? `[Key: ${key}]` : '';
  console.log(
    `${timestamp} ${groupTag}${keyTag} Consumed from topic '${topic}' (part: ${partition}, offset: ${offset}):`,
    value,
  );
};

export const logMessage = logKafkaEvent;
