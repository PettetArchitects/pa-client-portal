import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(undefined);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);
  const MAX_TOASTS = 3;

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = idRef.current++;
    setToasts((prev) => {
      const newToasts = [...prev, { id, message, type }];
      // Remove oldest toast if we exceed max
      if (newToasts.length > MAX_TOASTS) {
        return newToasts.slice(1);
      }
      return newToasts;
    });

    // Auto-dismiss
    const timeoutId = setTimeout(() => {
      removeToast(id);
    }, duration);

    return () => clearTimeout(timeoutId);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

function ToastContainer({ toasts, onRemove }) {
  return createPortal(
    <div className="fixed top-6 right-6 z-300 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          onRemove={onRemove}
        />
      ))}
    </div>,
    document.body
  );
}

function Toast({ id, message, type, onRemove }) {
  const getColorVar = () => {
    switch (type) {
      case 'success':
        return 'var(--color-approved)';
      case 'error':
        return 'var(--color-urgent)';
      case 'info':
      default:
        return 'var(--color-muted)';
    }
  };

  const getIcon = () => {
    const colorStyle = { color: getColorVar() };
    switch (type) {
      case 'success':
        return <CheckCircle2 size={16} style={colorStyle} />;
      case 'error':
        return <AlertTriangle size={16} style={colorStyle} />;
      case 'info':
      default:
        return <Info size={16} style={colorStyle} />;
    }
  };

  return (
    <div
      className="glass-s rounded-lg px-4 py-3 flex items-center gap-3 min-w-[280px] max-w-[380px] pointer-events-auto shadow-lg"
      style={{ animation: 'slideInRight 0.25s ease-out' }}
    >
      <div className="flex-shrink-0">{getIcon()}</div>

      <p
        className="flex-1"
        style={{
          fontSize: '12px',
          lineHeight: '1.5',
          color: 'var(--color-text)',
        }}
      >
        {message}
      </p>

      <button
        onClick={() => onRemove(id)}
        className="flex-shrink-0 hover:opacity-70 transition-opacity"
        style={{ color: 'var(--color-text)' }}
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </div>
  );
}
