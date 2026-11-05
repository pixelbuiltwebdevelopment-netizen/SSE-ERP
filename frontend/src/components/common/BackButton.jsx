import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * Global Fallback Route Resolver
 * Deterministically maps child routes to their logical parent module page
 * to prevent users from leaving the ERP application when opening URLs directly.
 */
export const resolveParentRoute = (pathname) => {
  if (!pathname || pathname === '/' || pathname === '/dashboard') return '/dashboard';

  // Explicit ERP child route hierarchies
  if (pathname.startsWith('/expenses/')) return '/expenses';
  if (pathname.startsWith('/roles/')) return '/roles';
  if (pathname.startsWith('/companies/create')) return '/companies';
  if (/^\/companies\/[^/]+\/edit/.test(pathname)) {
    const parts = pathname.split('/');
    return `/companies/${parts[2]}`; // Back to company detail
  }
  if (pathname.startsWith('/companies/')) return '/companies';
  if (pathname.startsWith('/attendance/')) return '/attendance';
  if (pathname.startsWith('/leaves/')) return '/leaves';
  if (pathname.startsWith('/tickets/')) return '/tickets';
  if (pathname.startsWith('/salary/')) return '/salary';
  if (pathname.startsWith('/users/')) return '/users';
  if (pathname.startsWith('/modules/')) return '/modules';

  // Generic parent calculation: strip trailing slug
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 1) {
    segments.pop();
    return '/' + segments.join('/');
  }
  return '/dashboard';
};

/**
 * Enterprise Reusable BackButton Component
 * Features:
 * - Smart history traversal (navigate(-1)) when in-app navigation history exists
 * - Safe fallback to parent module on direct URL entry or page refresh
 * - Preserves React Router history stack and prevents navigation loops
 * - Accessible with tooltip, ARIA tags, and keyboard focus states
 * - Consistent styling matching the ERP design system
 */
const BackButton = ({
  fallback,
  onBack,
  tooltip = 'Go Back',
  className = '',
  size = 18,
  style = {},
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = (e) => {
    e.preventDefault();

    if (onBack) {
      onBack();
      return;
    }

    // Determine target fallback route
    const targetFallback = fallback || location.state?.from || resolveParentRoute(location.pathname);

    // React Router v6 history depth check:
    // window.history.state.idx > 0 confirms user navigated from another page in this ERP session
    const hasHistory =
      window.history.state &&
      typeof window.history.state.idx === 'number' &&
      window.history.state.idx > 0;

    if (hasHistory) {
      navigate(-1);
    } else {
      // Direct access or page refresh where history depth is 0
      navigate(targetFallback, { replace: true });
    }
  };

  return (
    <button
      type="button"
      className={`erp-back-btn ${className}`}
      onClick={handleBack}
      title={tooltip}
      aria-label={tooltip}
      style={style}
    >
      <ArrowLeft size={size} strokeWidth={2.2} />
    </button>
  );
};

export default BackButton;
