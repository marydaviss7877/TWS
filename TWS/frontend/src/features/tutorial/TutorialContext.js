/**
 * TutorialContext
 *
 * Manages one active tour at a time (global onboarding or a per-module tour).
 *
 * Tour identity is a string key used for localStorage persistence:
 *   - Global tour      → key: 'global'   → localStorage: tws_tour_done_{userId}_global
 *   - Module tours     → key: 'module_X' → localStorage: tws_tour_done_{userId}_module_X
 *
 * Public API:
 *   activeTour         – { key, steps, stepIndex } | null
 *   startTour(key, steps)      – start any named tour
 *   startTutorial()            – convenience: start the global onboarding tour
 *   startModuleTour(moduleKey) – start a module tour (no-op if already done)
 *   nextStep()
 *   prevStep()
 *   completeTour()     – marks done in localStorage + clears activeTour
 *   skipTour()         – alias of completeTour
 *   isTutorialDone()           – whether global tour is done
 *   isModuleTourDone(moduleKey)
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { TUTORIAL_STEPS } from './tutorialSteps';
import { MODULE_STEPS } from './moduleTutorialSteps';

const TutorialContext = createContext(null);

export const useTutorial = () => useContext(TutorialContext);

// ── Storage helpers ───────────────────────────────────────────────────────────
function makeKey(userId, tourKey) {
  return userId ? `tws_tour_done_${userId}_${tourKey}` : null;
}

function isDone(userId, tourKey) {
  const k = makeKey(userId, tourKey);
  if (!k) return false;
  try { return localStorage.getItem(k) === '1'; } catch (_) { return false; }
}

function markDone(userId, tourKey) {
  const k = makeKey(userId, tourKey);
  if (!k) return;
  try { localStorage.setItem(k, '1'); } catch (_) {}
}

// ── Provider ──────────────────────────────────────────────────────────────────
export const TutorialProvider = ({ children, userId }) => {
  // activeTour = { key: string, steps: Step[], stepIndex: number } | null
  const [activeTour, setActiveTour] = useState(null);

  // ── Start any named tour ────────────────────────────────────────────────────
  const startTour = useCallback((key, steps) => {
    if (!steps?.length) return;
    setActiveTour({ key, steps, stepIndex: 0 });
  }, []);

  // ── Global onboarding tour ──────────────────────────────────────────────────
  const startTutorial = useCallback(() => {
    startTour('global', TUTORIAL_STEPS);
  }, [startTour]);

  const isTutorialDone = useCallback(() => {
    return isDone(userId, 'global');
  }, [userId]);

  // ── Module tours ────────────────────────────────────────────────────────────
  const startModuleTour = useCallback((moduleKey) => {
    const steps = MODULE_STEPS[moduleKey];
    if (!steps) return;
    if (isDone(userId, `module_${moduleKey}`)) return;
    startTour(`module_${moduleKey}`, steps);
  }, [userId, startTour]);

  const isModuleTourDone = useCallback((moduleKey) => {
    return isDone(userId, `module_${moduleKey}`);
  }, [userId]);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const nextStep = useCallback(() => {
    setActiveTour(prev => {
      if (!prev) return prev;
      const next = prev.stepIndex + 1;
      if (next >= prev.steps.length) return prev; // guard: completeTour handles last
      return { ...prev, stepIndex: next };
    });
  }, []);

  const prevStep = useCallback(() => {
    setActiveTour(prev => {
      if (!prev) return prev;
      return { ...prev, stepIndex: Math.max(0, prev.stepIndex - 1) };
    });
  }, []);

  // ── Complete / skip ─────────────────────────────────────────────────────────
  const completeTour = useCallback(() => {
    setActiveTour(prev => {
      if (prev) markDone(userId, prev.key);
      return null;
    });
  }, [userId]);

  const value = useMemo(() => ({
    activeTour,
    startTour,
    startTutorial,
    startModuleTour,
    nextStep,
    prevStep,
    completeTour,
    skipTour: completeTour,
    // Legacy aliases used by AppHome & OdooTopBar (global tour)
    isTutorialDone,
    isModuleTourDone,
    // Legacy shape used by TutorialOverlay (global tour path)
    isActive:   Boolean(activeTour),
    stepIndex:  activeTour?.stepIndex ?? 0,
    totalSteps: activeTour?.steps?.length ?? 0,
    steps:      activeTour?.steps ?? [],
    completeTutorial: completeTour,
    skipTutorial: completeTour,
  }), [
    activeTour, startTour, startTutorial, startModuleTour,
    nextStep, prevStep, completeTour, isTutorialDone, isModuleTourDone,
  ]);

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
};
