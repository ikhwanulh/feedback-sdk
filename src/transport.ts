// =============================================================================
// Transport Subsystem
// Handles payload compression (gzip) and asynchronous dispatch to Ingestion Gateway
// =============================================================================

import { OfflineStorage } from './offline.js';

export class Transport {
  private endpoint: string;
  private apiKey: string;
  private offlineStorage: OfflineStorage;

  constructor(endpoint: string, apiKey: string) {
    this.endpoint = endpoint.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.offlineStorage = new OfflineStorage();

    // Auto flush offline queue on network reconnect
    this.offlineStorage.setupAutoFlush((payload) => this.dispatchRaw(payload));
  }

  async send(payload: any): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await this.offlineStorage.enqueue(payload);
      return false;
    }

    try {
      const success = await this.dispatchRaw(payload);
      if (!success) {
        await this.offlineStorage.enqueue(payload);
      }
      return success;
    } catch {
      await this.offlineStorage.enqueue(payload);
      return false;
    }
  }

  private async dispatchRaw(payload: any): Promise<boolean> {
    const url = `${this.endpoint}/v1/ingest`;
    const jsonString = JSON.stringify(payload);

    const body = jsonString;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body,
    });

    return res.ok;
  }
}
