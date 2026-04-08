# Critical Fixes - Quick Reference Guide
## TenantOrgLayout Component

**Priority Order:** Fix these issues immediately to prevent production incidents.

---

## 🔴 CRITICAL FIXES (Do First)

### 1. Z-Index Standardization
**File:** `TenantOrgLayout.js` + `TenantOrgLayout.css`

**Problem:** Z-index values are arbitrary and conflict.

**Quick Fix:**
```javascript
// Add to TenantOrgLayout.js top
const Z_INDEX = {
  BASE: 0,
  DROPDOWN: 1000,
  STICKY: 1010,
  FIXED: 1020,
  MODAL_BACKDROP: 1030,
  MODAL: 1040,
  POPOVER: 1050,
  TOOLTIP: 1060,
};

// Replace all z-index values:
// z-50 → z-[1010]
// z-[9999] → z-[1050]
// z-[10000] → z-[1060]
```

**CSS Fix:**
```css
/* Replace depth-layer system */
.depth-layer-1 { z-index: 10; } /* Keep for backward compat */
.depth-layer-2 { z-index: 20; }
.depth-layer-3 { z-index: 30; }

/* Add new system */
.z-dropdown { z-index: 1000; }
.z-sticky { z-index: 1010; }
.z-fixed { z-index: 1020; }
.z-modal-backdrop { z-index: 1030; }
.z-modal { z-index: 1040; }
.z-popover { z-index: 1050; }
.z-tooltip { z-index: 1060; }
```

---

### 2. Header Height Dynamic Calculation
**File:** `TenantOrgLayout.js` (Lines 749-751, 1023)

**Problem:** Hardcoded `lg:pt-[64px]` doesn't match actual header height.

**Quick Fix:**
```javascript
// Add state
const [headerHeight, setHeaderHeight] = useState(64);

// Add effect to measure header
useEffect(() => {
  const header = document.querySelector('.glass-header');
  if (header) {
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        setHeaderHeight(entry.contentRect.height);
      }
    });
    resizeObserver.observe(header);
    return () => resizeObserver.disconnect();
  }
}, []);

// Update main content padding
<main 
  className="flex-1 overflow-y-auto overflow-x-hidden relative z-10 glass-scrollbar transition-all duration-500 ease-in-out"
  style={{ paddingTop: `${headerHeight}px` }}
>
```

---

### 3. Dropdown Click-Outside Fix
**File:** `TenantOrgLayout.js` (Lines 320-336)

**Problem:** `mousedown` event causes race conditions.

**Quick Fix:**
```javascript
useEffect(() => {
  const handleClickOutside = (event) => {
    if (userMenuOpen && !event.target.closest('.user-menu-container')) {
      event.stopPropagation();
      setUserMenuOpen(false);
    }
    if (addMenuOpen && !event.target.closest('.add-menu-container')) {
      event.stopPropagation();
      setAddMenuOpen(false);
    }
  };

  if (userMenuOpen || addMenuOpen) {
    // Use capture phase to catch events early
    document.addEventListener('click', handleClickOutside, true);
    return () => {
      document.removeEventListener('click', handleClickOutside, true);
    };
  }
}, [userMenuOpen, addMenuOpen]);
```

---

### 4. Scroll Performance Throttle
**File:** `TenantOrgLayout.js` (Lines 66-126)

**Problem:** Header visibility toggle fires too frequently.

**Quick Fix:**
```javascript
// Add throttle utility at top of file
const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Update handleScroll
const handleScroll = throttle(() => {
  if (!ticking) {
    window.requestAnimationFrame(() => {
      const currentScrollTop = mainElement.scrollTop || 0;
      const scrollDifference = currentScrollTop - lastScrollTop;
      const isDesktop = window.innerWidth >= 1024;
      
      if (isDesktop) {
        if (currentScrollTop <= 20) {
          setIsHeaderVisible(true);
        } else if (scrollDifference > 5) {
          setIsHeaderVisible(false);
        } else if (scrollDifference < -5) {
          setIsHeaderVisible(true);
        }
      } else {
        setIsHeaderVisible(true);
      }
      
      lastScrollTop = currentScrollTop;
      ticking = false;
    });
    ticking = true;
  }
}, 100); // Throttle to 100ms
```

---

### 5. Sidebar Width CSS Variables
**File:** `TenantOrgLayout.css`

**Problem:** Hardcoded widths cause calculation mismatches.

**Quick Fix:**
```css
:root {
  --sidebar-icon-width: 4rem;    /* 64px */
  --sidebar-main-width: 14rem;   /* 224px */
  --sidebar-collapsed-width: 0;
}

/* Update header left calculation */
.desktop-header {
  left: calc(var(--sidebar-icon-width) + var(--sidebar-main-width));
  transition: left 0.5s ease-in-out;
}

.desktop-header.collapsed {
  left: var(--sidebar-icon-width);
}
```

**JSX Update:**
```javascript
// Line 751
className={`hidden lg:block fixed top-0 z-30 depth-layer-2 transition-all duration-500 ease-in-out ${
  isHeaderVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
} ${collapsed ? 'desktop-header collapsed' : 'desktop-header'}`}
```

---

## 🟠 HIGH PRIORITY FIXES (Do Next)

### 6. Menu Item Memoization
**File:** `TenantOrgLayout.js` (Line 505)

**Quick Fix:**
```javascript
const renderMenuItem = useCallback((item, isMobile = false) => {
  // ... existing code
}, [currentMenuKey, location.pathname, expandedMenus, isDarkMode, themeStyles, getCurrentMenuKey]);
```

---

### 7. Layout Shift Prevention
**File:** `TenantOrgLayout.js` (Line 749)

**Quick Fix:**
```javascript
// Use transform instead of height change
className={`hidden lg:block fixed top-0 z-30 depth-layer-2 transition-transform duration-500 ease-in-out ${
  isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
} ${collapsed ? 'left-[4rem] right-0' : 'left-[calc(4rem+14rem)] right-0'}`}
```

---

### 8. Mobile Search Connection
**File:** `TenantOrgLayout.js` (Lines 733-745)

**Quick Fix:**
```javascript
<input
  type="text"
  placeholder="Search... (Cmd/Ctrl+K)"
  className="glass-input w-full pl-10 pr-3 py-2.5 text-sm font-medium"
  onFocus={() => {
    setCommandPaletteOpen(true);
    // Focus will move to command palette
  }}
  readOnly // Prevent typing, let command palette handle it
/>
```

---

### 9. Submenu Height Fix
**File:** `TenantOrgLayout.js` (Line 572)

**Quick Fix:**
```javascript
// Replace max-h-96 with dynamic height
<div className={`overflow-hidden transition-all duration-300 ${
  isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
}`}>
```

**Better Fix (Measure actual height):**
```javascript
const submenuRef = useRef(null);
const [submenuHeight, setSubmenuHeight] = useState(0);

useEffect(() => {
  if (isExpanded && submenuRef.current) {
    setSubmenuHeight(submenuRef.current.scrollHeight);
  }
}, [isExpanded, item.children]);

// In JSX
<div 
  ref={submenuRef}
  className={`overflow-hidden transition-all duration-300 ${
    isExpanded ? `max-h-[${submenuHeight}px] opacity-100` : 'max-h-0 opacity-0'
  }`}
>
```

---

### 10. Event Listener Cleanup Safety
**File:** `TenantOrgLayout.js` (Lines 117-125)

**Quick Fix:**
```javascript
return () => {
  const mainElement = mainContentRef.current;
  if (mainElement) {
    mainElement.removeEventListener('scroll', handleScroll);
  }
  window.removeEventListener('resize', handleResize);
};
```

---

## 🟡 MEDIUM PRIORITY (Do When Time Permits)

### 11. Standardize Spacing Scale
**File:** `TenantOrgLayout.js` + CSS

Create spacing constants:
```javascript
const SPACING = {
  xs: '0.5rem',   // 8px
  sm: '1rem',     // 16px
  md: '1.5rem',   // 24px
  lg: '2rem',     // 32px
  xl: '3rem',     // 48px
};
```

---

### 12. Responsive Typography
**File:** `TenantOrgLayout.css`

**Quick Fix:**
```css
.page-title {
  font-size: clamp(1rem, 2vw + 0.5rem, 1.25rem);
  line-height: 1.4;
}

@media (max-width: 640px) {
  .page-title {
    font-size: 1rem;
  }
}
```

---

### 13. Backdrop Filter Fallback
**File:** `TenantOrgLayout.css` (Lines 9-21)

**Quick Fix:**
```css
.glass-sidebar {
  /* Fallback for browsers without backdrop-filter */
  background: rgba(255, 255, 255, 0.95);
}

@supports (backdrop-filter: blur(20px)) {
  .glass-sidebar {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
  }
}

/* Reduce blur on mobile for performance */
@media (max-width: 1023px) {
  .glass-sidebar {
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }
}
```

---

## Testing Checklist

After applying fixes, test:

- [ ] Dropdowns appear above all other elements
- [ ] Header doesn't overlap content when scrolling
- [ ] Sidebar collapse doesn't cause layout shift
- [ ] Mobile menu opens/closes smoothly
- [ ] No horizontal scroll on any viewport size
- [ ] Scroll performance is smooth (60fps)
- [ ] All click events work correctly
- [ ] Theme switching doesn't break layout
- [ ] Fullscreen mode works correctly
- [ ] Keyboard shortcuts (Cmd+K, Cmd+B) work

---

## Performance Benchmarks

Target metrics after fixes:
- **CLS (Cumulative Layout Shift):** < 0.1
- **FID (First Input Delay):** < 100ms  
- **LCP (Largest Contentful Paint):** < 2.5s
- **Scroll FPS:** 60fps
- **Memory Usage:** No leaks after 10 minutes

---

*Last Updated: February 11, 2026*
