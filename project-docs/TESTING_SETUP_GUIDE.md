# Testing Setup Guide

## Quick Start

### 1. Install Missing Dependencies

```bash
cd TWS/frontend
npm install --save-dev jest-axe jest-watch-typeahead
```

### 2. Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run accessibility tests only
npm run test:a11y
```

## Test Files Created

### ✅ Utility Tests
- `src/shared/utils/__tests__/throttle.test.js`
- `src/shared/constants/__tests__/zIndex.test.js`
- `src/shared/constants/__tests__/breakpoints.test.js`
- `src/shared/constants/__tests__/animations.test.js`

### ✅ Hook Tests
- `src/shared/hooks/__tests__/useClickOutside.test.js`
- `src/shared/hooks/__tests__/useHeaderHeight.test.js`
- `src/features/tenant/hooks/__tests__/useMenuFiltering.test.js`

### ✅ Component Tests
- `src/shared/components/navigation/__tests__/Breadcrumbs.test.jsx`
- `src/shared/components/__tests__/ErrorBoundary.test.jsx`
- `src/features/tenant/components/__tests__/TenantOrgLayout.test.jsx`

### ✅ Accessibility Tests
- `src/__tests__/accessibility.test.jsx`

### ✅ Test Setup
- `src/__tests__/setupTests.js`

## Test Coverage

- **Total Test Files:** 10
- **Test Suites:** 10+
- **Test Cases:** 60+

## Common Issues & Solutions

### Issue: `jest-watch-typeahead` not found

**Solution:**
```bash
npm install --save-dev jest-watch-typeahead
```

### Issue: `jest-axe` not found (for accessibility tests)

**Solution:**
```bash
npm install --save-dev jest-axe
```

### Issue: ResizeObserver not defined

**Solution:** Already handled in `setupTests.js` with mock implementation.

### Issue: React Router hooks not working in tests

**Solution:** Already mocked in `setupTests.js`.

## Next Steps

1. **Install dependencies** (if not already installed)
2. **Run tests** to verify everything works
3. **Add to CI/CD** pipeline
4. **Set coverage thresholds** in Jest config
5. **Add E2E tests** with Cypress or Playwright

## Notes

- All tests follow Jest and React Testing Library best practices
- Tests are isolated and don't require external services
- Mocks are provided for all external dependencies
- Accessibility tests use axe-core for WCAG compliance

---

**Status:** ✅ Test files created and ready to run
