import { getClassConfig } from '../services/classConfigService';

export const ROLES = {
  ADMIN:   'ADMIN',
  MONITOR: 'MONITOR',
  STUDENT: 'STUDENT',
  TEACHER: 'TEACHER',
};

export const TEST_PHONE = '9999999999';

const ADMINS = [8]; // Roll 8 (Astha Kumari) is admin

export async function getUserRole(rollNo) {
  const roll = parseInt(rollNo, 10);
  if (!roll || roll <= 0) return ROLES.STUDENT;
  if (ADMINS.includes(roll)) return ROLES.ADMIN;
  
  const config = await getClassConfig();
  if (config.monitors && config.monitors.includes(roll)) return ROLES.MONITOR;
  
  return ROLES.STUDENT;
}
