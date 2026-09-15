import { useEffect, useRef, useState, useCallback } from "react";
import type { BackendAvailability } from "../../hooks/useBackendAvailability";
import "./IntroCover.css";

export interface IntroCoverProps {
  backendStatus: BackendAvailability;
  onDismiss?: () => void;
}

const LINES = ["AUTOMATIC", "PANORAMA", "STITCHER"];
const ESTIMATED_COLD_START_SECONDS = 28;

export function IntroCover({ backendStatus, onDismiss }: IntroCoverProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isFullyClosed, setIsFullyClosed] = useState(false);
  const [countdown, setCountdown] = useState(ESTIMATED_COLD_START_SECONDS);

  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isTypingRef = useRef(false);
  const touchStartYRef = useRef<number | null>(null);

  const isReadyToEnter = backendStatus === "online" || backendStatus === "offline";

  // Simulate cold-start countdown while backend is waking or checking
  useEffect(() => {
    if (backendStatus !== "checking" && backendStatus !== "waking") return;

    const interval = setInterval(() => {
      setCountdown(prev => (prev > 1 ? prev - 1 : 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [backendStatus]);

  // Stepped typewriter animation (faithful to tokenme.limited algorithm)
  useEffect(() => {
    if (isTypingRef.current) return;
    isTypingRef.current = true;
    let cancelled = false;

    async function runTypewriter() {
      if (document.fonts?.ready) {
        try {
          await document.fonts.ready;
        } catch {
          // ignore font loading error in fallback environments
        }
      }
      if (cancelled) return;

      const elements = lineRefs.current.filter((el): el is HTMLDivElement => el !== null);
      if (elements.length === 0) return;

      // Measure target widths
      const widths = elements.map(el => {
        const prev = el.style.width;
        el.style.width = "max-content";
        const measured = el.getBoundingClientRect().width;
        el.style.width = prev;
        // In real browsers, measured is the true rendered width.
        // Fallback to proportional estimate ONLY in headless test environments (jsdom) where measured is 0.
        if (measured > 0) {
          return Math.ceil(measured);
        }
        return (el.textContent?.trim().length ?? 9) * 22;
      });

      // Type each line sequentially
      const perCharMs = [80, 95, 100];
      for (let i = 0; i < elements.length; i++) {
        if (cancelled) return;
        const el = elements[i];
        const isLast = i === elements.length - 1;
        const targetW = widths[i];
        const chars = Math.max(el.textContent?.trim().length ?? 1, 1);
        const duration = chars * perCharMs[i];

        el.style.borderRightColor = "#ffffff";
        if (isLast) el.classList.add("typing");

        await new Promise<void>(resolve => {
          const start = performance.now();
          function frame(now: number) {
            if (cancelled) {
              resolve();
              return;
            }
            const progress = Math.min((now - start) / duration, 1);
            const stepped = Math.floor(progress * chars) / chars;
            el.style.width = `${targetW * stepped}px`;

            if (progress < 1) {
              requestAnimationFrame(frame);
            } else {
              el.style.width = "max-content";
              if (isLast) {
                el.classList.remove("typing");
                el.classList.add("done");
              } else {
                el.style.borderRightColor = "transparent";
              }
              resolve();
            }
          }
          requestAnimationFrame(frame);
        });

        // Small pause between lines
        if (!isLast && !cancelled) {
          await new Promise(r => setTimeout(r, 160));
        }
      }
    }

    runTypewriter();

    return () => {
      cancelled = true;
      isTypingRef.current = false;
    };
  }, []);

  const handleDismiss = useCallback(() => {
    if (isDismissed) return;
    if (!isReadyToEnter) return;

    setIsDismissed(true);
    onDismiss?.();
  }, [isDismissed, isReadyToEnter, onDismiss]);

  // Touch handlers (Swipe Up for mobile)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartYRef.current === null) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartYRef.current;
    if (deltaY < -40) {
      touchStartYRef.current = null;
      handleDismiss();
    }
  }, [handleDismiss]);

  const handleTouchEnd = useCallback(() => {
    touchStartYRef.current = null;
  }, []);

  // Global listeners for scroll wheel and keyboard entry
  useEffect(() => {
    if (isDismissed || !isReadyToEnter) return;

    function onWheel(e: WheelEvent) {
      if (e.deltaY > 15) {
        handleDismiss();
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (["Space", "Enter", "ArrowUp"].includes(e.code)) {
        e.preventDefault();
        handleDismiss();
      }
    }

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isDismissed, isReadyToEnter, handleDismiss]);

  // If transition finishes and is dismissed, remove from accessibility tree
  const handleTransitionEnd = useCallback((e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && isDismissed) {
      setIsFullyClosed(true);
    }
  }, [isDismissed]);

  if (isFullyClosed) {
    return null;
  }

  return (
    <aside
      className={`intro-overlay ${isDismissed ? "is-dismissed" : ""}`}
      aria-label="Welcome screen"
      aria-hidden={isDismissed}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={isReadyToEnter ? handleDismiss : undefined}
      onTransitionEnd={handleTransitionEnd}
    >
      {/* Center: Giant Typography Stage */}
      <main className="intro-center">
        <div className="typewriter-stage" aria-label="AUTOMATIC PANORAMA STITCHER">
          {LINES.map((line, idx) => (
            <div
              key={line}
              ref={el => {
                lineRefs.current[idx] = el;
              }}
              className={`tw-line ${idx === LINES.length - 1 ? "last" : ""}`}
              data-text={line}
            >
              {line}
            </div>
          ))}
        </div>
      </main>

      <footer className="intro-bottom">
        {backendStatus === "online" ? (
          <div className="server-status-pill is-online">
            <span className="status-beacon">
              <span className="beacon-ring" />
              <span className="beacon-dot" />
            </span>
            <span>
              <strong className="status-badge">SERVER LIVE</strong> · Ready to stitch
            </span>
          </div>
        ) : backendStatus === "offline" ? (
          <div className="server-status-pill is-offline">
            <span className="status-beacon">
              <span className="beacon-dot" />
            </span>
            <span>
              <strong className="status-badge">SERVER OFFLINE</strong> · Tap to proceed anyway
            </span>
          </div>
        ) : (
          <div className="server-status-pill is-waking" role="status" aria-live="polite">
            <span className="status-beacon">
              <span className="beacon-ring" />
              <span className="beacon-dot" />
            </span>
            <span>
              <strong className="status-badge">WAKING SERVER</strong> · ~{countdown}s
            </span>
          </div>
        )}

        {/* Swipe Up / Enter Trigger Button */}
        <button
          type="button"
          className={`swipe-gate-trigger ${isReadyToEnter ? "is-ready" : ""}`}
          onClick={e => {
            e.stopPropagation();
            handleDismiss();
          }}
          disabled={!isReadyToEnter}
          aria-label="Swipe up or click to enter application"
        >
          <div className="swipe-chevron-wrap" aria-hidden="true">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </div>
          <div className="swipe-title">SWIPE UP TO ENTER</div>
          <div className="swipe-subtitle">or scroll / click / press space</div>
        </button>
      </footer>
    </aside>
  );
}
