# Testing Quick Start Guide

## ✅ Where to Run Tests

**Answer: Run all test commands from the `frontend` directory**

```bash
cd TWS/frontend
```

All test files are located in:
- `TWS/frontend/src/shared/utils/__tests__/`
- `TWS/frontend/src/shared/hooks/__tests__/`
- `TWS/frontend/src/shared/components/__tests__/`
- `TWS/frontend/src/features/tenant/components/__tests__/`
- `TWS/frontend/src/__tests__/`

## 🚀 Running Tests

### Step 1: Navigate to Frontend Directory

```bash
cd c:\Users\Super\Desktop\TWS\TWS\frontend
```

**Important:** Use the exact path `TWS\frontend` (uppercase) as shown in your project structure.

### Step 2: Install Dependencies (if needed)

If you encounter npm errors, try:

```bash
# Clear npm cache
npm cache clean --force

# Install dependencies
npm install

# Then install test dependencies
npm install --save-dev jest-axe jest-watch-typeahead
```

### Step 3: Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (recommended for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run only accessibility tests
npm run test:a11y
```

## 🔧 Troubleshooting npm Errors

### Error: "Cannot read properties of null (reading 'location')"

This is usually an npm cache or workspace issue. Try:

```bash
# Option 1: Clear npm cache
npm cache clean --force

# Option 2: Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Option 3: Use npm ci instead
npm ci
```

### Error: "jest-watch-typeahead cannot be found"

```bash
npm install --save-dev jest-watch-typeahead@2.2.2
```

### Error: "jest-axe cannot be found"

```bash
npm install --save-dev jest-axe@7.0.0
```

## 📁 Directory Structure

```
TWS/
├── frontend/          ← Run tests HERE
│   ├── src/
│   │   ├── __tests__/           ← Test setup files
│   │   ├── shared/
│   │   │   ├── utils/__tests__/ ← Utility tests
│   │   │   ├── hooks/__tests__/  ← Hook tests
│   │   │   └── components/__tests__/ ← Component tests
│   │   └── features/
│   │       └── tenant/
│   │           └── components/__tests__/ ← Layout tests
│   └── package.json   ← Test scripts defined here
└── backend/           ← Backend tests (separate)
    └── src/
        └── tests/
```

## ✅ Verify Setup

1. **Check you're in the right directory:**
   ```bash
   pwd
   # Should show: .../TWS/frontend
   ```

2. **Check package.json exists:**
   ```bash
   cat package.json | grep "test"
   # Should show test scripts
   ```

3. **Check test files exist:**
   ```bash
   # Windows PowerShell
   Get-ChildItem -Recurse -Filter "*.test.js*" | Select-Object FullName
   ```

## 🎯 Quick Test Commands

```bash
# Navigate to frontend
cd c:\Users\Super\Desktop\TWS\TWS\frontend

# Run a specific test file
npm test -- throttle.test.js

# Run tests matching a pattern
npm test -- --testNamePattern="throttle"

# Run with verbose output
npm test -- --verbose
```

## 📝 Notes

- **Frontend tests:** All React component, hook, and utility tests
- **Backend tests:** Separate test suite (if exists) in `backend/` directory
- **Test files:** Use `.test.js` or `.test.jsx` extension
- **Setup file:** `src/__tests__/setupTests.js` configures Jest

---

**Summary:** Always run `npm test` from the `TWS/frontend` directory, not from the root or backend directory.
