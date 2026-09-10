// =============================================================================
// Drop-in Client SDK Main Entry Point
// < 12 KB gzipped, zero external runtime dependencies
// =============================================================================

import { FeedbackSDKConfig, Breadcrumb, ConsoleError, NetworkFailure } from './config.js';
import { BreadcrumbCollector } from './collectors/breadcrumb.js';
import { ConsoleCollector } from './collectors/console.js';
import { NetworkCollector } from './collectors/network.js';
import { Transport } from './transport.js';
import { FeedbackUI, ModalSubmitData } from './ui/modal.js';

export * from './config.js';

export class FeedbackSDK {
  private static instance: FeedbackSDK | null = null;
  private config: FeedbackSDKConfig;
  private breadcrumbs: BreadcrumbCollector;
  private consoleCollector: ConsoleCollector;
  private networkCollector: NetworkCollector;
  private transport: Transport;
  private ui: FeedbackUI;

  private constructor(config: FeedbackSDKConfig) {
    this.config = config;

    const endpoint = config.endpoint || 'https://feedback.yourdomain.com';
    this.transport = new Transport(endpoint, config.apiKey);

    // Initialize telemetry collectors
    const maxBreadcrumbs = config.options?.maxBreadcrumbs ?? 15;
    const maxConsoleLogs = config.options?.maxConsoleLogs ?? 10;
    const maxNetworkFailures = config.options?.maxNetworkFailures ?? 5;

    this.breadcrumbs = new BreadcrumbCollector(maxBreadcrumbs);
    this.consoleCollector = new ConsoleCollector(maxConsoleLogs);
    this.networkCollector = new NetworkCollector(maxNetworkFailures);

    this.breadcrumbs.install();
    this.consoleCollector.install();
    this.networkCollector.install(endpoint);

    // Initialize Intake UI
    this.ui = new FeedbackUI(async (data: ModalSubmitData) => {
      return this.submit(data.rawUserText, {
        type: data.type,
        criticality: data.criticality,
        screenshotBase64: data.screenshotBase64,
      });
    });

    const position = config.options?.position ?? 'bottom-left';
    this.ui.install(position);

    // Scenario 9.1.4: Silent catch of errors (>= 400 code)
    this.setupSilentNetworkCatcher();

    // Scenario 9.1.3: Error page detection
    this.setupErrorPageDetector();
  }

  /**
   * Initializes the Feedback SDK singleton.
   */
  public static init(config: FeedbackSDKConfig): FeedbackSDK {
    if (!FeedbackSDK.instance) {
      FeedbackSDK.instance = new FeedbackSDK(config);
    }
    return FeedbackSDK.instance;
  }

  /**
   * Programmatically opens the feedback / bug reporting modal.
   */
  public static open(initialType: 'feedback' | 'bug' | 'error_page' | 'other' = 'feedback'): void {
    if (FeedbackSDK.instance) {
      FeedbackSDK.instance.ui.open(initialType);
    } else {
      console.warn('[FeedbackSDK] SDK must be initialized before calling open()');
    }
  }

  /**
   * Programmatically hides the feedback floating icon.
   */
  public static hide(): void {
    if (FeedbackSDK.instance) {
      FeedbackSDK.instance.ui.hide();
    }
  }

  /**
   * Submits a report programmatically.
   */
  public static async submitReport(
    text: string,
    options?: {
      type?: 'feedback' | 'bug' | 'error_page' | 'other';
      criticality?: 'low' | 'medium' | 'high' | 'critical';
      screenshotBase64?: string | null;
    }
  ): Promise<boolean> {
    if (!FeedbackSDK.instance) {
      throw new Error('[FeedbackSDK] SDK is not initialized');
    }
    return FeedbackSDK.instance.submit(text, options);
  }

  private async submit(
    rawUserText: string,
    options?: {
      type?: 'feedback' | 'bug' | 'error_page' | 'other';
      criticality?: 'low' | 'medium' | 'high' | 'critical';
      screenshotBase64?: string | null;
    }
  ): Promise<boolean> {
    const payload = {
      clientTimestamp: new Date().toISOString(),
      feedback: {
        rawUserText,
        screenshotBase64: options?.screenshotBase64 || null,
        type: options?.type || 'feedback',
        criticality: options?.criticality || null,
      },
      context: {
        tenant: this.config.tenant,
        user: this.config.user || { id: 'anonymous', email: 'anonymous@example.com', role: 'user' },
        app: this.config.app,
        runtime: {
          url: typeof window !== 'undefined' ? window.location.href : '/',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown',
          locale: typeof navigator !== 'undefined' ? navigator.language : 'en',
        },
      },
      telemetry: {
        breadcrumbs: this.breadcrumbs.getBreadcrumbs(),
        consoleErrors: this.consoleCollector.getConsoleErrors(),
        networkFailures: this.networkCollector.getNetworkFailures(),
      },
    };

    return this.transport.send(payload);
  }

  private setupSilentNetworkCatcher(): void {
    // When HTTP status >= 400 occurs, report quietly without interrupting user
    this.networkCollector.onError((failure: NetworkFailure) => {
      // Throttle or dispatch silent telemetry
      this.submit(`[Auto-Captured Network Failure] HTTP ${failure.statusCode} on ${failure.method} ${failure.url}`, {
        type: 'bug',
        criticality: failure.statusCode >= 500 ? 'high' : 'medium',
      }).catch(() => {});
    });
  }

  private setupErrorPageDetector(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('DOMContentLoaded', () => {
      // Check for common error status texts or classes on page
      const isErrorPage =
        document.title.includes('500') ||
        document.title.includes('404') ||
        document.querySelector('.error-page, [data-error-page="true"]');

      if (isErrorPage) {
        const errorContainer = document.querySelector('.error-page, main, body');
        if (errorContainer && !document.getElementById('fb-injected-error-btn')) {
          const btn = document.createElement('button');
          btn.id = 'fb-injected-error-btn';
          btn.textContent = 'Submit Report';
          btn.style.cssText = 'margin-top:16px;padding:8px 16px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:500;';
          btn.addEventListener('click', () => {
            FeedbackSDK.open('error_page');
          });
          errorContainer.appendChild(btn);
        }
      }
    });
  }
}

// Auto-export for CDN / IIFE bundles
if (typeof window !== 'undefined') {
  (window as any).FeedbackSDK = FeedbackSDK;
}

export default FeedbackSDK;
