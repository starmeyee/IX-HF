import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { syllabusData } from '../data/syllabusData';

/**
 * Syllabus tracking service.
 *
 * Design (hybrid — base bundled, mutable state in Firestore):
 *   • Base syllabus structure lives in src/data/syllabusData.js. It is
 *     bundled with the app, so it is always available with zero reads and
 *     needs no "seed" step.
 *   • Monitor-added topics are stored in Firestore at
 *       config/syllabusExtraTopics  →  { [chapterId]: [ {topicId, topicName} ] }
 *     and merged onto the base structure at read time.
 *   • "Completed" state (set by monitor/admin, global for the class) lives at
 *       config/syllabusCompleted  →  { completedTopics: string[] }
 *     where each entry is a globally-unique topicId.
 *   • "Checked" state (per-student) lives on the user document
 *       users/{phone}.checkedTopics: string[]
 *     handled in authService.js.
 *
 * Topic IDs are globally unique (e.g. "science-0-c0-t3"), so the completed
 * and checked arrays are flat string sets — cheap to diff and look up.
 */

const CONFIG = 'config';
const COMPLETED_DOC = 'syllabusCompleted';
const EXTRA_DOC = 'syllabusExtraTopics';
const HIDDEN_DOC = 'syllabusHiddenTopics';

function completedRef() {
  return doc(db, CONFIG, COMPLETED_DOC);
}
function extraRef() {
  return doc(db, CONFIG, EXTRA_DOC);
}
function hiddenRef() {
  return doc(db, CONFIG, HIDDEN_DOC);
}

/** Returns the set of hidden (deleted) base topic IDs. */
export async function getHiddenTopics() {
  const snap = await getDoc(hiddenRef());
  if (!snap.exists()) return new Set();
  return new Set(snap.data().hidden || []);
}

/** Adds a base topic ID to the hidden list (soft-delete). */
export async function hideBaseTopic(topicId) {
  const hidden = await getHiddenTopics();
  hidden.add(topicId);
  await setDoc(hiddenRef(), { hidden: Array.from(hidden) }, { merge: true });
}

/** Removes a topic ID from the hidden list (restore). */
export async function restoreBaseTopic(topicId) {
  const hidden = await getHiddenTopics();
  hidden.delete(topicId);
  await setDoc(hiddenRef(), { hidden: Array.from(hidden) }, { merge: true });
}

// ── Extra (monitor-added) topics ───────────────────────────────

/** Returns a map of { chapterId: [{topicId, topicName}, …] }. */
export async function getExtraTopics() {
  const snap = await getDoc(extraRef());
  if (!snap.exists()) return {};
  return snap.data().topics || {};
}

/**
 * Returns the full syllabus (base + monitor-added topics, minus hidden) as a
 * deep-cloned array.
 */
export async function getSyllabus() {
  const [extra, hidden] = await Promise.all([getExtraTopics(), getHiddenTopics()]);
  return mergeSyllabus(extra, hidden);
}

/** Synchronous merge of the bundled base with an extra-topics map, filtering hidden IDs. */
export function mergeSyllabus(extraTopics = {}, hiddenTopics = new Set()) {
  return syllabusData.map((section) => ({
    ...section,
    subjects: section.subjects.map((subject) => ({
      ...subject,
      chapters: subject.chapters.map((chapter) => {
        const added = extraTopics[chapter.chapterId] || [];
        return {
          ...chapter,
          topics: [
            ...chapter.topics.filter((t) => !hiddenTopics.has(t.topicId)).map((t) => ({ ...t })),
            ...added.map((t) => ({ ...t })),
          ],
        };
      }),
    })),
  }));
}

/**
 * Appends a new topic to a chapter (monitor action). Generates an
 * append-safe unique id so it never collides with seed or prior additions.
 * Returns the new topic { topicId, topicName }.
 */
export async function addTopicToChapter(chapterId, topicName) {
  const name = topicName.trim();
  if (!name) throw new Error('Topic name cannot be empty.');

  const extra = await getExtraTopics();
  const list = extra[chapterId] || [];

  // Guard against duplicates (case-insensitive) within this chapter's adds.
  if (list.some((t) => t.topicName.toLowerCase() === name.toLowerCase())) {
    throw new Error('That topic already exists in this chapter.');
  }

  const topicId = `${chapterId}-x${Date.now().toString(36)}`;
  const next = { ...extra, [chapterId]: [...list, { topicId, topicName: name }] };
  await setDoc(extraRef(), { topics: next }, { merge: true });
  return { topicId, topicName: name };
}

/**
 * Removes a monitor-added topic from a chapter. Only works for extra topics
 * (those with topicId containing '-x'). Base syllabus topics are ignored.
 */
export async function deleteTopicFromChapter(chapterId, topicId) {
  const extra = await getExtraTopics();
  const list = extra[chapterId] || [];
  const next = { ...extra, [chapterId]: list.filter((t) => t.topicId !== topicId) };
  await setDoc(extraRef(), { topics: next }, { merge: true });
}

// ── Completed topics (monitor/admin, global) ───────────────────

/** Returns the array of completed topic IDs (global for the class). */
export async function getCompletedTopics() {
  const snap = await getDoc(completedRef());
  if (!snap.exists()) return [];
  return snap.data().completedTopics || [];
}

/** Overwrites the completed-topics list (de-duped). */
export async function setCompletedTopics(topicIds) {
  const cleaned = Array.from(new Set(topicIds));
  await setDoc(completedRef(), { completedTopics: cleaned }, { merge: true });
  return cleaned;
}

/**
 * Toggles a single topic's completed state. Returns the updated list.
 * Pass the current list to avoid an extra read.
 */
export async function toggleCompletedTopic(topicId, currentList = null) {
  const list = currentList ?? (await getCompletedTopics());
  const set = new Set(list);
  set.has(topicId) ? set.delete(topicId) : set.add(topicId);
  return setCompletedTopics(Array.from(set));
}

/**
 * Bulk set completed state for many topics at once (e.g. "mark whole
 * chapter complete"). `add=true` adds them, `add=false` removes them.
 */
export async function setCompletedBulk(topicIds, add, currentList = null) {
  const list = currentList ?? (await getCompletedTopics());
  const set = new Set(list);
  for (const id of topicIds) {
    if (add) set.add(id);
    else set.delete(id);
  }
  return setCompletedTopics(Array.from(set));
}
