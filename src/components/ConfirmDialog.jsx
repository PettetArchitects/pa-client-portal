import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

export const ConfirmDialog = ({
  open,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmColor = 'var(--color-accent)',
}) => {
  const dialogRef = useRef(null);

  // Handle Escape key
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === dialogRef.current) {
      onCancel?.();
    }
  };

  if (!open) return null;

  const content = (
    <div
      ref={dialogRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.55)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="glass rounded-xl shadow-xl max-w-sm w-full mx-4 p-6">
        <h2
          className="text-[15px] font-medium mb-3"
          style={{ color: 'var(--color-text)' }}
        >
          {title}
        </h2>

        <p
          className="text-[13px] font-light mb-6"
          style={{ color: 'var(--color-muted)' }}
        >
          {message}
        </p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="text-[12px] font-medium px-4 py-2 rounded-lg transition-colors hover:opacity-80"
            style={{ color: 'var(--color-muted)' }}
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="text-[12px] font-medium px-4 py-2 rounded-lg text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: confirmColor }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
};
