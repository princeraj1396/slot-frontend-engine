/**
 * PWA & Mobile Fullscreen Experience Manager
 * Handles Service Worker registration, install prompt (A2HS), iOS install guide, and Fullscreen toggle.
 */

export interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isFullscreen: boolean;
}

export class PWAManager {
  private static instance: PWAManager;
  private deferredPrompt: any = null;
  private isInstalled: boolean = false;
  private isIOS: boolean = false;
  private isFullscreen: boolean = false;
  private listeners: ((state: PWAState) => void)[] = [];

  private constructor() {
    this.init();
  }

  public static getInstance(): PWAManager {
    if (!PWAManager.instance) {
      PWAManager.instance = new PWAManager();
    }
    return PWAManager.instance;
  }

  private init(): void {
    // 1. Detect Standalone / Installed state
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      (window.navigator as any).standalone === true;
    this.isInstalled = isStandalone;

    // 2. Detect iOS device
    const ua = window.navigator.userAgent.toLowerCase();
    this.isIOS = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;

    // 3. Register Service Worker
    this.registerServiceWorker();

    // 4. Capture 'beforeinstallprompt'
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.notifyListeners();
    });

    // 5. Capture 'appinstalled'
    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.deferredPrompt = null;
      this.notifyListeners();
    });

    // 6. Track Fullscreen changes
    document.addEventListener('fullscreenchange', () => {
      this.isFullscreen = !!document.fullscreenElement;
      this.notifyListeners();
    });
    document.addEventListener('webkitfullscreenchange', () => {
      this.isFullscreen = !!(document as any).webkitFullscreenElement;
      this.notifyListeners();
    });
  }

  private async registerServiceWorker(): Promise<void> {
    try {
      // Dynamic import from virtual:pwa-register
      const { registerSW } = await import('virtual:pwa-register');
      registerSW({
        immediate: true,
        onNeedRefresh() {
          console.log('[PWA] New content available; ready to reload.');
        },
        onOfflineReady() {
          console.log('[PWA] App is ready for offline play.');
        },
      });
    } catch {
      // Fallback for standard navigator registration if virtual module is unavailable
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .register('/sw.js')
          .then(() => console.log('[PWA] Fallback service worker registered.'))
          .catch((err) => console.log('[PWA] SW register notice:', err.message));
      }
    }
  }

  public getState(): PWAState {
    return {
      isInstallable: !!this.deferredPrompt || (this.isIOS && !this.isInstalled),
      isInstalled: this.isInstalled,
      isIOS: this.isIOS,
      isFullscreen: this.isFullscreen,
    };
  }

  public subscribe(listener: (state: PWAState) => void): () => void {
    this.listeners.push(listener);
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((l) => l(state));
  }

  /**
   * Prompt user to install the PWA
   */
  public async promptInstall(): Promise<boolean> {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        this.isInstalled = true;
        this.deferredPrompt = null;
        this.notifyListeners();
        return true;
      }
      return false;
    }

    if (this.isIOS && !this.isInstalled) {
      this.showIOSInstallModal();
      return true;
    }

    return false;
  }

  /**
   * Toggle native HTML5 Fullscreen for compact mobile gameplay
   */
  public async toggleFullscreen(): Promise<void> {
    try {
      const doc = document as any;
      const docEl = document.documentElement as any;

      if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        }
        this.isFullscreen = true;
      } else {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
        this.isFullscreen = false;
      }
    } catch (e) {
      console.warn('Fullscreen request could not be completed:', e);
    }
    this.notifyListeners();
  }

  /**
   * Show iOS Safari Add to Home Screen instructional modal
   */
  public showIOSInstallModal(): void {
    const existing = document.getElementById('pwa-ios-modal');
    if (existing) {
      existing.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'pwa-ios-modal';
    modal.innerHTML = `
      <div class="ios-modal-backdrop" id="ios-modal-close-bg"></div>
      <div class="ios-modal-card">
        <div class="ios-modal-header">
          <span class="ios-modal-title">Install Royal Fortune Slots</span>
          <button class="ios-modal-close" id="ios-modal-close-btn">&times;</button>
        </div>
        <p class="ios-modal-subtitle">Add this casino game to your iPhone / iPad home screen for instant full-screen play without browser bars:</p>
        <div class="ios-step">
          <div class="ios-step-num">1</div>
          <div class="ios-step-text">Tap the <strong>Share</strong> button <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; display:inline-block; margin-left:4px;"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> at the bottom of Safari.</div>
        </div>
        <div class="ios-step">
          <div class="ios-step-num">2</div>
          <div class="ios-step-text">Scroll down and select <strong>"Add to Home Screen"</strong> <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; display:inline-block; margin-left:4px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>.</div>
        </div>
        <div class="ios-step">
          <div class="ios-step-num">3</div>
          <div class="ios-step-text">Tap <strong>"Add"</strong> in the top-right. Launch from your home screen for pure compact full-screen action!</div>
        </div>
        <button class="ios-got-it-btn" id="ios-got-it">Got It</button>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.remove();
    document.getElementById('ios-modal-close-bg')?.addEventListener('click', close);
    document.getElementById('ios-modal-close-btn')?.addEventListener('click', close);
    document.getElementById('ios-got-it')?.addEventListener('click', close);
  }
}
