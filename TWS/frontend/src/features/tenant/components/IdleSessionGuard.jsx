import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import {
  IDLE_LIMIT_MS,
  IDLE_WARNING_THRESHOLD_MS,
} from '../constants/tenantSessionPolicy';

const CHECK_INTERVAL_MS = 1000;
const MOUSEMOVE_THROTTLE_MS = 30000;

/**
 * Logs the user out after a period of UI inactivity, with a final warning window.
 * Uses real logout (caller) so cookies / refresh tokens are cleared on the server.
 */
const IdleSessionGuard = ({ enabled, onLogout }) => {
  const lastActivityRef = useRef(Date.now());
  const logoutDeadlineRef = useRef(null);
  const mouseThrottleRef = useRef(0);
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const loggingOutRef = useRef(false);

  const markActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    logoutDeadlineRef.current = null;
    setShowWarning(false);
  }, []);

  const performLogout = useCallback(async () => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    setShowWarning(false);
    logoutDeadlineRef.current = null;
    try {
      await onLogout?.();
    } finally {
      loggingOutRef.current = false;
    }
  }, [onLogout]);

  const extendSession = useCallback(() => {
    if (loggingOutRef.current) return;
    markActivity();
  }, [markActivity]);

  // User input → reset idle clock
  useEffect(() => {
    if (!enabled) return undefined;

    const onPointer = () => {
      markActivity();
    };

    const onMouseMove = () => {
      const now = Date.now();
      if (now - mouseThrottleRef.current < MOUSEMOVE_THROTTLE_MS) return;
      mouseThrottleRef.current = now;
      markActivity();
    };

    const onKeyDown = () => {
      markActivity();
    };

    const onScroll = () => {
      markActivity();
    };

    window.addEventListener('mousedown', onPointer, { capture: true, passive: true });
    window.addEventListener('touchstart', onPointer, { capture: true, passive: true });
    window.addEventListener('mousemove', onMouseMove, { capture: true, passive: true });
    window.addEventListener('keydown', onKeyDown, { capture: true, passive: true });
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });

    return () => {
      window.removeEventListener('mousedown', onPointer, { capture: true });
      window.removeEventListener('touchstart', onPointer, { capture: true });
      window.removeEventListener('mousemove', onMouseMove, { capture: true });
      window.removeEventListener('keydown', onKeyDown, { capture: true });
      window.removeEventListener('scroll', onScroll, { capture: true });
    };
  }, [enabled, markActivity]);

  // Tick: warning UI + hard logout at deadline
  useEffect(() => {
    if (!enabled) return undefined;

    const tick = () => {
      if (document.visibilityState !== 'visible') return;

      const idleMs = Date.now() - lastActivityRef.current;

      if (idleMs >= IDLE_LIMIT_MS) {
        performLogout();
        return;
      }

      if (logoutDeadlineRef.current != null) {
        const remaining = Math.ceil((logoutDeadlineRef.current - Date.now()) / 1000);
        setSecondsLeft(Math.max(0, remaining));
        if (Date.now() >= logoutDeadlineRef.current) {
          performLogout();
        }
        return;
      }

      if (idleMs >= IDLE_WARNING_THRESHOLD_MS) {
        logoutDeadlineRef.current = lastActivityRef.current + IDLE_LIMIT_MS;
        setShowWarning(true);
        setSecondsLeft(Math.ceil((logoutDeadlineRef.current - Date.now()) / 1000));
      }
    };

    tick();
    const id = window.setInterval(tick, CHECK_INTERVAL_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [enabled, performLogout]);

  return (
    <Dialog
      open={showWarning}
      onOpenChange={(open) => {
        if (!open && !loggingOutRef.current) extendSession();
      }}
    >
      <DialogContent showClose className="sm:max-w-md" onPointerDown={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Signing out soon</DialogTitle>
          <DialogDescription>
            You have been inactive in this workspace. For security, you will be signed out in{' '}
            <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
              {secondsLeft}
            </span>{' '}
            second{secondsLeft === 1 ? '' : 's'} unless you continue.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Tip: save any open forms. You can reopen the full policy anytime from{' '}
          <span className="font-medium">Org rule book</span> in the app menu.
        </p>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="default" onClick={extendSession}>
            Stay signed in
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default IdleSessionGuard;
