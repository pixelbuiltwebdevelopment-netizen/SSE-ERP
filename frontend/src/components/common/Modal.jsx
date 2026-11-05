import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// Module-level active modals counter to safely manage body scroll lock with nested modals
let activeModalsCount = 0;

/**
 * Enterprise Modal Dialog
 * Rendered via React Portal directly into document.body to break out of
 * ancestor CSS transforms, layout constraints, and stacking contexts.
 */
const Modal = ({
  show,
  title,
  onClose,
  children,
  size = 'md',
  footer,
  icon: Icon,
}) => {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!show) return;

    activeModalsCount++;
    const prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onCloseRef.current) {
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      activeModalsCount = Math.max(0, activeModalsCount - 1);
      if (activeModalsCount === 0) {
        document.body.style.overflow = prevBodyOverflow || '';
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [show]);

  if (!show || typeof document === 'undefined') return null;

  const getMaxWidth = () => {
    switch (size) {
      case 'sm':
        return '420px';
      case 'lg':
        return '780px';
      case 'xl':
        return '980px';
      case 'full':
        return '95vw';
      default:
        return '580px';
    }
  };

  const modalNode = (
    <div
      className="erp-modal-root"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1080,
      }}
    >
      {/* 1. Backdrop Overlay (covers complete browser viewport) */}
      <div
        className="erp-modal-backdrop"
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(11, 19, 43, 0.65)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 1080,
        }}
        onClick={() => {
          if (onClose) onClose();
        }}
        aria-hidden="true"
      />

      {/* 2. Modal Centering Wrapper (viewport-based horizontal & vertical centering) */}
      <div
        className="erp-modal-wrapper"
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 1081,
          pointerEvents: 'none',
        }}
      >
        {/* 3. Modal Dialog Card */}
        <div
          className="erp-card erp-slide-down bg-white shadow-xl overflow-hidden d-flex flex-column"
          style={{
            width: '100%',
            maxWidth: getMaxWidth(),
            maxHeight: 'calc(100vh - 40px)',
            borderRadius: 'var(--erp-radius-xl)',
            pointerEvents: 'auto',
            position: 'relative',
          }}
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="d-flex align-items-center justify-content-between px-4 py-3 border-bottom flex-shrink-0"
            style={{ backgroundColor: 'var(--erp-surface)' }}
          >
            <div className="d-flex align-items-center gap-2.5">
              {Icon && (
                <div
                  className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                  style={{
                    width: '34px',
                    height: '34px',
                    backgroundColor: 'var(--erp-primary-light)',
                    color: 'var(--erp-primary)',
                  }}
                >
                  <Icon size={18} strokeWidth={2.2} />
                </div>
              )}
              <h5 className="mb-0 fw-bold" style={{ color: 'var(--erp-text-main)', fontSize: '1.05rem' }}>
                {title}
              </h5>
            </div>

            <button
              type="button"
              className="btn btn-sm p-1 rounded-circle border-0 text-muted d-flex align-items-center justify-content-center flex-shrink-0"
              style={{ backgroundColor: 'var(--erp-surface-subtle)', width: '32px', height: '32px' }}
              onClick={onClose}
              aria-label="Close modal"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div
            className="p-4 flex-grow-1"
            style={{
              color: 'var(--erp-text-secondary)',
              overflowY: 'auto',
              minHeight: 0,
              overscrollBehavior: 'contain',
            }}
          >
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div
              className="px-4 py-3 border-top d-flex align-items-center justify-content-end gap-2 flex-shrink-0"
              style={{ backgroundColor: 'var(--erp-surface-subtle)' }}
            >
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
};

export default Modal;
