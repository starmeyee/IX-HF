export const ROLES = {
  ADMIN:   'ADMIN',
  MONITOR: 'MONITOR',
  STUDENT: 'STUDENT',
  TEACHER: 'TEACHER',
  STAR_BATCH_EXTERNAL: 'STAR_BATCH_EXTERNAL',
};

export const TEST_PHONE = '9999999999';

const MONITORS = [1, 9, 35, 37];
const ADMINS   = [23];

export function getUserRole(rollNo) {
  const roll = parseInt(rollNo, 10);
  // Star Batch external users: new signups get 100-199 (see
  // starBatchService.getNextStarBatchRoll). Roll 85 is kept mapped here for
  // backward compatibility with users registered before this range existed —
  // safe to remove once no user doc still has rollNo === 85.
  if (roll === 85 || (roll >= 100 && roll <= 199)) return ROLES.STAR_BATCH_EXTERNAL;
  if (!roll || roll <= 0) return ROLES.STUDENT;
  if (ADMINS.includes(roll))   return ROLES.ADMIN;
  if (MONITORS.includes(roll)) return ROLES.MONITOR;
  return ROLES.STUDENT;
}
