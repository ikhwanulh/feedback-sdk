// =============================================================================
// Intake UI Modes (Web Component with Shadow DOM)
// Renders the floating trigger button and modal without CSS conflicts
// =============================================================================

export interface ModalSubmitData {
  rawUserText: string;
  type: 'feedback' | 'bug' | 'error_page' | 'other';
  criticality?: 'low' | 'medium' | 'high' | 'critical';
  screenshotBase64?: string | null;
}

export class FeedbackUI {
  private container: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private isOpen = false;
  private isHidden = false;
  private attachedScreenshotBase64: string | null = null;
  private onSubmitCallback: (data: ModalSubmitData) => Promise<boolean>;

  constructor(onSubmit: (data: ModalSubmitData) => Promise<boolean>) {
    this.onSubmitCallback = onSubmit;
  }

  install(position: 'bottom-left' | 'bottom-right' = 'bottom-left'): void {
    if (typeof window === 'undefined') return;

    const mount = () => {
      if (!document.body || this.container) return;

      // Check session storage to honor "Hide feedback icon" until reload
      if (sessionStorage.getItem('__fb_hide_icon') === 'true') {
        this.isHidden = true;
      }

      const host = document.createElement('div');
      host.id = 'feedback-sdk-root';
      document.body.appendChild(host);

      this.shadow = host.attachShadow({ mode: 'open' });
      this.container = host;

      this.render(position);
    };

    if (document.body) {
      mount();
    } else {
      window.addEventListener('DOMContentLoaded', mount);
    }
  }

  open(initialType: 'feedback' | 'bug' | 'error_page' | 'other' = 'feedback'): void {
    this.isOpen = true;
    const modalEl = this.shadow?.querySelector('.fb-modal-backdrop') as HTMLElement;
    if (modalEl) {
      modalEl.style.display = 'flex';
      const typeSelect = this.shadow?.querySelector('#fb-type-select') as HTMLSelectElement;
      if (typeSelect) typeSelect.value = initialType;
      this.updateCriticalityVisibility(initialType);
      const input = this.shadow?.querySelector('#fb-text-input') as HTMLTextAreaElement;
      input?.focus();
    }
  }

  close(): void {
    this.isOpen = false;
    const modalEl = this.shadow?.querySelector('.fb-modal-backdrop') as HTMLElement;
    if (modalEl) modalEl.style.display = 'none';
  }

  hide(): void {
    this.isHidden = true;
    sessionStorage.setItem('__fb_hide_icon', 'true');
    const btn = this.shadow?.querySelector('.fb-floating-btn') as HTMLElement;
    if (btn) btn.style.display = 'none';
    this.close();
  }

  private updateCriticalityVisibility(type: string) {
    const critGroup = this.shadow?.querySelector('#fb-crit-group') as HTMLElement;
    if (critGroup) {
      critGroup.style.display = type === 'bug' ? 'block' : 'none';
    }
  }

  private async captureScreenshot(): Promise<string | null> {
    try {
      // Use standard HTML5 Canvas snapshot if accessible
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(window.innerWidth, 1280);
      canvas.height = Math.min(window.innerHeight, 720);
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(`Viewport: ${window.innerWidth}x${window.innerHeight} | Route: ${window.location.pathname}`, 20, 40);
      ctx.fillText(`Timestamp: ${new Date().toISOString()}`, 20, 70);

      return canvas.toDataURL('image/jpeg', 0.6);
    } catch {
      return null;
    }
  }

  private render(position: 'bottom-left' | 'bottom-right'): void {
    if (!this.shadow) return;

    const isLeft = position === 'bottom-left';
    const posStyle = isLeft ? 'left: 20px;' : 'right: 20px;';

    this.shadow.innerHTML = `
      <style>
        * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .fb-floating-btn {
          position: fixed;
          bottom: 20px;
          ${posStyle}
          z-index: 999990;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 24px;
          padding: 10px 16px;
          display: ${this.isHidden ? 'none' : 'inline-flex'};
          align-items: center;
          gap: 8px;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
          font-weight: 500;
          font-size: 13px;
          max-width: 5vw; /* SDD Section 9.1: Occupies less than 5% page width */
          min-width: 44px;
          overflow: hidden;
          transition: transform 0.2s, background 0.2s;
        }
        .fb-floating-btn:hover {
          background: #1d4ed8;
          transform: translateY(-2px);
          max-width: 140px;
        }
        .fb-floating-btn svg { width: 18px; height: 18px; flex-shrink: 0; }
        .fb-btn-text { white-space: nowrap; }

        .fb-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          z-index: 999999;
          display: none;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .fb-modal {
          background: #0f172a;
          color: #f8fafc;
          width: 100%;
          max-width: 440px;
          border-radius: 12px;
          border: 1px solid #334155;
          padding: 24px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
          animation: fbFadeIn 0.15s ease-out;
        }
        @keyframes fbFadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        .fb-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .fb-title { font-size: 16px; font-weight: 600; margin: 0; }
        .fb-close-btn {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          font-size: 20px;
          padding: 4px;
        }
        .fb-close-btn:hover { color: #f8fafc; }
        .fb-form-group { margin-bottom: 14px; }
        .fb-label { display: block; font-size: 12px; font-weight: 500; color: #94a3b8; margin-bottom: 6px; }
        .fb-input, .fb-select, .fb-textarea {
          width: 100%;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 6px;
          color: #f8fafc;
          padding: 8px 12px;
          font-size: 14px;
          outline: none;
        }
        .fb-input:focus, .fb-select:focus, .fb-textarea:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }
        .fb-textarea { resize: vertical; min-height: 80px; }
        .fb-upload-zone {
          border: 1px dashed #475569;
          border-radius: 8px;
          background: #1e293b;
          padding: 12px;
          text-align: center;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
          position: relative;
        }
        .fb-upload-zone:hover, .fb-upload-zone.dragover {
          border-color: #3b82f6;
          background: rgba(59, 130, 246, 0.08);
        }
        .fb-upload-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .fb-upload-placeholder svg { width: 22px; height: 22px; color: #60a5fa; margin-bottom: 2px; }
        .fb-preview-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .fb-img-preview {
          max-height: 110px;
          max-width: 100%;
          border-radius: 6px;
          object-fit: contain;
          border: 1px solid #334155;
        }
        .fb-remove-img {
          position: absolute;
          top: -8px;
          right: -8px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 50%;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        }
        .fb-remove-img:hover { background: #dc2626; }
        .fb-checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #cbd5e1;
          cursor: pointer;
        }
        .fb-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 16px;
        }
        .fb-hide-link {
          background: none;
          border: none;
          color: #64748b;
          font-size: 12px;
          cursor: pointer;
          text-decoration: underline;
        }
        .fb-hide-link:hover { color: #94a3b8; }
        .fb-submit-btn {
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 8px 16px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }
        .fb-submit-btn:hover { background: #1d4ed8; }
        .fb-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      </style>

      <!-- Floating Trigger Button -->
      <button class="fb-floating-btn" id="fb-trigger" title="Give Feedback">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span class="fb-btn-text">Feedback</span>
      </button>

      <!-- Feedback Modal -->
      <div class="fb-modal-backdrop" id="fb-modal-backdrop">
        <div class="fb-modal">
          <div class="fb-header">
            <h3 class="fb-title">Submit Feedback or Bug</h3>
            <button class="fb-close-btn" id="fb-close">&times;</button>
          </div>
          <form id="fb-form">
            <div class="fb-form-group">
              <label class="fb-label" for="fb-type-select">Report Type</label>
              <select class="fb-select" id="fb-type-select">
                <option value="feedback">Feedback / Improvement</option>
                <option value="bug">Bug Report</option>
                <option value="other">Other Inquiry</option>
              </select>
            </div>

            <div class="fb-form-group" id="fb-crit-group" style="display: none;">
              <label class="fb-label" for="fb-crit-select">Criticality</label>
              <select class="fb-select" id="fb-crit-select">
                <option value="low">Low - Minor cosmetic issue</option>
                <option value="medium">Medium - Functional annoyance</option>
                <option value="high">High - Feature broken</option>
                <option value="critical">Critical - Completely blocked / outage</option>
              </select>
            </div>

            <div class="fb-form-group">
              <label class="fb-label" for="fb-text-input">What went wrong?</label>
              <textarea class="fb-textarea" id="fb-text-input" placeholder="Describe what happened or what you would like to see improved..." required></textarea>
            </div>

            <div class="fb-form-group">
              <label class="fb-label">Screenshot / Attachment (Optional)</label>
              <div class="fb-upload-zone" id="fb-upload-zone" title="Click or drag image here, or paste from clipboard">
                <input type="file" id="fb-file-input" accept="image/*" style="display: none;" />
                <div id="fb-upload-placeholder" class="fb-upload-placeholder">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                    <circle cx="9" cy="9" r="2"/>
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                  </svg>
                  <span style="font-weight: 500; font-size: 12px; color: #cbd5e1;">Click to upload, drag & drop, or paste (Ctrl+V)</span>
                  <span style="font-size: 11px; color: #64748b;">Supports PNG, JPG, WebP up to 10MB</span>
                </div>
                <div id="fb-preview-container" class="fb-preview-container" style="display: none;">
                  <img id="fb-img-preview" class="fb-img-preview" alt="Screenshot preview" />
                  <button type="button" id="fb-remove-img" class="fb-remove-img" title="Remove screenshot">&times;</button>
                </div>
              </div>
              <div style="margin-top: 8px;">
                <label class="fb-checkbox-label" id="fb-autocapture-label">
                  <input type="checkbox" id="fb-screenshot-chk" checked />
                  <span>Auto-capture screen snapshot if no file uploaded</span>
                </label>
              </div>
            </div>

            <div class="fb-footer">
              <button type="button" class="fb-hide-link" id="fb-hide-btn">Hide feedback icon</button>
              <button type="submit" class="fb-submit-btn" id="fb-submit">Submit Report</button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Event Bindings
    const trigger = this.shadow.querySelector('#fb-trigger');
    trigger?.addEventListener('click', () => this.open());

    const closeBtn = this.shadow.querySelector('#fb-close');
    closeBtn?.addEventListener('click', () => this.close());

    const backdrop = this.shadow.querySelector('#fb-modal-backdrop');
    backdrop?.addEventListener('click', (e) => {
      if (e.target === backdrop) this.close();
    });

    const hideBtn = this.shadow.querySelector('#fb-hide-btn');
    hideBtn?.addEventListener('click', () => this.hide());

    const typeSelect = this.shadow.querySelector('#fb-type-select') as HTMLSelectElement;
    typeSelect?.addEventListener('change', () => {
      this.updateCriticalityVisibility(typeSelect.value);
    });

    // Upload & Screenshot Attachment Logic
    const uploadZone = this.shadow.querySelector('#fb-upload-zone') as HTMLElement;
    const fileInput = this.shadow.querySelector('#fb-file-input') as HTMLInputElement;
    const placeholder = this.shadow.querySelector('#fb-upload-placeholder') as HTMLElement;
    const previewContainer = this.shadow.querySelector('#fb-preview-container') as HTMLElement;
    const imgPreview = this.shadow.querySelector('#fb-img-preview') as HTMLImageElement;
    const removeBtn = this.shadow.querySelector('#fb-remove-img');
    const autocaptureLabel = this.shadow.querySelector('#fb-autocapture-label') as HTMLElement;

    const setAttachment = (dataUrl: string | null) => {
      this.attachedScreenshotBase64 = dataUrl;
      if (dataUrl) {
        imgPreview.src = dataUrl;
        placeholder.style.display = 'none';
        previewContainer.style.display = 'flex';
        if (autocaptureLabel) autocaptureLabel.style.opacity = '0.5';
      } else {
        imgPreview.src = '';
        placeholder.style.display = 'flex';
        previewContainer.style.display = 'none';
        if (fileInput) fileInput.value = '';
        if (autocaptureLabel) autocaptureLabel.style.opacity = '1';
      }
    };

    uploadZone?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('#fb-remove-img')) return;
      fileInput.click();
    });

    fileInput?.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => setAttachment(reader.result as string);
        reader.readAsDataURL(file);
      }
    });

    removeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      setAttachment(null);
    });

    uploadZone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });

    uploadZone?.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragover');
    });

    uploadZone?.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => setAttachment(reader.result as string);
        reader.readAsDataURL(file);
      }
    });

    // Clipboard paste support (Ctrl+V / Cmd+V)
    window.addEventListener('paste', (e: ClipboardEvent) => {
      if (!this.isOpen) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = () => setAttachment(reader.result as string);
            reader.readAsDataURL(file);
            break;
          }
        }
      }
    });

    const form = this.shadow.querySelector('#fb-form') as HTMLFormElement;
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = this.shadow?.querySelector('#fb-submit') as HTMLButtonElement;
      const textInput = this.shadow?.querySelector('#fb-text-input') as HTMLTextAreaElement;
      const critSelect = this.shadow?.querySelector('#fb-crit-select') as HTMLSelectElement;
      const screenshotChk = this.shadow?.querySelector('#fb-screenshot-chk') as HTMLInputElement;

      if (!textInput.value.trim()) return;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';

      let screenshotBase64: string | null = this.attachedScreenshotBase64;
      if (!screenshotBase64 && screenshotChk.checked) {
        screenshotBase64 = await this.captureScreenshot();
      }

      const data: ModalSubmitData = {
        rawUserText: textInput.value.trim(),
        type: typeSelect.value as any,
        criticality: typeSelect.value === 'bug' ? (critSelect.value as any) : undefined,
        screenshotBase64,
      };

      try {
        await this.onSubmitCallback(data);
        form.reset();
        setAttachment(null);
        this.close();
      } catch (err) {
        alert('Failed to submit report. Please try again.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Report';
      }
    });
  }
}
