export const ROLES = {
  ADMIN:   'ADMIN',
  MONITOR: 'MONITOR',
  STUDENT: 'STUDENT',
  TEACHER: 'TEACHER',
};

export const TEST_PHONE = '9999999999';

const MONITORS = [];
const ADMINS   = [8]; // Roll 8 (Astha Kumari) is admin

export function getUserRole(rollNo) {
  const roll = parseInt(rollNo, 10);
  if (!roll || roll <= 0) return ROLES.STUDENT;
  if (ADMINS.includes(roll))   return ROLES.ADMIN;
  if (MONITORS.includes(roll)) return ROLES.MONITOR;
  return ROLES.STUDENT;
}
