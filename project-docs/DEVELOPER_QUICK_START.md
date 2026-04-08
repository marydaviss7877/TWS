# Developer Quick Start Checklist
## TenantOrgLayout Refactoring - Day-by-Day Guide

---

## PRE-FLIGHT CHECKLIST

Before starting, ensure you have:
- [ ] Access to codebase repository
- [ ] Development environment set up
- [ ] Feature flag system access
- [ ] Performance monitoring tools access
- [ ] Testing framework configured
- [ ] Design system documentation access

---

## DAY 1-2: SETUP & PREPARATION

### Morning: Environment Setup
- [ ] Clone repository and create `refactor/` branch
- [ ] Install dependencies: `npm install`
- [ ] Set up feature flag system
- [ ] Configure ESLint rules for z-index usage
- [ ] Set up Storybook for component testing

### Afternoon: Baseline Metrics
- [ ] Run Lighthouse audit (save results)
- [ ] Capture Web Vitals (CLS, FID, LCP)
- [ ] Document current z-index values
- [ ] Measure header height (64px baseline)
- [ ] Record sidebar widths
- [ ] Create visual regression test baseline

### End of Day Checklist
- [ ] Feature flags created and working
- [ ] Baseline metrics documented
- [ ] Testing infrastructure ready
- [ ] Ready to start Phase 1

---

## DAY 3: Z-INDEX STANDARDIZATION

### Step-by-Step Implementation

**Step 1: Create Constants File** (30 min)
```bash
# Create file: src/shared/constants/zIndex.js
```
- [ ] Copy z-index constants from `CRITICAL_FIXES_QUICK_REFERENCE.md`
- [ ] Export Z_INDEX object
- [ ] Add JSDoc comments

**Step 2: Update CSS** (1 hour)
- [ ] Open `TenantOrgLayout.css`
- [ ] Add new z-index classes (`.z-dropdown`, `.z-sticky`, etc.)
- [ ] Keep depth-layer classes for backward compat
- [ ] Test CSS compilation

**Step 3: Update TenantOrgLayout.js** (2 hours)
- [ ] Import Z_INDEX constants
- [ ] Replace `z-50` → `z-[1010]` (line 618)
- [ ] Replace `z-[9999]` → `z-[1050]` (lines 648, 800, 884)
- [ ] Replace `z-30` → `z-[1020]` (line 749)
- [ ] Replace `z-40` → `z-[1030]` (line 921)
- [ ] Replace `z-50` → `z-[1020]` (line 950)
- [ ] Replace `z-[60]` → `z-[1050]` (line 1001)
- [ ] Replace `z-10` → `z-[10]` (lines 1019, 1023)

**Step 4: Update CommandPalette.js** (30 min)
- [ ] Replace `z-[10000]` → `z-[1040]` (line 196)

**Step 5: Testing** (1 hour)
- [ ] Test mobile add menu dropdown
- [ ] Test desktop add menu dropdown
- [ ] Test user menu dropdown (mobile & desktop)
- [ ] Test command palette
- [ ] Test tooltips
- [ ] Visual regression test

### End of Day Checklist
- [ ] All z-index values updated
- [ ] All dropdowns render correctly
- [ ] No visual regressions
- [ ] Tests passing
- [ ] Code reviewed

---

## DAY 4: HEADER HEIGHT DYNAMIC CALCULATION

### Step-by-Step Implementation

**Step 1: Create Hook** (1 hour)
```bash
# Create file: src/shared/hooks/useHeaderHeight.js
```
- [ ] Copy hook code from `CRITICAL_FIXES_QUICK_REFERENCE.md`
- [ ] Add TypeScript types (if using TS)
- [ ] Add error handling
- [ ] Test hook in isolation

**Step 2: Update TenantOrgLayout.js** (2 hours)
- [ ] Import `useHeaderHeight` hook
- [ ] Call hook: `const [headerHeight] = useHeaderHeight()`
- [ ] Remove `lg:pt-[64px]` from main element (line 1023)
- [ ] Add `style={{ paddingTop: `${headerHeight}px` }}`
- [ ] Add CSS fallback for SSR

**Step 3: Add CSS Fallback** (30 min)
- [ ] Add `.main-content { padding-top: 64px; }` fallback
- [ ] Add `@media (min-width: 1024px)` override
- [ ] Test SSR hydration

**Step 4: Testing** (1.5 hours)
- [ ] Test header height changes don't clip content
- [ ] Test responsive behavior (mobile/tablet/desktop)
- [ ] Test window resize
- [ ] Test SSR hydration (no jump)
- [ ] Measure CLS score (should be < 0.1)

### End of Day Checklist
- [ ] Header height dynamically calculated
- [ ] Content never clipped
- [ ] CLS < 0.1
- [ ] Works on all viewport sizes
- [ ] Tests passing

---

## DAY 5: DROPDOWN CLICK-OUTSIDE FIX

### Step-by-Step Implementation

**Step 1: Create Hook** (1 hour)
```bash
# Create file: src/shared/hooks/useClickOutside.js
```
- [ ] Copy hook code from `CRITICAL_FIXES_QUICK_REFERENCE.md`
- [ ] Add TypeScript types
- [ ] Add tests for hook

**Step 2: Update TenantOrgLayout.js** (2 hours)
- [ ] Import `useClickOutside` hook
- [ ] Remove lines 320-336 (old click-outside logic)
- [ ] Add hook calls:
  ```javascript
  const userMenuRef = useRef(null);
  const addMenuRef = useRef(null);
  
  useClickOutside(userMenuRef, () => setUserMenuOpen(false));
  useClickOutside(addMenuRef, () => setAddMenuOpen(false));
  ```
- [ ] Add `ref={userMenuRef}` to user menu container
- [ ] Add `ref={addMenuRef}` to add menu container

**Step 3: Testing** (1 hour)
- [ ] Test click outside closes dropdown
- [ ] Test click inside keeps dropdown open
- [ ] Test no double-toggle issues
- [ ] Test mobile touch events
- [ ] Test ESC key still works

### End of Day Checklist
- [ ] Click-outside logic fixed
- [ ] No race conditions
- [ ] Mobile touch events work
- [ ] Keyboard navigation works
- [ ] Tests passing

---

## DAY 6: SCROLL PERFORMANCE OPTIMIZATION

### Step-by-Step Implementation

**Step 1: Create Throttle Utility** (30 min)
```bash
# Create file: src/shared/utils/throttle.js
```
- [ ] Copy throttle code from `CRITICAL_FIXES_QUICK_REFERENCE.md`
- [ ] Add JSDoc comments
- [ ] Add unit tests

**Step 2: Update Scroll Handler** (2 hours)
- [ ] Import throttle utility
- [ ] Wrap `handleScroll` with throttle
- [ ] Keep `requestAnimationFrame` for smooth animations
- [ ] Test throttle delay (100ms recommended)

**Step 3: Add Performance Monitoring** (1 hour)
- [ ] Add FPS counter (dev mode only)
- [ ] Log scroll performance metrics
- [ ] Ensure 60fps maintained

**Step 4: Testing** (1.5 hours)
- [ ] Test smooth scrolling (60fps)
- [ ] Test header toggle doesn't lag
- [ ] Test on mobile device (battery usage)
- [ ] Profile CPU usage
- [ ] Compare before/after metrics

### End of Day Checklist
- [ ] Scroll handler throttled
- [ ] 60fps maintained
- [ ] CPU usage reduced
- [ ] Mobile battery usage improved
- [ ] Performance metrics documented

---

## DAY 7: EVENT LISTENER CLEANUP

### Step-by-Step Implementation

**Step 1: Fix Scroll Listener Cleanup** (1 hour)
- [ ] Update cleanup function (lines 117-125)
- [ ] Add null check for `mainContentRef.current`
- [ ] Ensure proper cleanup order

**Step 2: Fix Resize Listener Cleanup** (30 min)
- [ ] Check all resize listeners
- [ ] Ensure proper cleanup
- [ ] Add null checks

**Step 3: Fix Fullscreen Listener Cleanup** (30 min)
- [ ] Check fullscreen listeners (lines 134-156)
- [ ] Ensure all 4 event types cleaned up
- [ ] Add error handling

**Step 4: Fix Keyboard Listener Cleanup** (30 min)
- [ ] Check keyboard listeners (lines 159-201)
- [ ] Ensure proper cleanup
- [ ] Test keyboard shortcuts still work

**Step 5: Memory Leak Testing** (1 hour)
- [ ] Use React DevTools Profiler
- [ ] Navigate away and back 10 times
- [ ] Check event listener count doesn't increase
- [ ] Check memory usage stable
- [ ] No console warnings

### End of Day Checklist
- [ ] All event listeners properly cleaned up
- [ ] No memory leaks detected
- [ ] No console warnings
- [ ] All functionality still works
- [ ] Tests passing

---

## WEEK 1 COMPLETE CHECKLIST

Before moving to Week 2:
- [ ] All Phase 1 tasks complete
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Performance metrics improved
- [ ] No visual regressions
- [ ] Documentation updated
- [ ] Feature flags tested
- [ ] Ready for Phase 2

---

## WEEK 2: LAYOUT & RESPONSIVE (Quick Reference)

### Day 8-9: Layout Shift Prevention
- [ ] Fix header toggle (use transform instead of height)
- [ ] Fix sidebar collapse (reserve space or absolute)
- [ ] Add CSS variables for sidebar widths
- [ ] Test CLS < 0.1

### Day 10-11: Breakpoint Standardization
- [ ] Create unified breakpoint system
- [ ] Replace all `window.innerWidth` checks
- [ ] Add tablet optimizations
- [ ] Add ultrawide support
- [ ] Test all breakpoints

### Day 12-13: Table Overflow
- [ ] Create TableWrapper component
- [ ] Document usage
- [ ] Test wide tables

### Day 14: Spacing & Typography
- [ ] Create spacing scale
- [ ] Standardize padding/margins
- [ ] Implement responsive typography
- [ ] Test visual consistency

---

## WEEK 3: PERFORMANCE (Quick Reference)

### Day 15-16: Component Memoization
- [ ] Memoize `renderMenuItem`
- [ ] Memoize filtered menu items
- [ ] Add React.memo to child components
- [ ] Profile re-renders

### Day 17: Backdrop Filter Optimization
- [ ] Add fallbacks
- [ ] Reduce mobile blur
- [ ] Test performance

### Day 18: Animation Performance
- [ ] Add GPU acceleration
- [ ] Standardize durations
- [ ] Optimize properties

### Day 19-20: Bundle Size
- [ ] Analyze bundle
- [ ] Code splitting
- [ ] Tree shaking
- [ ] Optimize imports

### Day 21: Loading States
- [ ] Fix auth loading
- [ ] Improve skeletons
- [ ] Add error boundaries

---

## WEEK 4: NAVIGATION & UX (Quick Reference)

### Day 22-24: Navigation Consolidation
- [ ] Design unified system
- [ ] Create UnifiedSidebar component
- [ ] Migrate from triple nav
- [ ] Test all navigation

### Day 25: Breadcrumb Navigation
- [ ] Create Breadcrumbs component
- [ ] Integrate into layout
- [ ] Test navigation

### Day 26: Command Palette
- [ ] Add visual indicators
- [ ] Connect mobile search
- [ ] Improve discoverability

### Day 27-28: Menu Filtering
- [ ] Extract to hook
- [ ] Add visual indicators
- [ ] Standardize naming

---

## WEEK 5: DESIGN SYSTEM (Quick Reference)

### Day 29-30: Design Tokens
- [ ] Create token system
- [ ] Migrate colors
- [ ] Standardize shadows
- [ ] Standardize radius

### Day 31: Glass Morphism
- [ ] Create glass components
- [ ] Ensure consistency
- [ ] Document usage

### Day 32-33: Accessibility
- [ ] ARIA labels
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] WCAG 2.1 AA compliance

### Day 34: Animation Duration
- [ ] Define scale
- [ ] Standardize durations
- [ ] Document usage

### Day 35: Documentation
- [ ] Component docs
- [ ] Design system docs
- [ ] Migration guide
- [ ] Update README

---

## DAILY WORKFLOW

### Morning Routine
1. Pull latest changes
2. Review yesterday's work
3. Check for any issues/PRs
4. Plan today's tasks

### Development Workflow
1. Create feature branch from `refactor/`
2. Implement changes
3. Write/update tests
4. Test locally
5. Run linter/formatter
6. Commit with descriptive message
7. Push and create PR

### End of Day Routine
1. Update progress checklist
2. Document any blockers
3. Commit and push work
4. Update team on progress

---

## TESTING CHECKLIST (Apply Daily)

### Before Committing
- [ ] Code compiles without errors
- [ ] Linter passes
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Visual regression tests pass
- [ ] Manual testing complete
- [ ] Performance metrics checked

### Before PR Review
- [ ] All tests passing
- [ ] Code reviewed by self
- [ ] Documentation updated
- [ ] No console errors/warnings
- [ ] Feature flag tested
- [ ] Rollback plan documented

### Before Merging
- [ ] Code reviewed and approved
- [ ] All tests passing in CI
- [ ] Performance benchmarks met
- [ ] No visual regressions
- [ ] Feature flag ready for testing

---

## TROUBLESHOOTING GUIDE

### Issue: Z-index conflicts still occurring
**Solution:** Check for inline styles overriding classes, ensure CSS specificity correct

### Issue: Header height calculation fails
**Solution:** Check ResizeObserver support, add fallback to 64px

### Issue: Dropdowns still have race conditions
**Solution:** Ensure event listeners use capture phase, check event propagation

### Issue: Scroll performance still janky
**Solution:** Increase throttle delay, check for other scroll listeners

### Issue: Memory leaks detected
**Solution:** Use React DevTools Profiler, check all cleanup functions

### Issue: Tests failing
**Solution:** Check test environment, update snapshots if needed

---

## RESOURCES

### Documentation
- `UI_UX_AUDIT_REPORT.md` - Full audit details
- `CRITICAL_FIXES_QUICK_REFERENCE.md` - Code snippets
- `ARCHITECTURE_ISSUES_DIAGRAM.md` - Visual diagrams
- `IMPLEMENTATION_PLAN.md` - Detailed plan

### Tools
- React DevTools Profiler
- Lighthouse CI
- Web Vitals extension
- Visual regression testing

### Support
- Team Slack channel: #refactoring-support
- Daily standup: 9:00 AM
- Code review: Within 24 hours
- Emergency contact: [Team Lead]

---

## SUCCESS CRITERIA

### Phase 1 Complete When:
- ✅ All dropdowns work correctly
- ✅ No z-index conflicts
- ✅ Header doesn't clip content
- ✅ Scroll performance improved
- ✅ No memory leaks

### Project Complete When:
- ✅ All 5 phases complete
- ✅ All tests passing
- ✅ Performance benchmarks met
- ✅ Documentation complete
- ✅ Feature flags removed
- ✅ Production deployment successful

---

*Last Updated: February 11, 2026*  
*For questions, refer to IMPLEMENTATION_PLAN.md*
