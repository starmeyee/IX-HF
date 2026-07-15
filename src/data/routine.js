import { fromDateKey } from './attendanceUtils';
import { getClassConfig } from '../services/classConfigService';

export const PERIOD_LABELS = ['1st', '2nd', '3rd', '4th', '5th', '6th'];

export async function getPeriodsForDate(dateKey) {
  const weekday = fromDateKey(dateKey).getDay();
  const config = await getClassConfig();
  const subjects = config.routine[weekday];
  if (!subjects) return [];
  return subjects.map((subject, i) => ({ period: PERIOD_LABELS[i], subject }));
}

export function weekdayName(dateKey) {
  return fromDateKey(dateKey).toLocaleDateString('en-IN', { weekday: 'long' });
}
