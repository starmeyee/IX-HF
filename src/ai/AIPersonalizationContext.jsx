/**
 * /src/ai/AIPersonalizationContext.jsx
 * ──────────────────────────────────────
 * React Context + Provider for the AI Personalization Layer.
 *
 * Usage:
 *   <AIPersonalizationProvider userData={...}>
 *     <YourComponent />
 *   </AIPersonalizationProvider>
 *
 *   // In any child component:
 *   const { data, loading, error, refresh } = useAIPersonalization();
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { buildUserContext } from './contextEngine';
import { generatePersonalization, getCachedPersonalization, setCachedPersonalization, isPersonalizationFresh } from './aiService';

// ── Context Definition ─────────────────────────────────────────────────────────
const AIPersonalizationContext = createContext({
  data: null,
  loading: false,
  error: null,
  refresh: () => {},
});

// ── Provider ───────────────────────────────────────────────────────────────────

/**
 * AIPersonalizationProvider wraps a section of the app and provides
 * AI personalization data to all descendants.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {Object} props.userData - Pre-fetched dashboard data object containing:
 *   attendance, absentDays, holidayCompleted, holidayTotal,
 *   latestHw, doneKeys, syllabusStats, latestClasswork
 */
export function AIPersonalizationProvider({ children, userData }) {
  const { currentUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Prevent double-fetching in StrictMode / rapid re-renders
  const fetchingRef = useRef(false);

  // The user's rollNo is used as the cache key (anonymized identifier)
  const userId = currentUser?.rollNo || currentUser?.phone?.slice(-4) || 'guest';

  /**
   * Core fetch function — builds context, checks cache, calls AI if needed.
   * @param {boolean} forceFresh - If true, bypass cache and re-fetch
   */
  const fetchPersonalization = useCallback(
    async (forceFresh = false) => {
      if (!currentUser || !userData) return;
      if (fetchingRef.current) return;

      // Check cache first (unless forced refresh)
      if (!forceFresh && isPersonalizationFresh(userId)) {
        const cached = getCachedPersonalization(userId);
        if (cached) {
          setData(cached);
          return;
        }
      }

      fetchingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        const context = buildUserContext(currentUser, userData);
        const result = await generatePersonalization(context);

        if (result) {
          setCachedPersonalization(userId, result);
          setData(result);
        } else {
          // AI returned null — graceful degradation: keep existing data or null
          setData((prev) => prev);
        }
      } catch (err) {
        // Should never reach here (aiService swallows errors), but just in case
        console.warn('[AIPersonalizationContext] Unexpected error:', err.message);
        setError(err.message);
        setData(null);
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    },
    [currentUser, userData, userId]
  );

  // ── Auto-fetch on mount (once) ───────────────────────────────────────────────
  useEffect(() => {
    // Only fetch for non-teacher logged-in users
    if (!currentUser) return;
    if (currentUser.role === 'teacher') return;

    // Don't fetch if userData isn't hydrated yet (wait for attendance/hw to load)
    if (!userData || !userData.attendance) return;

    fetchPersonalization(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // Re-run when user or key data fields change, but not on every userData reference change
    currentUser?.rollNo,
    // Trigger re-fetch when meaningful data becomes available
    userData?.attendance?.percentage,
    userData?.syllabusStats?.completedPct,
  ]);

  // ── Public refresh function ───────────────────────────────────────────────────
  const refresh = useCallback(() => {
    fetchPersonalization(true);
  }, [fetchPersonalization]);

  return (
    <AIPersonalizationContext.Provider value={{ data, loading, error, refresh }}>
      {children}
    </AIPersonalizationContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

/**
 * useAIPersonalization — consume AI personalization data in any child component.
 *
 * @returns {{ data: Object|null, loading: boolean, error: string|null, refresh: Function }}
 */
export function useAIPersonalization() {
  return useContext(AIPersonalizationContext);
}
