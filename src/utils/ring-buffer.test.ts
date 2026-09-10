import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RingBuffer } from './ring-buffer.js';

describe('RingBuffer Utility', () => {
  it('stores items up to capacity', () => {
    const rb = new RingBuffer<number>(3);
    rb.push(1);
    rb.push(2);
    assert.deepStrictEqual(rb.toArray(), [1, 2]);
    assert.strictEqual(rb.size(), 2);
  });

  it('overwrites oldest item when capacity is exceeded in FIFO order', () => {
    const rb = new RingBuffer<string>(3);
    rb.push('A');
    rb.push('B');
    rb.push('C');
    assert.deepStrictEqual(rb.toArray(), ['A', 'B', 'C']);

    rb.push('D'); // Overwrites 'A'
    assert.deepStrictEqual(rb.toArray(), ['B', 'C', 'D']);

    rb.push('E'); // Overwrites 'B'
    assert.deepStrictEqual(rb.toArray(), ['C', 'D', 'E']);
  });

  it('clears items properly', () => {
    const rb = new RingBuffer<number>(2);
    rb.push(10);
    rb.push(20);
    rb.clear();
    assert.strictEqual(rb.size(), 0);
    assert.deepStrictEqual(rb.toArray(), []);
  });
});
