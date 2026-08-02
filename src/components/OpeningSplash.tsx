import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * The splash should play once when the tab is first opened — not every time the
 * component remounts (which happened on every return from the sign-in screen).
 *
 * The flag is set when the splash FINISHES, never when it starts. Setting it on
 * start deadlocked under React StrictMode, which mounts, cleans up, then mounts
 * again: the first mount set the flag, the cleanup cancelled the hide timers,
 * and the second mount skipped scheduling them — leaving a full-screen
 * "Loading…" overlay stuck over a perfectly working app.
 */
let hasFinishedThisSession = false;

export const OpeningSplash: React.FC<{ onFinish?: () => void }> = ({ onFinish }) => {
  const [isVisible, setIsVisible] = useState(!hasFinishedThisSession);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (hasFinishedThisSession) return;

    const fadeTimer = window.setTimeout(() => setIsFadingOut(true), 2400);
    const hideTimer = window.setTimeout(() => {
      hasFinishedThisSession = true;
      setIsVisible(false);
      onFinish?.();
    }, 2900);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, [onFinish]);

  if (!isVisible) return null;

  return (
    <div className={`opening-splash-overlay ${isFadingOut ? 'fade-out' : ''}`}>
      <img src="/openingimage.png" alt="" className="splash-bg-blur" />
      <img src="/openingimage.png" alt="" className="splash-fullscreen-bg" />

      <div className="splash-center-container">
        <div className="splash-loading-wrapper">
          <div className="splash-spinner-ring">
            <Loader2 size={40} className="splash-spinner-icon" />
          </div>
          <span className="splash-loading-label">Loading…</span>
        </div>
      </div>
    </div>
  );
};
