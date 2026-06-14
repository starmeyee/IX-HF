import { rollList } from './rollList';

/**
 * Checks if the entered first name matches the student's first name
 * by comparing first AND last letter (case-insensitive).
 */
function firstNameMatches(entered, official) {
  const a = entered.trim().split(/\s+/)[0].toLowerCase();
  const b = official.trim().split(/\s+/)[0].toLowerCase();
  if (a.length === 0 || b.length === 0) return false;
  return a[0] === b[0] && a[a.length - 1] === b[b.length - 1];
}

/**
 * Returns the matched student record or null.
 * @param {string} enteredName - Full name entered by student
 * @param {number} rollNo - Roll number entered
 */
export function matchStudent(enteredName, rollNo) {
  const roll = parseInt(rollNo, 10);
  const student = rollList.find((s) => s.rollNo === roll);
  if (!student) return null;
  if (!firstNameMatches(enteredName, student.name)) return null;
  return student;
}

/**
 * Checks if a given name belongs to anyone in the class based on first name matching.
 */
export function isNameInClass(enteredName) {
  return rollList.some(student => firstNameMatches(enteredName, student.name));
}
