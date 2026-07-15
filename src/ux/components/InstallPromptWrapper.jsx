/**
 * InstallPromptWrapper.jsx
 * UX-system-aware PWA install prompt.
 * Replaces InstallPrompt.jsx — uses campaign dismissal for storage.
 */

import { useState, useEffect } from 'react';
import { X, Share, PlusSquare, Download } from 'lucide-react';
import { useUX } from '../UXProvider';

function getOS() {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
}

export default function InstallPromptWrapper() {
  const { dismiss } = useUX();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow]   = useState(false);
  const [os, setOs]       = useState('desktop');

  useEffect(() => {
    if (isInStandaloneMode()) return;
    // Check if permanently dismissed via campaign storage
    const phone = localStorage.getItem('auth_phone') || 'anon';
    if (localStorage.getItem(`ux_pwa-install-v1_${phone}`)) return;

    const platform = getOS();
    setOs(platform);

    if (platform === 'android' || platform === 'desktop') {
      const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); setShow(true); };
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }
    if (platform === 'ios') setShow(true);
  }, []);

  function handleDismiss(permanent = true) {
    setShow(false);
    if (permanent) {
      const phone = localStorage.getItem('auth_phone') || 'anon';
      dismiss('pwa-install-v1');
      localStorage.setItem(`ux_pwa-install-v1_${phone}`, '1');
    }
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    handleDismiss(outcome === 'accepted');
    setDeferredPrompt(null);
  }

  if (!show) return null;

  return (
    <div className="install-prompt-overlay">
      <div className="install-prompt">
        <button className="install-dismiss" onClick={() => handleDismiss(true)} aria-label="Dismiss">
          <X size={18} />
        </button>
        <div className="install-icon">
          <img src="/favicon.svg" alt="IX HF" width={48} height={48} style={{ borderRadius: 12 }} />
        </div>
        <h3 className="install-title">Add IX HF to your Home Screen</h3>
        <p className="install-sub">Access homework, attendance, and notices instantly — no browser needed.</p>

        {os === 'ios' ? (
          <ol className="install-steps">
            <li>Tap the <strong>Share</strong> button <Share size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> in Safari</li>
            <li>Scroll down and tap <strong>"Add to Home Screen"</strong> <PlusSquare size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /></li>
            <li>Tap <strong>Add</strong></li>
          </ol>
        ) : (
          <button className="install-btn" onClick={handleInstall}>
            <Download size={16} /> Install App
          </button>
        )}
        <button className="install-later" onClick={() => handleDismiss(false)}>Maybe later</button>
      </div>
    </div>
  );
}
