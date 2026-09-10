// =============================================================================
// Network Failure Interceptor
// Wraps window.fetch and XMLHttpRequest to catch failed requests (>= 400 or aborts)
// Payloads are discarded to protect privacy; bounded to max 5 entries
// =============================================================================

import { RingBuffer } from '../utils/ring-buffer.js';
import { NetworkFailure } from '../config.js';

export type NetworkErrorListener = (failure: NetworkFailure) => void;

export class NetworkCollector {
  private ringBuffer: RingBuffer<NetworkFailure>;
  private isInstalled = false;
  private errorListeners: NetworkErrorListener[] = [];

  constructor(maxNetworkFailures: number = 5) {
    this.ringBuffer = new RingBuffer<NetworkFailure>(maxNetworkFailures);
  }

  onError(listener: NetworkErrorListener): void {
    this.errorListeners.push(listener);
  }

  install(gatewayEndpoint?: string): void {
    if (this.isInstalled || typeof window === 'undefined') return;
    this.isInstalled = true;

    const self = this;
    const gatewayHost = gatewayEndpoint ? new URL(gatewayEndpoint).host : '';

    // 1. Intercept window.fetch
    if (typeof window.fetch === 'function') {
      const originalFetch = window.fetch;
      window.fetch = async function (...args: any[]) {
        const start = performance.now();
        let url = '';
        let method = 'GET';

        try {
          if (typeof args[0] === 'string') {
            url = args[0];
          } else if (args[0] instanceof Request) {
            url = args[0].url;
            method = args[0].method;
          }
          if (args[1]?.method) {
            method = args[1].method;
          }
        } catch {}

        try {
          const response = await (originalFetch as any).apply(this, args);
          const durationMs = Math.round(performance.now() - start);

          // Do not capture telemetry traffic directed to the gateway itself
          const isTelemetryCall = gatewayHost && url.includes(gatewayHost);
          if (!isTelemetryCall && response.status >= 400) {
            const failure: NetworkFailure = {
              timestamp: new Date().toISOString(),
              method,
              url: url.slice(0, 300),
              statusCode: response.status,
              durationMs,
            };
            self.recordFailure(failure);
          }

          return response;
        } catch (error) {
          const durationMs = Math.round(performance.now() - start);
          const isTelemetryCall = gatewayHost && url.includes(gatewayHost);
          if (!isTelemetryCall) {
            const failure: NetworkFailure = {
              timestamp: new Date().toISOString(),
              method,
              url: url.slice(0, 300),
              statusCode: 0, // Network abort / offline / CORS failure
              durationMs,
            };
            self.recordFailure(failure);
          }
          throw error;
        }
      };
    }

    // 2. Intercept XMLHttpRequest
    if (typeof XMLHttpRequest !== 'undefined') {
      const origOpen = XMLHttpRequest.prototype.open;
      const origSend = XMLHttpRequest.prototype.send;

      XMLHttpRequest.prototype.open = function (
        method: string,
        url: string | URL,
        ...rest: any[]
      ) {
        (this as any)._fb_method = method;
        (this as any)._fb_url = String(url);
        return origOpen.apply(this, [method, url, ...rest] as any);
      };

      XMLHttpRequest.prototype.send = function (...args: any[]) {
        const start = performance.now();
        const xhr = this;

        xhr.addEventListener('loadend', () => {
          const method = (xhr as any)._fb_method || 'GET';
          const url = (xhr as any)._fb_url || '';
          const isTelemetryCall = gatewayHost && url.includes(gatewayHost);

          if (!isTelemetryCall && (xhr.status >= 400 || xhr.status === 0)) {
            const failure: NetworkFailure = {
              timestamp: new Date().toISOString(),
              method,
              url: url.slice(0, 300),
              statusCode: xhr.status,
              durationMs: Math.round(performance.now() - start),
            };
            self.recordFailure(failure);
          }
        });

        return (origSend as any).apply(this, args);
      };
    }
  }

  private recordFailure(failure: NetworkFailure): void {
    this.ringBuffer.push(failure);
    for (const listener of this.errorListeners) {
      try {
        listener(failure);
      } catch {}
    }
  }

  getNetworkFailures(): NetworkFailure[] {
    return this.ringBuffer.toArray();
  }
}
