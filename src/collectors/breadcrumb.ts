// =============================================================================
// DOM Breadcrumb Collector
// Instruments window clicks, input changes, and route transitions into a Ring Buffer
// Only preserves element tag, classes, and data-testid; user values masked
// =============================================================================

import { RingBuffer } from '../utils/ring-buffer.js';
import { Breadcrumb } from '../config.js';

export class BreadcrumbCollector {
  private ringBuffer: RingBuffer<Breadcrumb>;
  private isInstalled = false;

  constructor(maxBreadcrumbs: number = 15) {
    this.ringBuffer = new RingBuffer<Breadcrumb>(maxBreadcrumbs);
  }

  install(): void {
    if (this.isInstalled || typeof window === 'undefined') return;
    this.isInstalled = true;

    // 1. Click Listener
    window.addEventListener(
      'click',
      (e: MouseEvent) => {
        try {
          const target = e.target as HTMLElement | null;
          if (!target) return;
          const selector = this.formatElementSelector(target);
          this.addBreadcrumb('click', selector);
        } catch {
          // Non-invasive
        }
      },
      { capture: true, passive: true }
    );

    // 2. Input Change Listener (values are strictly NOT captured)
    window.addEventListener(
      'input',
      (e: Event) => {
        try {
          const target = e.target as HTMLElement | null;
          if (!target) return;
          const selector = this.formatElementSelector(target);
          this.addBreadcrumb('input', selector);
        } catch {
          // Non-invasive
        }
      },
      { capture: true, passive: true }
    );

    // 3. Navigation / Route Change Interception
    const handleNavigation = (url: string) => {
      this.addBreadcrumb('navigation', url);
    };

    window.addEventListener('popstate', () => {
      handleNavigation(window.location.pathname);
    });

    const origPushState = history.pushState;
    if (origPushState) {
      history.pushState = function (...args: any[]) {
        (origPushState as any).apply(this, args);
        if (args[2]) {
          handleNavigation(String(args[2]));
        }
      };
    }

    const origReplaceState = history.replaceState;
    if (origReplaceState) {
      history.replaceState = function (...args: any[]) {
        (origReplaceState as any).apply(this, args);
        if (args[2]) {
          handleNavigation(String(args[2]));
        }
      };
    }
  }

  addBreadcrumb(category: Breadcrumb['category'], target: string): void {
    this.ringBuffer.push({
      timestamp: new Date().toISOString(),
      category,
      target: target.slice(0, 200),
    });
  }

  getBreadcrumbs(): Breadcrumb[] {
    return this.ringBuffer.toArray();
  }

  private formatElementSelector(element: HTMLElement): string {
    const tagName = (element.tagName || 'ELEMENT').toLowerCase();
    const testId = element.getAttribute('data-testid');
    if (testId) return `${tagName}[data-testid="${testId}"]`;

    const id = element.id ? `#${element.id}` : '';
    const classes = element.className && typeof element.className === 'string'
      ? '.' + element.className.trim().split(/\s+/).slice(0, 2).join('.')
      : '';

    return `${tagName}${id}${classes}`;
  }
}
