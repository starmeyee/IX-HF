import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { ROLES } from './roles';

/**
 * Single source of truth for what Star Batch external users are allowed to
 * access outside the Star Batch portal itself. Keep this in sync with the
 * Navbar dropdown (src/components/Navbar.jsx) — the two drifting apart is
 * exactly the bug this file exists to prevent.
 *
 * Paths not listed here are BLOCKED for STAR_BATCH_EXTERNAL users:
 * pages will redirect away via useStarBatchRouteGuard(), and the Navbar
 * should not render links to them for this role.
 */
export const STAR_BATCH_ALLOWED_PATHS = [
  '/star-batch',
  '/star-login',
  '/star-syllabus',
  '/study-together',
  '/holidays',
  '/profile',
  '/notifications',
];

/**
 * Returns true if `pathname` is reachable by a Star Batch external user.
 * Handles both exact matches and path prefixes (e.g. /study-together/:roomId).
 */
export function isStarBatchAllowed(pathname) {
  return STAR_BATCH_ALLOWED_PATHS.some(
    (allowed) => pathname === allowed || pathname.startsWith(`${allowed}/`)
  );
}

/**
 * Route guard for pages NOT on the Star Batch allow-list. Call this at the
 * top of any page component that Star Batch external users should never
 * see (Marks, Test Scores, Records, class Syllabus Tracker, Admin/Monitor
 * tools, Teacher tools, etc.). If the current user is a Star Batch external
 * and somehow lands on this page (direct URL, stale bookmark, etc.), they
 * are redirected back to the Star Batch portal instead of seeing broken or
 * irrelevant content.
 *
 * Usage:
 *   export default function TestScoresPage() {
 *     useStarBatchRouteGuard();
 *     ...
 *   }
 */
export function useStarBatchRouteGuard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (currentUser?.role === ROLES.STAR_BATCH_EXTERNAL) {
      navigate('/star-batch', { replace: true });
    }
    // Intentionally re-check on path change too, in case of client-side
    // navigation between two blocked pages (guard should still catch it).
  }, [currentUser, location.pathname, navigate]);
}
