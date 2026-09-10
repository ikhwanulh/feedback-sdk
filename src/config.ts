// =============================================================================
// Feedback SDK Configuration Interface (SDD Section 2.1)
// =============================================================================

export interface FeedbackSDKConfig {
  apiKey: string;
  endpoint?: string; // Defaults to production gateway
  tenant: {
    id: string;
    name: string;
    tier: 'ENTERPRISE' | 'GROWTH' | 'STARTER';
  };
  user?: {
    id: string;
    email: string;
    role: string;
  };
  app: {
    version: string;
    environment: 'production' | 'staging' | 'development';
    buildHash?: string;
  };
  options?: {
    maxBreadcrumbs?: number; // Default: 15
    maxConsoleLogs?: number; // Default: 10
    maxNetworkFailures?: number; // Default: 5
    maskInputsByDefault?: boolean; // Default: true
    position?: 'bottom-left' | 'bottom-right'; // Default: bottom-left (per SDD Section 9.1)
  };
}

export interface Breadcrumb {
  timestamp: string;
  category: 'click' | 'navigation' | 'input';
  target: string;
}

export interface ConsoleError {
  timestamp: string;
  message: string;
  stack?: string;
}

export interface NetworkFailure {
  timestamp: string;
  method: string;
  url: string;
  statusCode: number;
  durationMs: number;
}
