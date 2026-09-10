// =============================================================================
// Console Interceptor
// Wraps console.error and console.warn to preserve error messages and stack traces
// Bounded in memory to max 10 entries
// =============================================================================

import { RingBuffer } from '../utils/ring-buffer.js';
import { ConsoleError } from '../config.js';

export class ConsoleCollector {
  private ringBuffer: RingBuffer<ConsoleError>;
  private isInstalled = false;

  constructor(maxConsoleLogs: number = 10) {
    this.ringBuffer = new RingBuffer<ConsoleError>(maxConsoleLogs);
  }

  install(): void {
    if (this.isInstalled || typeof window === 'undefined' || !window.console) return;
    this.isInstalled = true;

    const self = this;

    // 1. Intercept console.error
    const originalError = console.error;
    console.error = function (...args: any[]) {
      try {
        self.recordConsoleLog('error', args);
      } catch {}
      originalError.apply(console, args);
    };

    // 2. Intercept console.warn
    const originalWarn = console.warn;
    console.warn = function (...args: any[]) {
      try {
        self.recordConsoleLog('warn', args);
      } catch {}
      originalWarn.apply(console, args);
    };

    // 3. Unhandled Global Errors & Promise Rejections
    window.addEventListener('error', (event: ErrorEvent) => {
      self.ringBuffer.push({
        timestamp: new Date().toISOString(),
        message: `[Uncaught Error] ${event.message || 'Script error'}`,
        stack: event.error?.stack ? String(event.error.stack).slice(0, 1000) : undefined,
      });
    });

    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      self.ringBuffer.push({
        timestamp: new Date().toISOString(),
        message: `[Unhandled Rejection] ${reason?.message || String(reason)}`,
        stack: reason?.stack ? String(reason.stack).slice(0, 1000) : undefined,
      });
    });
  }

  private recordConsoleLog(level: 'error' | 'warn', args: any[]): void {
    const message = args
      .map((a) => {
        if (a instanceof Error) return a.message;
        if (typeof a === 'object') {
          try {
            return JSON.stringify(a);
          } catch {
            return String(a);
          }
        }
        return String(a);
      })
      .join(' ')
      .slice(0, 500);

    const errorObj = args.find((a) => a instanceof Error);
    const stack = errorObj?.stack ? String(errorObj.stack).slice(0, 1000) : undefined;

    this.ringBuffer.push({
      timestamp: new Date().toISOString(),
      message: `[console.${level}] ${message}`,
      stack,
    });
  }

  getConsoleErrors(): ConsoleError[] {
    return this.ringBuffer.toArray();
  }
}
