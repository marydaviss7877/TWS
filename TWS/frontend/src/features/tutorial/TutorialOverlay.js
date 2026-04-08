/**
 * TutorialOverlay
 *
 * Renders the active tour (global onboarding OR a per-module tour) as a
 * portalled overlay on document.body.
 *
 * For steps WITH a target selector:
 *   - Measures the element via getBoundingClientRect
 *   - Draws a spotlight cutout using the box-shadow trick
 *   - Positions a tooltip card adjacent to the spotlit element
 *
 * For steps WITHOUT a target (position: 'center'):
 *   - Full-screen blurred dark backdrop
 *   - Centred card with optional large emoji illustration
 *
 * Navigation: Next / Back / Skip tour
 * Progress:   Animated dot row + progress-bar fill + "Step N of M" counter
 */

import React, { useLayoutEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useTutorial } from './TutorialContext';

// ── Constants ─────────────────────────────────────────────────────────────────
const TOOLTIP_W     = 340;
const SPOTLIGHT_PAD = 10;
const TOOLTIP_GAP   = 14;
const TOOLTIP_EST_H = 270;

// ── Module key → display label ────────────────────────────────────────────────
const MODULE_LABELS = {
  global:           'Getting Started',
  module_projects:  'Projects',
  module_hr:        'HR',
  module_finance:   'Finance',
  module_departments: 'Departments',
  module_users:     'Users',
  module_clients:   'Clients',
  module_documents: 'Documents',
  module_roles:     'Roles',
  module_permissions: 'Permissions',
  module_analytics: 'Analytics',
  'module_my-work': 'My Work',
  'module_time-tracking': 'Time Tracking',
  'module_employee-portal': 'Employee Portal',
  module_development: 'Development',
  module_settings:  'Settings',
  module_audit:     'Audit',
  module_operations: 'Operations',
};

// ── Spotlight measurement ─────────────────────────────────────────────────────
function useSpotlightRect(selector, isActive) {
  const [rect, setRect] = useState(null);

  useLayoutEffect(() => {
    if (!isActive || !selector) { setRect(null); return; }

    const measure = () => {
      const el = document.querySelector(selector);
      if (!el) { setRect(null); return; }
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    const t = setTimeout(measure, 80);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { passive: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure);
    };
  }, [selector, isActive]);

  return rect;
}

// ── Tooltip position calculator ───────────────────────────────────────────────
function getTooltipStyle(rect, position) {
  const vpW = window.innerWidth;
  const vpH = window.innerHeight;

  if (!rect || position === 'center') {
    const w = Math.min(TOOLTIP_W, vpW - 32);
    return { position: 'fixed', top: vpH / 2 - TOOLTIP_EST_H / 2, left: vpW / 2 - w / 2, width: w };
  }

  const pad      = SPOTLIGHT_PAD;
  const sTop     = rect.top  - pad;
  const sLeft    = rect.left - pad;
  const sRight   = rect.left + rect.width  + pad;
  const sBottom  = rect.top  + rect.height + pad;
  const sCenterX = rect.left + rect.width  / 2;
  const w        = Math.min(TOOLTIP_W, vpW - 16);
  const clamp    = (l) => Math.max(8, Math.min(l, vpW - w - 8));

  switch (position) {
    case 'top':         return { position: 'fixed', bottom: vpH - sTop + TOOLTIP_GAP, left: clamp(sCenterX - w / 2), width: w };
    case 'bottom-left': return { position: 'fixed', top: sBottom + TOOLTIP_GAP, left: clamp(sRight - w), width: w };
    case 'bottom-right':return { position: 'fixed', top: sBottom + TOOLTIP_GAP, left: clamp(sLeft), width: w };
    default:            return { position: 'fixed', top: sBottom + TOOLTIP_GAP, left: clamp(sCenterX - w / 2), width: w };
  }
}

// ── Inline SVG arrows ─────────────────────────────────────────────────────────
const ArrowRight = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 14, height: 14, display: 'inline', flexShrink: 0 }}>
    <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
  </svg>
);
const ArrowLeft = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 14, height: 14, display: 'inline', flexShrink: 0 }}>
    <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
  </svg>
);

// ── Colour palette ────────────────────────────────────────────────────────────
const C = {
  primary:     '#6366f1',
  primaryDark: '#4f46e5',
  primaryGrad: 'linear-gradient(135deg, #6366f1, #818cf8)',
  text:        '#111827',
  textMuted:   '#6b7280',
  border:      '#e5e7eb',
  bg:          '#ffffff',
  barBg:       '#f3f4f6',
  dotDone:     '#a5b4fc',
  dotFuture:   '#e5e7eb',
  moduleBadge: '#ede9fe',
  moduleBadgeText: '#6d28d9',
};

// ── Main component ────────────────────────────────────────────────────────────
const TutorialOverlay = () => {
  const tutorial = useTutorial();

  // Re-render on resize so positions stay accurate
  const [, forceUpdate] = useState(0);
  useLayoutEffect(() => {
    if (!tutorial?.isActive) return;
    const h = () => forceUpdate(n => n + 1);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, [tutorial?.isActive]);

  const {
    activeTour,
    isActive,
    stepIndex,
    totalSteps,
    steps,
    nextStep,
    prevStep,
    completeTour,
    skipTour,
  } = tutorial || {};

  const step     = steps?.[stepIndex];
  const spotRect = useSpotlightRect(step?.target, isActive);

  const handleNext = useCallback(() => {
    if (stepIndex >= totalSteps - 1) completeTour();
    else nextStep();
  }, [stepIndex, totalSteps, completeTour, nextStep]);

  if (!isActive || !step) return null;

  const isFirst      = stepIndex === 0;
  const isLast       = stepIndex === totalSteps - 1;
  const hasSpotlight = Boolean(step.target && spotRect);
  const progress     = ((stepIndex + 1) / totalSteps) * 100;
  const tourKey      = activeTour?.key ?? 'global';
  const isGlobal     = tourKey === 'global';
  const moduleLabel  = MODULE_LABELS[tourKey] ?? tourKey.replace('module_', '');

  // ── Spotlight style ─────────────────────────────────────────────────────────
  const spotlightStyle = hasSpotlight ? {
    position:  'fixed',
    top:       spotRect.top  - SPOTLIGHT_PAD,
    left:      spotRect.left - SPOTLIGHT_PAD,
    width:     spotRect.width  + SPOTLIGHT_PAD * 2,
    height:    spotRect.height + SPOTLIGHT_PAD * 2,
    borderRadius: 10,
    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.60)',
    zIndex:    9997,
    pointerEvents: 'none',
    outline:   `2px solid ${C.primary}`,
    outlineOffset: 1,
  } : null;

  const tooltipStyle = {
    ...getTooltipStyle(spotRect, step.position),
    zIndex:    9999,
    pointerEvents: 'all',
    backgroundColor: C.bg,
    borderRadius: 16,
    boxShadow: '0 25px 60px rgba(0,0,0,0.25), 0 8px 20px rgba(0,0,0,0.12)',
    border:    `1px solid ${C.border}`,
    overflow:  'hidden',
    fontFamily: 'inherit',
  };

  const overlay = (
    <>
      {/* Click-blocker: prevents accidental interaction with the app behind */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 9996, pointerEvents: 'all', cursor: 'default' }} />

      {/* Dark backdrop for centre-modal steps */}
      {!hasSpotlight && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9997,
          background: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          pointerEvents: 'none',
        }} />
      )}

      {/* Spotlight cutout */}
      {hasSpotlight && <div style={spotlightStyle} />}

      {/* ── Tooltip card ─────────────────────────────────────────────────────── */}
      <div style={tooltipStyle}>

        {/* Progress bar */}
        <div style={{ height: 3, background: C.barBg }}>
          <div style={{
            height: '100%', width: `${progress}%`,
            background: C.primaryGrad,
            transition: 'width 0.35s ease',
          }} />
        </div>

        {/* Card body */}
        <div style={{ padding: '18px 20px 0' }}>

          {/* Module badge (only for module tours) */}
          {!isGlobal && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: C.moduleBadge, color: C.moduleBadgeText,
              borderRadius: 99, padding: '2px 10px 2px 8px',
              fontSize: 11, fontWeight: 700,
              marginBottom: 10,
            }}>
              <span style={{ fontSize: 13 }}>📦</span>
              {moduleLabel} Module Tour
            </div>
          )}

          {/* Illustration emoji */}
          {step.illustration && (
            <div style={{ textAlign: 'center', fontSize: 44, lineHeight: 1, marginBottom: 10 }}>
              {step.illustration}
            </div>
          )}

          {/* Step counter */}
          <p style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: C.primary, marginBottom: 4,
          }}>
            Step {stepIndex + 1} of {totalSteps}
          </p>

          {/* Title */}
          <h3 style={{
            fontSize: 15, fontWeight: 700, color: C.text,
            margin: '0 0 8px', lineHeight: 1.3,
          }}>
            {step.title}
          </h3>

          {/* Body */}
          <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.65, margin: 0 }}>
            {step.body}
          </p>
        </div>

        {/* Dot progress indicators */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 5, padding: '12px 20px 0' }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              borderRadius: 99, height: 6,
              width: i === stepIndex ? 20 : 6,
              background: i === stepIndex ? C.primary : i < stepIndex ? C.dotDone : C.dotFuture,
              transition: 'all 0.25s ease',
            }} />
          ))}
        </div>

        {/* Action row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px 16px', gap: 8,
        }}>
          {/* Skip */}
          <button
            type="button"
            onClick={skipTour}
            style={{
              background: 'none', border: 'none', padding: '4px 0',
              fontSize: 12, color: C.textMuted, cursor: 'pointer',
              textDecoration: 'underline', textDecorationColor: 'transparent',
              fontFamily: 'inherit', transition: 'color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#374151'; e.currentTarget.style.textDecorationColor = '#9ca3af'; }}
            onMouseLeave={e => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.textDecorationColor = 'transparent'; }}
          >
            Skip tour
          </button>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Back */}
            {!isFirst && (
              <button
                type="button"
                onClick={prevStep}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 14px', borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  background: '#f9fafb',
                  fontSize: 13, fontWeight: 500, color: '#374151',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f9fafb'; }}
              >
                <ArrowLeft /> Back
              </button>
            )}

            {/* Next / Done */}
            <button
              type="button"
              onClick={handleNext}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '7px 18px', borderRadius: 8,
                border: 'none',
                background: C.primaryGrad,
                fontSize: 13, fontWeight: 600, color: '#fff',
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
                transition: 'opacity 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(99,102,241,0.45)'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1';   e.currentTarget.style.boxShadow = '0 2px 8px rgba(99,102,241,0.35)'; }}
            >
              {isLast ? "Got it!" : 'Next'}
              {!isLast && <ArrowRight />}
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return ReactDOM.createPortal(overlay, document.body);
};

export default TutorialOverlay;
