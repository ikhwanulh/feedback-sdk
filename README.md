# @yourorg/feedback-sdk

A lightweight, zero-dependency, drop-in customer telemetry and issue-reporting SDK (<12 KB gzipped) for mission-critical B2B applications.

Autonomously harvests application state, failed network interactions, console errors, DOM breadcrumbs, and user context.

---

## 📦 Installation

### Option 1: npm / pnpm / yarn (Recommended for React, Vue, Next.js, Angular)

```bash
npm install @yourorg/feedback-sdk
# or
pnpm add @yourorg/feedback-sdk
# or
yarn add @yourorg/feedback-sdk
```

#### Usage in Application

```typescript
import { FeedbackSDK } from '@yourorg/feedback-sdk';

FeedbackSDK.init({
  apiKey: 'sdk_live_your_tenant_api_key',
  endpoint: 'https://feedback.yourcompany.com',
  tenant: {
    id: 'tenant_acme_corp',
    name: 'Acme Corporation',
    tier: 'ENTERPRISE', // 'ENTERPRISE' | 'GROWTH' | 'STARTER'
  },
  user: {
    id: 'user_12345',
    email: 'alice@acme.com',
    role: 'administrator',
  },
  app: {
    version: '2.4.1',
    environment: 'production',
  },
  options: {
    position: 'bottom-left', // 'bottom-left' | 'bottom-right'
    maxBreadcrumbs: 15,
    maxConsoleLogs: 10,
    maxNetworkFailures: 5,
  }
});
```

---

### Option 2: CDN `<script>` tag embed (HTML / Vanilla JS)

Include this before the closing `</body>` tag:

```html
<script src="https://feedback.yourcompany.com/feedback-sdk.iife.js"></script>
<script>
  FeedbackSDK.init({
    apiKey: 'sdk_live_your_tenant_api_key',
    endpoint: 'https://feedback.yourcompany.com',
    tenant: {
      id: 'tenant_acme_corp',
      name: 'Acme Corporation',
      tier: 'ENTERPRISE'
    },
    app: {
      version: '1.0.0',
      environment: 'production'
    }
  });
</script>
```

---

## 🛠️ Programmatic Controls

```typescript
// Open modal programmatically (e.g. from your custom Help menu)
FeedbackSDK.open('bug'); // 'feedback' | 'bug' | 'other'

// Hide floating button (remains hidden until page reload)
FeedbackSDK.hide();

// Submit report programmatically without UI
await FeedbackSDK.submitReport('Checkout failed after entering discount code', {
  type: 'bug',
  criticality: 'high',
});
```

---

## 🔒 Privacy & Performance Guarantees

- **Memory overhead:** Strictly bounded to `<2 MB` via circular ring buffers.
- **Privacy:** Form values and password fields are **never** captured in DOM breadcrumbs.
- **Network calls:** Request and response bodies are discarded by default.
- **Offline support:** Telemetry is buffered in IndexedDB and flushed automatically on reconnect.
