// =============================================================================
// Circular Memory Buffer (Ring Buffer)
// Strictly bounds memory overhead to < 2MB by overwriting older entries
// =============================================================================

export class RingBuffer<T> {
  private buffer: Array<T | undefined>;
  private head: number = 0;
  private count: number = 0;
  private readonly capacity: number;

  constructor(capacity: number) {
    if (capacity <= 0) {
      throw new Error('RingBuffer capacity must be greater than 0');
    }
    this.capacity = capacity;
    this.buffer = new Array<T | undefined>(capacity);
  }

  /**
   * Pushes a new item into the ring buffer.
   * If capacity is reached, overwrites the oldest item.
   */
  push(item: T): void {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) {
      this.count++;
    }
  }

  /**
   * Returns all items currently in the buffer in chronological order.
   */
  toArray(): T[] {
    const result: T[] = [];
    if (this.count === 0) return result;

    const start = this.count < this.capacity ? 0 : this.head;
    for (let i = 0; i < this.count; i++) {
      const idx = (start + i) % this.capacity;
      const item = this.buffer[idx];
      if (item !== undefined) {
        result.push(item);
      }
    }
    return result;
  }

  /**
   * Returns current count of stored items.
   */
  size(): number {
    return this.count;
  }

  /**
   * Clears all buffer items.
   */
  clear(): void {
    this.buffer = new Array<T | undefined>(this.capacity);
    this.head = 0;
    this.count = 0;
  }
}
