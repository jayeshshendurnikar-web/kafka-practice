import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTotal, generateOrderId } from '../services/orderService.js';

test('calculateTotal correctly sums items and handles quantities', () => {
  const items = [
    { name: 'Item 1', price: 10, quantity: 2 },
    { name: 'Item 2', price: 25.5, quantity: 1 },
  ];
  const total = calculateTotal(items);
  assert.equal(total, 45.5);
});

test('calculateTotal rejects invalid prices or quantities', () => {
  assert.throws(() => calculateTotal([]), /at least one item/);
  assert.throws(() => calculateTotal([{ name: 'Bad item', price: -5, quantity: 1 }]), /valid non-negative price/);
  assert.throws(() => calculateTotal([{ name: 'Bad item', price: 10, quantity: 0 }]), /positive quantity/);
});

test('generateOrderId creates unique prefixed order IDs', () => {
  const id1 = generateOrderId();
  const id2 = generateOrderId();
  assert.ok(id1.startsWith('ORD-'));
  assert.ok(id2.startsWith('ORD-'));
  assert.notEqual(id1, id2);
});
