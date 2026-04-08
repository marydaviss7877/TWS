import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './index.css';
import App from './App';
import { AuthProvider } from './app/providers/AuthContext';
import { SocketProvider } from './app/providers/SocketContext';
import ErrorBoundary from './shared/components/feedback/ErrorBoundary';
import { setupGlobalErrorHandling } from './shared/utils/errorHandler';
import './shared/utils/debugExternalScripts'; // Auto-runs in development

// Setup global error handling for external scripts
if (typeof window !== 'undefined') {
  setupGlobalErrorHandling();
  
  // Suppress external script errors (like browser extensions)
  const originalError = console.error;
  console.error = (...args) => {
    const message = args[0]?.toString() || '';
    if (message.includes('share-modal.js') || 
        message.includes('addEventListener') ||
        message.includes('Cannot read properties of null') ||
        message.includes('share-modal') ||
        message.includes('Cannot read properties of null (reading \'addEventListener\')')) {
      return; // Suppress external script errors
    }
    originalError.apply(console, args);
  };
  
  // Also suppress uncaught errors
  window.addEventListener('error', (e) => {
    if (e.message && (
        e.message.includes('share-modal.js') || 
        e.message.includes('share-modal') ||
        e.message.includes('Cannot read properties of null (reading \'addEventListener\')') ||
        e.filename && e.filename.includes('share-modal.js')
    )) {
      e.preventDefault();
      return false;
    }
  });
  
  // Suppress unhandled promise rejections from external scripts
  window.addEventListener('unhandledrejection', (e) => {
    if (e.reason && e.reason.toString().includes('share-modal')) {
      e.preventDefault();
      return false;
    }
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <AuthProvider>
          <SocketProvider>
            <App />
            <Toaster
              position="top-center"
              gutter={8}
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
              }}
            />
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
