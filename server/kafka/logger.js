export const logMessage = async ({ groupId, topic, value }) => {
  const prefix = groupId ? `[${groupId}] ` : '';
  console.log(`${prefix}Consumed from ${topic}:`, value);
};
