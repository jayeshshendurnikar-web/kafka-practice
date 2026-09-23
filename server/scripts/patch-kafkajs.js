import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// KafkaJS 2.2.4 schedules an expired timer even when its request queue is empty.
// Node 24 reports this as TimeoutNegativeWarning; older Node versions still poll.
// Track the upstream fix: https://github.com/tulios/kafkajs/issues/1751
const require = createRequire(import.meta.url);
const { version } = require('kafkajs/package.json');
if (version !== '2.2.4') {
  throw new Error(`Review the KafkaJS timer patch before using version ${version}`);
}

const file = require.resolve('kafkajs/src/network/requestQueue');
const source = readFileSync(file, 'utf8');
const original = `      if (this.pending.length > 0) {
        scheduleAt = scheduleAt > 0 ? scheduleAt : CHECK_PENDING_REQUESTS_INTERVAL
      }
      this.throttleCheckTimeoutId = setTimeout(() => {`;
const patched = `      if (this.pending.length > 0) {
        scheduleAt = scheduleAt > 0 ? scheduleAt : CHECK_PENDING_REQUESTS_INTERVAL
      } else if (scheduleAt <= 0) {
        return
      }
      this.throttleCheckTimeoutId = setTimeout(() => {`;

if (source.includes(patched)) {
  console.log('KafkaJS request queue timer patch already applied');
} else {
  if (source.split(original).length !== 2) {
    throw new Error('KafkaJS request queue changed; review the timer patch before starting');
  }
  writeFileSync(file, source.replace(original, patched));
  console.log('Applied KafkaJS request queue timer patch');
}
