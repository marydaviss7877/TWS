# TenantOrgLayout Fix Implementation Plan
## Comprehensive Refactoring Roadmap

**Estimated Total Duration:** 4-6 weeks  
**Team Size:** 1-2 Frontend Engineers  
**Risk Level:** Medium (managed through phased rollout)

---

## PHASE 0: PREPARATION & SETUP (Days 1-2)

### Objectives
- Set up testing infrastructure
- Create feature flags for gradual rollout
- Document current behavior (baseline metrics)

### Tasks

**0.1: Baseline Metrics Collection**
- [ ] Set up performance monitoring (Lighthouse CI, Web Vitals)
- [ ] Capture current CLS, FID, LCP scores
- [ ] Document current z-index values in use
- [ ] Record current layout dimensions (header height, sidebar widths)
- [ ] Create visual regression test suite (Playwright/Cypress)

**0.2: Feature Flag Setup**
- [ ] Install feature flag library (e.g., `react-feature-flags` or custom)
- [ ] Create flags:
  - `useNewZIndexSystem`
  - `useDynamicHeaderHeight`
  - `useThrottledScroll`
  - `useUnifiedNavigation`
  - `useOptimizedRenders`

**0.3: Development Environment**
- [ ] Create `refactor/` branch from `main`
- [ ] Set up Storybook for component isolation testing
- [ ] Configure ESLint rules for z-index usage
- [ ] Set up CSS custom properties documentation

**Deliverables:**
- Baseline metrics report
- Feature flag system operational
- Testing infrastructure ready

**Estimated Time:** 2 days

---

## PHASE 1: CRITICAL STABILITY FIXES (Days 3-7)

### Objective
Fix issues that cause immediate production problems (dropdowns not working, layout breaks)

### Week 1: Critical Fixes

#### **Sprint 1.1: Z-Index Standardization** (Day 3)

**Priority:** 🔴 CRITICAL  
**Risk:** Low (isolated change)  
**Estimated Time:** 4-6 hours

**Tasks:**
1. [ ] Create z-index constants file
   ```javascript
   // src/shared/constants/zIndex.js
   export const Z_INDEX = {
     BASE: 0,
     DROPDOWN: 1000,
     STICKY: 1010,
     FIXED: 1020,
     MODAL_BACKDROP: 1030,
     MODAL: 1040,
     POPOVER: 1050,
     TOOLTIP: 1060,
   };
   ```

2. [ ] Update CSS depth-layer system
   ```css
   /* TenantOrgLayout.css */
   .depth-layer-1 { z-index: var(--z-base, 10); }
   .depth-layer-2 { z-index: var(--z-fixed, 20); }
   .depth-layer-3 { z-index: var(--z-modal-backdrop, 30); }
   
   .z-dropdown { z-index: 1000; }
   .z-sticky { z-index: 1010; }
   .z-fixed { z-index: 1020; }
   .z-modal-backdrop { z-index: 1030; }
   .z-modal { z-index: 1040; }
   .z-popover { z-index: 1050; }
   .z-tooltip { z-index: 1060; }
   ```

3. [ ] Replace all z-index values in TenantOrgLayout.js
   - Line 618: `z-50` → `z-[1010]` (mobile header)
   - Line 648: `z-[9999]` → `z-[1050]` (mobile add dropdown)
   - Line 702: `z-50` → `z-[1050]` (mobile user dropdown)
   - Line 749: `z-30` → `z-[1020]` (desktop header)
   - Line 800: `z-[9999]` → `z-[1050]` (desktop add dropdown)
   - Line 884: `z-[9999]` → `z-[1050]` (desktop user dropdown)
   - Line 921: `z-40` → `z-[1030]` (mobile overlay)
   - Line 950: `z-50` → `z-[1020]` (sidebar)
   - Line 1001: `z-[60]` → `z-[1050]` (collapse button)
   - Line 1019: `z-10` → `z-[10]` (main content)
   - Line 1023: `z-10` → `z-[10]` (main scroll area)

4. [ ] Update CommandPalette.js
   - Line 196: `z-[10000]` → `z-[1040]` (modal)

5. [ ] Test all dropdown interactions
   - [ ] Mobile add menu appears above header
   - [ ] Desktop add menu appears above header
   - [ ] User menu appears above all content
   - [ ] Command palette appears above everything
   - [ ] Tooltips appear above dropdowns

**Testing Checklist:**
- [ ] All dropdowns render correctly
- [ ] No z-index conflicts visible
- [ ] Visual regression tests pass
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)

**Rollback Plan:** Revert to previous z-index values if issues occur

---

#### **Sprint 1.2: Header Height Dynamic Calculation** (Day 4)

**Priority:** 🔴 CRITICAL  
**Risk:** Medium (affects layout)  
**Estimated Time:** 6-8 hours

**Tasks:**
1. [ ] Create `useHeaderHeight` hook
   ```javascript
   // src/shared/hooks/useHeaderHeight.js
   import { useState, useEffect, useRef } from 'react';
   
   export const useHeaderHeight = (headerSelector = '.glass-header') => {
     const [height, setHeight] = useState(64);
     const headerRef = useRef(null);
     
     useEffect(() => {
       const header = document.querySelector(headerSelector);
       if (!header) return;
       
       const resizeObserver = new ResizeObserver(entries => {
         for (let entry of entries) {
           setHeight(entry.contentRect.height);
         }
       });
       
       resizeObserver.observe(header);
       return () => resizeObserver.disconnect();
     }, [headerSelector]);
     
     return [height, headerRef];
   };
   ```

2. [ ] Update TenantOrgLayout.js
   - Import `useHeaderHeight` hook
   - Replace hardcoded `lg:pt-[64px]` with dynamic padding
   - Add `style={{ paddingTop: `${headerHeight}px` }}` to main element

3. [ ] Add CSS fallback for SSR
   ```css
   .main-content {
     padding-top: 64px; /* Fallback */
   }
   
   @media (min-width: 1024px) {
     .main-content {
       padding-top: var(--header-height, 64px);
     }
   }
   ```

4. [ ] Test responsive behavior
   - [ ] Header height changes don't clip content
   - [ ] Mobile/tablet/desktop all work correctly
   - [ ] Window resize doesn't break layout

**Testing Checklist:**
- [ ] Content never gets clipped by header
- [ ] Layout shift (CLS) < 0.1
- [ ] Works on all viewport sizes
- [ ] SSR hydration doesn't cause jump

**Rollback Plan:** Revert to `lg:pt-[64px]` if dynamic calculation fails

---

#### **Sprint 1.3: Dropdown Click-Outside Fix** (Day 5)

**Priority:** 🔴 CRITICAL  
**Risk:** Low (isolated change)  
**Estimated Time:** 3-4 hours

**Tasks:**
1. [ ] Create `useClickOutside` hook
   ```javascript
   // src/shared/hooks/useClickOutside.js
   import { useEffect, RefObject } from 'react';
   
   export const useClickOutside = (
     ref: RefObject<HTMLElement>,
     handler: (event: MouseEvent | TouchEvent) => void
   ) => {
     useEffect(() => {
       const listener = (event: MouseEvent | TouchEvent) => {
         if (!ref.current || ref.current.contains(event.target as Node)) {
           return;
         }
         handler(event);
       };
       
       document.addEventListener('mousedown', listener, true);
       document.addEventListener('touchstart', listener, true);
       
       return () => {
         document.removeEventListener('mousedown', listener, true);
         document.removeEventListener('touchstart', listener, true);
       };
     }, [ref, handler]);
   };
   ```

2. [ ] Update TenantOrgLayout.js
   - Replace lines 320-336 with `useClickOutside` hook
   - Apply to both `userMenuOpen` and `addMenuOpen` states

3. [ ] Test dropdown behavior
   - [ ] Click outside closes dropdown
   - [ ] Click inside keeps dropdown open
   - [ ] No double-toggle issues
   - [ ] Works on mobile touch events

**Testing Checklist:**
- [ ] All dropdown interactions work correctly
- [ ] No race conditions
- [ ] Mobile touch events work
- [ ] Keyboard navigation still works (ESC key)

**Rollback Plan:** Revert to previous click-outside logic

---

#### **Sprint 1.4: Scroll Performance Optimization** (Day 6)

**Priority:** 🔴 CRITICAL  
**Risk:** Low (performance improvement)  
**Estimated Time:** 4-5 hours

**Tasks:**
1. [ ] Create throttle utility
   ```javascript
   // src/shared/utils/throttle.js
   export const throttle = (func, limit) => {
     let inThrottle;
     return function(...args) {
       if (!inThrottle) {
         func.apply(this, args);
         inThrottle = true;
         setTimeout(() => inThrottle = false, limit);
       }
     };
   };
   ```

2. [ ] Update scroll handler in TenantOrgLayout.js
   - Wrap `handleScroll` with `throttle(handleScroll, 100)`
   - Keep `requestAnimationFrame` for smooth animations

3. [ ] Add performance monitoring
   - Log scroll FPS during development
   - Ensure 60fps maintained

4. [ ] Test scroll performance
   - [ ] Smooth scrolling on all devices
   - [ ] Header toggle doesn't lag
   - [ ] Battery usage improved on mobile

**Testing Checklist:**
- [ ] Scroll FPS ≥ 60fps
- [ ] No janky animations
- [ ] CPU usage reduced
- [ ] Mobile battery drain improved

**Rollback Plan:** Remove throttle wrapper if issues occur

---

#### **Sprint 1.5: Event Listener Cleanup Safety** (Day 7)

**Priority:** 🟠 HIGH  
**Risk:** Low (safety improvement)  
**Estimated Time:** 2-3 hours

**Tasks:**
1. [ ] Fix all event listener cleanup functions
   - Update scroll listener cleanup (lines 117-125)
   - Update resize listener cleanup
   - Update fullscreen listener cleanup
   - Update keyboard listener cleanup

2. [ ] Add null checks in all cleanup functions
   ```javascript
   return () => {
     const mainElement = mainContentRef.current;
     if (mainElement) {
       mainElement.removeEventListener('scroll', handleScroll);
     }
     window.removeEventListener('resize', handleResize);
   };
   ```

3. [ ] Test memory leak prevention
   - [ ] Use React DevTools Profiler
   - [ ] Navigate away and back multiple times
   - [ ] Check event listener count doesn't increase

**Testing Checklist:**
- [ ] No memory leaks detected
- [ ] Event listeners properly cleaned up
- [ ] No console warnings

**Rollback Plan:** N/A (safety improvement only)

---

### Phase 1 Deliverables
- ✅ Z-index system standardized
- ✅ Header height dynamically calculated
- ✅ Dropdown interactions fixed
- ✅ Scroll performance optimized
- ✅ Memory leaks prevented

### Phase 1 Testing
- [ ] All critical functionality works
- [ ] Performance metrics improved
- [ ] No visual regressions
- [ ] Cross-browser compatibility verified

**Phase 1 Estimated Time:** 5 days

---

## PHASE 2: LAYOUT & RESPONSIVE FIXES (Days 8-14)

### Objective
Fix layout shifts, responsive breakpoints, and visual consistency issues

### Week 2: Layout Stability

#### **Sprint 2.1: Layout Shift Prevention** (Days 8-9)

**Priority:** 🟠 HIGH  
**Risk:** Medium (affects layout)  
**Estimated Time:** 8-10 hours

**Tasks:**
1. [ ] Fix header visibility toggle layout shift
   - Change from height-based to transform-based
   - Use `translateY(-100%)` instead of hiding
   - Reserve space for header (prevent CLS)

2. [ ] Fix sidebar collapse layout shift
   - Option A: Use `position: absolute` for collapsed sidebar
   - Option B: Reserve space with `margin-left` on main content
   - Option C: Use CSS Grid with `grid-template-columns`

3. [ ] Add CSS custom properties for sidebar widths
   ```css
   :root {
     --sidebar-icon-width: 4rem;
     --sidebar-main-width: 14rem;
     --sidebar-collapsed-width: 0;
   }
   ```

4. [ ] Update header left calculation
   - Use CSS variables instead of calc()
   - Ensure smooth transitions

5. [ ] Test CLS scores
   - [ ] CLS < 0.1 (target)
   - [ ] No content jumps
   - [ ] Smooth transitions

**Testing Checklist:**
- [ ] Lighthouse CLS score < 0.1
- [ ] No layout shifts during interactions
- [ ] Smooth animations
- [ ] Content never overlaps

---

#### **Sprint 2.2: Responsive Breakpoint Standardization** (Days 10-11)

**Priority:** 🟠 HIGH  
**Risk:** Medium (affects all breakpoints)  
**Estimated Time:** 10-12 hours

**Tasks:**
1. [ ] Create unified breakpoint system
   ```javascript
   // src/shared/constants/breakpoints.js
   export const BREAKPOINTS = {
     xs: 475,
     sm: 640,
     md: 768,
     lg: 1024,
     xl: 1280,
     '2xl': 1536,
     '3xl': 1920,
   };
   
   export const useBreakpoint = () => {
     // Unified hook using matchMedia
   };
   ```

2. [ ] Replace all `window.innerWidth` checks
   - Use `useBreakpoint` hook instead
   - Remove inline width checks

3. [ ] Fix tablet breakpoint gaps
   - Add tablet-specific styles (768px - 1023px)
   - Optimize touch targets (min 44px)
   - Adjust padding/spacing

4. [ ] Fix ultrawide monitor support
   - Add max-width constraints for content
   - Optimize for 1920px+ screens
   - Improve readability (50-75 char line length)

5. [ ] Test all breakpoints
   - [ ] Mobile (< 640px)
   - [ ] Tablet (640px - 1023px)
   - [ ] Desktop (1024px - 1279px)
   - [ ] Large Desktop (1280px - 1535px)
   - [ ] Ultrawide (≥ 1536px)

**Testing Checklist:**
- [ ] All breakpoints work correctly
- [ ] No horizontal scroll
- [ ] Content readable at all sizes
- [ ] Touch targets adequate on mobile/tablet

---

#### **Sprint 2.3: Table Overflow Handling** (Days 12-13)

**Priority:** 🟠 HIGH  
**Risk:** Low (new feature)  
**Estimated Time:** 6-8 hours

**Tasks:**
1. [ ] Create `TableWrapper` component
   ```javascript
   // src/shared/components/TableWrapper.jsx
   const TableWrapper = ({ children, className }) => (
     <div className="overflow-x-auto -mx-4 px-4">
       <div className="min-w-full inline-block">
         {children}
       </div>
     </div>
   );
   ```

2. [ ] Document usage in main content area
   - Add to TenantOrgLayout documentation
   - Provide example usage

3. [ ] Test with wide tables
   - [ ] Horizontal scroll works
   - [ ] No layout breaks
   - [ ] Sticky columns work (if needed)

**Testing Checklist:**
- [ ] Wide tables scroll horizontally
- [ ] No vertical layout breaks
- [ ] Scroll indicators visible
- [ ] Works on all devices

---

#### **Sprint 2.4: Spacing & Typography Standardization** (Day 14)

**Priority:** 🟡 MEDIUM  
**Risk:** Low (visual improvement)  
**Estimated Time:** 6-8 hours

**Tasks:**
1. [ ] Create spacing scale
   ```css
   :root {
     --spacing-xs: 0.5rem;  /* 8px */
     --spacing-sm: 1rem;     /* 16px */
     --spacing-md: 1.5rem;   /* 24px */
     --spacing-lg: 2rem;     /* 32px */
     --spacing-xl: 3rem;     /* 48px */
   }
   ```

2. [ ] Standardize padding/margins
   - Replace all arbitrary padding values
   - Use spacing scale consistently

3. [ ] Implement responsive typography
   ```css
   .page-title {
     font-size: clamp(1rem, 2vw + 0.5rem, 1.25rem);
     line-height: 1.4;
   }
   ```

4. [ ] Update all text sizes
   - Page titles
   - Menu items
   - Button labels
   - Form inputs

**Testing Checklist:**
- [ ] Consistent spacing throughout
- [ ] Typography scales correctly
- [ ] Readable on all devices
- [ ] Visual hierarchy clear

---

### Phase 2 Deliverables
- ✅ Layout shifts eliminated
- ✅ Responsive breakpoints standardized
- ✅ Table overflow handled
- ✅ Spacing/typography consistent

**Phase 2 Estimated Time:** 7 days

---

## PHASE 3: PERFORMANCE & OPTIMIZATION (Days 15-21)

### Objective
Optimize re-renders, reduce bundle size, improve performance metrics

### Week 3: Performance Optimization

#### **Sprint 3.1: Component Memoization** (Days 15-16)

**Priority:** 🟠 HIGH  
**Risk:** Low (optimization)  
**Estimated Time:** 8-10 hours

**Tasks:**
1. [ ] Memoize `renderMenuItem` function
   ```javascript
   const renderMenuItem = useCallback((item, isMobile = false) => {
     // ... existing code
   }, [currentMenuKey, location.pathname, expandedMenus, isDarkMode, themeStyles]);
   ```

2. [ ] Memoize menu items list
   - Already done (line 302), verify it's working

3. [ ] Memoize filtered menu items
   ```javascript
   const filteredMenuItems = useMemo(() => {
     return getFilteredMenuItems();
   }, [menuItems, userDepartments, tenant, user]);
   ```

4. [ ] Add React.memo to child components
   - ClickUpSidebar
   - CommandPalette (if not already memoized)

5. [ ] Profile re-renders
   - Use React DevTools Profiler
   - Identify unnecessary re-renders
   - Fix remaining issues

**Testing Checklist:**
- [ ] Re-render count reduced
- [ ] Performance improved
- [ ] No functionality broken
- [ ] Memory usage stable

---

#### **Sprint 3.2: Backdrop Filter Optimization** (Day 17)

**Priority:** 🟡 MEDIUM  
**Risk:** Low (performance improvement)  
**Estimated Time:** 4-5 hours

**Tasks:**
1. [ ] Add backdrop-filter fallbacks
   ```css
   .glass-sidebar {
     background: rgba(255, 255, 255, 0.95); /* Fallback */
   }
   
   @supports (backdrop-filter: blur(20px)) {
     .glass-sidebar {
       background: rgba(255, 255, 255, 0.7);
       backdrop-filter: blur(20px);
     }
   }
   ```

2. [ ] Reduce blur on mobile
   ```css
   @media (max-width: 1023px) {
     .glass-sidebar {
       backdrop-filter: blur(10px); /* Reduced for performance */
     }
   }
   ```

3. [ ] Test performance
   - [ ] FPS maintained on mobile
   - [ ] Battery usage improved
   - [ ] Fallback works in older browsers

**Testing Checklist:**
- [ ] Performance improved on mobile
- [ ] Fallback works correctly
- [ ] Visual quality acceptable
- [ ] No regressions

---

#### **Sprint 3.3: Animation Performance** (Day 18)

**Priority:** 🟡 MEDIUM  
**Risk:** Low (optimization)  
**Estimated Time:** 4-5 hours

**Tasks:**
1. [ ] Add GPU acceleration hints
   ```css
   .animate-fade-in {
     will-change: transform, opacity;
     transform: translateZ(0); /* Force GPU */
   }
   ```

2. [ ] Standardize animation durations
   - 150ms: Micro-interactions
   - 200ms: Standard transitions
   - 300ms: Comfortable animations
   - 500ms: Deliberate transitions

3. [ ] Optimize transition properties
   - Use `transform` and `opacity` only
   - Avoid animating `width`, `height`, `top`, `left`

4. [ ] Test animation performance
   - [ ] 60fps maintained
   - [ ] No jank
   - [ ] Smooth on all devices

**Testing Checklist:**
- [ ] Animations smooth (60fps)
- [ ] No janky transitions
- [ ] GPU acceleration working
- [ ] Battery usage acceptable

---

#### **Sprint 3.4: Bundle Size Optimization** (Days 19-20)

**Priority:** 🟡 MEDIUM  
**Risk:** Low (optimization)  
**Estimated Time:** 6-8 hours

**Tasks:**
1. [ ] Analyze bundle size
   - Use webpack-bundle-analyzer
   - Identify large dependencies

2. [ ] Code splitting
   - Lazy load CommandPalette
   - Lazy load ClickUpSidebar
   - Lazy load theme providers

3. [ ] Tree shaking
   - Ensure unused exports removed
   - Verify icon imports are tree-shakeable

4. [ ] Optimize imports
   - Use named imports where possible
   - Avoid importing entire libraries

5. [ ] Test bundle size
   - [ ] Bundle size reduced
   - [ ] Initial load time improved
   - [ ] No functionality broken

**Testing Checklist:**
- [ ] Bundle size reduced by 10%+
   - [ ] Initial load time improved
   - [ ] Code splitting working
   - [ ] No runtime errors

---

#### **Sprint 3.5: Loading State Improvements** (Day 21)

**Priority:** 🟡 MEDIUM  
**Risk:** Low (UX improvement)  
**Estimated Time:** 4-5 hours

**Tasks:**
1. [ ] Fix auth loading timeout hack
   - Investigate TenantAuthContext
   - Fix root cause of hanging auth state
   - Remove artificial timeout

2. [ ] Improve loading skeleton
   - Add skeleton for menu items
   - Add skeleton for header
   - Match actual content layout

3. [ ] Add error boundaries
   - Wrap TenantOrgLayout in error boundary
   - Provide fallback UI
   - Log errors for monitoring

**Testing Checklist:**
- [ ] Loading states work correctly
- [ ] No artificial timeouts
- [ ] Error boundaries catch errors
- [ ] Fallback UI displays correctly

---

### Phase 3 Deliverables
- ✅ Re-renders optimized
- ✅ Performance metrics improved
- ✅ Bundle size reduced
- ✅ Loading states improved

**Phase 3 Estimated Time:** 7 days

---

## PHASE 4: NAVIGATION & UX IMPROVEMENTS (Days 22-28)

### Objective
Improve navigation architecture, add missing features, enhance UX

### Week 4: Navigation & UX

#### **Sprint 4.1: Navigation Consolidation** (Days 22-24)

**Priority:** 🟠 HIGH  
**Risk:** High (major refactor)  
**Estimated Time:** 16-20 hours

**Tasks:**
1. [ ] Design unified navigation system
   - Single sidebar component
   - Responsive states (mobile/tablet/desktop)
   - Icon-only / collapsed / expanded modes

2. [ ] Create `UnifiedSidebar` component
   ```javascript
   // src/shared/components/navigation/UnifiedSidebar.jsx
   const UnifiedSidebar = ({
     navigation,
     collapsed,
     onToggleCollapse,
     mobileOpen,
     onMobileClose,
   }) => {
     // Unified implementation
   };
   ```

3. [ ] Migrate from triple navigation
   - Replace mobile header navigation
   - Replace ClickUp sidebar
   - Replace main sidebar
   - Ensure feature parity

4. [ ] Test navigation
   - [ ] All navigation works
   - [ ] Responsive behavior correct
   - [ ] No regressions
   - [ ] Performance maintained

**Testing Checklist:**
- [ ] Navigation works on all devices
- [ ] No functionality lost
- [ ] Performance maintained
- [ ] Visual consistency improved

**Rollback Plan:** Keep old navigation system behind feature flag

---

#### **Sprint 4.2: Breadcrumb Navigation** (Day 25)

**Priority:** 🟠 HIGH  
**Risk:** Low (new feature)  
**Estimated Time:** 6-8 hours

**Tasks:**
1. [ ] Create `Breadcrumbs` component
   ```javascript
   // src/shared/components/navigation/Breadcrumbs.jsx
   const Breadcrumbs = ({ items }) => {
     // Generate from route or props
   };
   ```

2. [ ] Integrate into TenantOrgLayout
   - Add below header
   - Generate from current route
   - Make clickable

3. [ ] Test breadcrumbs
   - [ ] Correct path shown
   - [ ] Clickable navigation works
   - [ ] Responsive design
   - [ ] Accessible (ARIA labels)

**Testing Checklist:**
- [ ] Breadcrumbs display correctly
- [ ] Navigation works
- [ ] Responsive design
- [ ] Accessible

---

#### **Sprint 4.3: Command Palette Improvements** (Day 26)

**Priority:** 🟠 HIGH  
**Risk:** Low (enhancement)  
**Estimated Time:** 6-8 hours

**Tasks:**
1. [ ] Add visual indicator
   - Keyboard shortcut hint in header
   - "Press Cmd+K to search" tooltip
   - Persistent badge (dismissible)

2. [ ] Connect mobile search
   - Make mobile search input functional
   - Open CommandPalette on focus
   - Show keyboard shortcut hint

3. [ ] Improve discoverability
   - Add to onboarding
   - Add to help documentation
   - Show on first visit

4. [ ] Test command palette
   - [ ] Keyboard shortcut works
   - [ ] Mobile search works
   - [ ] Visual indicators clear
   - [ ] Discoverable

**Testing Checklist:**
- [ ] Command palette discoverable
- [ ] Mobile search functional
- [ ] Keyboard shortcuts work
- [ ] Visual indicators helpful

---

#### **Sprint 4.4: Menu Filtering Refactor** (Days 27-28)

**Priority:** 🟡 MEDIUM  
**Risk:** Medium (logic refactor)  
**Estimated Time:** 10-12 hours

**Tasks:**
1. [ ] Extract menu filtering logic
   ```javascript
   // src/features/tenant/hooks/useMenuFiltering.js
   export const useMenuFiltering = (menuItems, user, tenant, userDepartments) => {
     // Clean, documented logic
   };
   ```

2. [ ] Add visual indicators
   - Show why menu items are hidden
   - Add "Upgrade to unlock" badges
   - Tooltip explanations

3. [ ] Improve menu key mapping
   - Standardize naming (kebab-case)
   - Document mapping logic
   - Add TypeScript types

4. [ ] Test menu filtering
   - [ ] Logic works correctly
   - [ ] Visual indicators helpful
   - [ ] Performance maintained
   - [ ] No regressions

**Testing Checklist:**
- [ ] Menu filtering works correctly
- [ ] Visual indicators clear
- [ ] Performance maintained
- [ ] Code maintainable

---

### Phase 4 Deliverables
- ✅ Navigation unified
- ✅ Breadcrumbs added
- ✅ Command palette improved
- ✅ Menu filtering refactored

**Phase 4 Estimated Time:** 7 days

---

## PHASE 5: DESIGN SYSTEM & CONSISTENCY (Days 29-35)

### Objective
Standardize design tokens, ensure visual consistency, improve accessibility

### Week 5: Design System

#### **Sprint 5.1: Design Token Standardization** (Days 29-30)

**Priority:** 🟡 MEDIUM  
**Risk:** Low (refactor)  
**Estimated Time:** 10-12 hours

**Tasks:**
1. [ ] Create design tokens file
   ```css
   /* src/shared/styles/design-tokens.css */
   :root {
     /* Colors */
     --color-primary-50: #eff6ff;
     --color-primary-100: #dbeafe;
     /* ... full scale */
     
     /* Spacing */
     --spacing-xs: 0.5rem;
     /* ... full scale */
     
     /* Shadows */
     --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
     /* ... full scale */
     
     /* Border Radius */
     --radius-sm: 0.25rem;
     /* ... full scale */
   }
   ```

2. [ ] Migrate all color usage
   - Replace `themeStyles.getPrimaryColor()` calls
   - Use CSS custom properties
   - Maintain theme switching

3. [ ] Standardize shadows
   - Replace all shadow values
   - Use shadow scale
   - Document usage guidelines

4. [ ] Standardize border radius
   - Replace all radius values
   - Use radius scale
   - Document usage guidelines

**Testing Checklist:**
- [ ] All tokens used consistently
- [ ] Theme switching works
- [ ] Visual consistency improved
- [ ] Documentation complete

---

#### **Sprint 5.2: Glass Morphism Consistency** (Day 31)

**Priority:** 🟡 MEDIUM  
**Risk:** Low (refactor)  
**Estimated Time:** 6-8 hours

**Tasks:**
1. [ ] Create glass component system
   ```javascript
   // src/shared/components/glass/GlassButton.jsx
   // src/shared/components/glass/GlassCard.jsx
   // src/shared/components/glass/GlassInput.jsx
   ```

2. [ ] Replace all glass implementations
   - Use components instead of classes
   - Ensure consistency
   - Document usage

3. [ ] Test glass effects
   - [ ] Consistent appearance
   - [ ] Performance acceptable
   - [ ] Fallbacks work
   - [ ] Accessibility maintained

**Testing Checklist:**
- [ ] Glass effects consistent
- [ ] Performance maintained
- [ ] Fallbacks work
- [ ] Documentation complete

---

#### **Sprint 5.3: Accessibility Improvements** (Days 32-33)

**Priority:** 🟡 MEDIUM  
**Risk:** Low (improvement)  
**Estimated Time:** 10-12 hours

**Tasks:**
1. [ ] Add ARIA labels
   - All interactive elements
   - Navigation landmarks
   - Form inputs
   - Buttons

2. [ ] Keyboard navigation
   - Tab order logical
   - Focus indicators visible
   - Keyboard shortcuts documented
   - ESC key closes modals

3. [ ] Screen reader support
   - Semantic HTML
   - ARIA roles
   - Live regions for updates
   - Skip links

4. [ ] Test accessibility
   - [ ] WCAG 2.1 AA compliance
   - [ ] Screen reader tested
   - [ ] Keyboard navigation works
   - [ ] Focus management correct

**Testing Checklist:**
- [ ] WCAG 2.1 AA compliant
   - [ ] Screen reader tested
   - [ ] Keyboard navigation works
   - [ ] Focus indicators visible

---

#### **Sprint 5.4: Animation Duration Standardization** (Day 34)

**Priority:** 🟡 MEDIUM  
**Risk:** Low (refactor)  
**Estimated Time:** 4-5 hours

**Tasks:**
1. [ ] Define animation scale
   ```css
   :root {
     --duration-fast: 150ms;
     --duration-normal: 200ms;
     --duration-slow: 300ms;
     --duration-slower: 500ms;
   }
   ```

2. [ ] Replace all animation durations
   - Use CSS custom properties
   - Ensure consistency
   - Document usage

3. [ ] Test animations
   - [ ] Consistent feel
   - [ ] Performance maintained
   - [ ] No regressions

**Testing Checklist:**
- [ ] Animations consistent
- [ ] Performance maintained
- [ ] Documentation complete

---

#### **Sprint 5.5: Documentation & Handoff** (Day 35)

**Priority:** 🟡 MEDIUM  
**Risk:** Low (documentation)  
**Estimated Time:** 6-8 hours

**Tasks:**
1. [ ] Update component documentation
   - JSDoc comments
   - Props documentation
   - Usage examples
   - Migration guide

2. [ ] Create design system documentation
   - Design tokens
   - Component usage
   - Best practices
   - Common patterns

3. [ ] Update README
   - Architecture overview
   - Development setup
   - Testing guide
   - Deployment process

4. [ ] Create migration guide
   - Breaking changes
   - Upgrade path
   - Feature flags
   - Rollback procedures

**Testing Checklist:**
- [ ] Documentation complete
- [ ] Examples work
- [ ] Migration guide clear
- [ ] Team can maintain

---

### Phase 5 Deliverables
- ✅ Design tokens standardized
- ✅ Glass effects consistent
- ✅ Accessibility improved
- ✅ Documentation complete

**Phase 5 Estimated Time:** 7 days

---

## TESTING & VALIDATION STRATEGY

### Continuous Testing

**Unit Tests:**
- [ ] Z-index constants
- [ ] Hooks (useHeaderHeight, useClickOutside)
- [ ] Utility functions (throttle)
- [ ] Component rendering

**Integration Tests:**
- [ ] Dropdown interactions
- [ ] Navigation flows
- [ ] Responsive breakpoints
- [ ] Theme switching

**E2E Tests:**
- [ ] Critical user flows
- [ ] Cross-browser compatibility
- [ ] Mobile/tablet/desktop
- [ ] Performance benchmarks

**Visual Regression Tests:**
- [ ] Screenshot comparisons
- [ ] Layout stability
- [ ] Animation smoothness
- [ ] Cross-device consistency

### Performance Benchmarks

**Target Metrics:**
- CLS (Cumulative Layout Shift): < 0.1
- FID (First Input Delay): < 100ms
- LCP (Largest Contentful Paint): < 2.5s
- TTI (Time to Interactive): < 3.5s
- Scroll FPS: 60fps
- Bundle Size: < 500KB (gzipped)

**Monitoring:**
- Lighthouse CI on every PR
- Web Vitals tracking in production
- Performance budgets enforced
- Regular performance audits

---

## ROLLOUT STRATEGY

### Feature Flag Rollout

**Phase 1:** Internal testing (Week 1-2)
- Enable for development team only
- Collect feedback
- Fix critical issues

**Phase 2:** Beta testing (Week 3-4)
- Enable for 10% of users
- Monitor error rates
- Collect performance metrics

**Phase 3:** Gradual rollout (Week 5-6)
- Increase to 25%, 50%, 75%
- Monitor at each stage
- Rollback if issues detected

**Phase 4:** Full rollout (Week 7+)
- Enable for 100% of users
- Monitor for 1 week
- Remove feature flags
- Archive old code

### Rollback Procedures

**Immediate Rollback:**
- Disable feature flags
- Revert to previous version
- Monitor error rates
- Investigate issues

**Partial Rollback:**
- Disable specific features
- Keep stable features enabled
- Fix issues incrementally
- Re-enable when fixed

---

## RISK MITIGATION

### High-Risk Areas

1. **Navigation Consolidation (Phase 4)**
   - Risk: Breaking existing navigation
   - Mitigation: Feature flag, gradual rollout, extensive testing
   - Rollback: Keep old system available

2. **Z-Index Changes (Phase 1)**
   - Risk: Overlay conflicts
   - Mitigation: Comprehensive testing, visual regression tests
   - Rollback: Revert to previous values

3. **Layout Shift Fixes (Phase 2)**
   - Risk: Breaking existing layouts
   - Mitigation: Test all pages, monitor CLS scores
   - Rollback: Revert layout changes

### Monitoring

- Error tracking (Sentry/ErrorBoundary)
- Performance monitoring (Web Vitals)
- User feedback collection
- A/B testing (if applicable)

---

## SUCCESS CRITERIA

### Phase 1 Success
- ✅ All dropdowns work correctly
- ✅ No z-index conflicts
- ✅ Header doesn't clip content
- ✅ Scroll performance improved

### Phase 2 Success
- ✅ CLS < 0.1
- ✅ No layout shifts
- ✅ Responsive design works
- ✅ Tables handle overflow

### Phase 3 Success
- ✅ Re-render count reduced by 50%+
- ✅ Bundle size reduced by 10%+
- ✅ Performance metrics improved
- ✅ Loading states improved

### Phase 4 Success
- ✅ Navigation unified
- ✅ Breadcrumbs added
- ✅ Command palette discoverable
- ✅ Menu filtering improved

### Phase 5 Success
- ✅ Design tokens standardized
- ✅ Visual consistency achieved
- ✅ WCAG 2.1 AA compliant
- ✅ Documentation complete

---

## TIMELINE SUMMARY

| Phase | Duration | Focus | Risk Level |
|-------|----------|-------|------------|
| Phase 0 | 2 days | Setup | Low |
| Phase 1 | 5 days | Critical Fixes | Medium |
| Phase 2 | 7 days | Layout & Responsive | Medium |
| Phase 3 | 7 days | Performance | Low |
| Phase 4 | 7 days | Navigation & UX | High |
| Phase 5 | 7 days | Design System | Low |
| **Total** | **35 days** | **Complete Refactor** | **Managed** |

**Buffer Time:** +5 days for unexpected issues  
**Total Estimated:** 40 days (8 weeks)

---

## RESOURCE REQUIREMENTS

### Team Composition
- 1-2 Frontend Engineers (full-time)
- 1 QA Engineer (part-time, testing phases)
- 1 Designer (consultation, design system)

### Tools & Infrastructure
- Feature flag system
- Performance monitoring
- Visual regression testing
- Error tracking
- CI/CD pipeline

### Dependencies
- Design system approval
- Product team sign-off
- QA team availability
- Infrastructure support

---

## NEXT STEPS

1. **Review & Approval**
   - [ ] Review plan with team
   - [ ] Get stakeholder approval
   - [ ] Allocate resources
   - [ ] Set up infrastructure

2. **Kickoff**
   - [ ] Start Phase 0 (Setup)
   - [ ] Set up feature flags
   - [ ] Create baseline metrics
   - [ ] Begin Phase 1

3. **Execution**
   - [ ] Follow sprint plan
   - [ ] Daily standups
   - [ ] Weekly reviews
   - [ ] Adjust as needed

---

*Last Updated: February 11, 2026*  
*Plan Version: 1.0*
