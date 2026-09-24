export const logKafkaEvent = ({ groupId, topic, partition, offset, key, value }) => {
  const timestamp = new Date().toLocaleTimeString();
  const groupTag = groupId ? `[${groupId}]` : '';
  console.log('\n=================== 📥 [CONSUMER] EVENT RECEIVED FROM KAFKA ===================');
  console.log(`Time     : ${timestamp} ${groupTag}`);
  console.log(`Topic    : ${topic} (Partition: ${partition}, Offset: ${offset})`);
  console.log(`Key      : ${key}`);
  console.log('Data     :');
  console.log(typeof value === 'object' ? JSON.stringify(value, null, 2) : value);
  console.log('==============================================================================\n');
};

export const logMessage = logKafkaEvent;
