# Maths Marks Module — Phase 2 Specification

> **Status:** Phase 1 is DONE and live. Phase 2 is NOT started.
> **Purpose of this doc:** A complete, self-contained brief so any AI agent can
> implement Phase 2 correctly without re-discovering context.

---

## 1. Background — what Phase 1 already built (DO NOT rebuild)

Phase 1 added a **teacher-facing module** to create extra Maths tests and enter
marks. It is **purely additive** — it does NOT touch any student-facing page yet.

### Files created in Phase 1
- `src/services/mathTestService.js` — Firestore CRUD for dynamic tests + marks.
- `src/components/MarksManager.jsx` — the teacher UI (test chips, new-test modal,
  per-student rows with marks input / Absent toggle / clear).
- Toggle added in `src/pages/AdminServicesPage.jsx` → Teachers tab
  ("Marks: On/Off" per teacher, writes `canManageMarks` boolean).
- `setTeacherMarksAccess()` added in `src/services/teacherService.js`.
- `MarksManager` rendered in `src/pages/TeacherToolsPage.jsx`, gated by
  `currentUser.canManageMarks`.
- `mm-*` CSS in `src/index.css`.

### Firestore schema (already in use)
```
mathTests/{testId} → {
  name: "Test 3",
  maxMarks: 20,          // teacher-defined per test
  order: 3,              // legacy Test 1 & 2 are conceptually order 1 & 2
  createdBy: <teacherId>,
  createdAt: <serverTimestamp>
}
mathTestMarks/{testId}_{rollNo} → {
  testId, rollNo,
  marks: <number> | "Ab",   // "Ab" = absent
  updatedAt: <serverTimestamp>
}
teachers/{id}.canManageMarks: boolean
```

### Legacy data (the CURRENTLY live system — handle with care)
- `src/data/mathMarks.js` exports `MATH_MARKS_RAW` =
  `[{ roll, name, test1, test2 }]` where each value is a number or `"Ab"`,
  and `MAX_MARKS = 10`.
- `marksOverrides/{rollNo}` in Firestore patches legacy marks (set when admin
  approves a marks complaint). Read via `getOverrides()` in
  `src/services/marksService.js`.
- Consumers of the legacy data:
  - `src/pages/MathsDashboard.jsx` (~600 lines, hardcoded to test1/test2, has
    recharts visualisations) — **the most fragile, most-used file.**
  - `src/pages/TestScoresPage.jsx` (student personal score view; recently
    refactored, cleaner two-column layout).
  - Complaint system in `src/services/marksService.js`.

---

## 2. Phase 2 Goal

Surface the Phase-1 dynamic tests (Test 3, 4, …) to **students**, alongside the
legacy Test 1 & 2, in:
1. `TestScoresPage.jsx` (personal view) — **do this first, it's lower risk.**
2. `MathsDashboard.jsx` (class view) — **do this second, highest risk.**

### Decisions already made by the product owner
- **Q: Should dynamic tests show to students?** → YES, fully integrated.
- **Q: Max marks per test?** → Teacher-defined per test (already stored as
  `maxMarks`). Test 1 & 2 remain out of 10.
- **Q: Access control?** → Per-teacher `canManageMarks` toggle (done in Phase 1).

### Critical consequence — mixed max marks
Because tests can now have different `maxMarks` (10, 20, 25…), any
**cross-test aggregate** (overall average, ranking, improvement, distribution
charts) MUST normalise to **percentage**: `pct = marks / maxMarks * 100`.
Per-test displays still show raw `marks / maxMarks`.

---

## 3. The Safety Pattern (NON-NEGOTIABLE)

Real users depend on these pages right now. Phase 2 must be **regression-proof**:

1. **Keep the legacy test1/test2 code path fully intact as the baseline.**
2. Build a single helper that returns a **unified test list** merging legacy +
   dynamic tests. If dynamic fetch returns empty OR throws, the pages must
   behave **exactly** as they do today (legacy-only).
3. Wrap all dynamic fetches in try/catch that fall back to legacy-only.
4. Do NOT migrate or rewrite `mathMarks.js`. Legacy Test 1 & 2 stay as static
   data forever (unless a separate migration task is requested).
5. Test on a branch / preview deploy before merging to `main`.

### Suggested unified-model helper (add to `mathTestService.js`)
```js
// Returns a uniform list the UI can iterate over without caring about source.
// Shape: [{ key, name, maxMarks, legacy: bool }]
//   legacy tests: key = 'test1' | 'test2'
//   dynamic tests: key = <testId>
export async function getUnifiedTests() {
  const legacy = [
    { key: 'test1', name: 'Test 1', maxMarks: 10, legacy: true },
    { key: 'test2', name: 'Test 2', maxMarks: 10, legacy: true },
  ];
  try {
    const dynamic = await getTests(); // ordered by `order`
    return [
      ...legacy,
      ...dynamic.map(t => ({ key: t.id, name: t.name, maxMarks: t.maxMarks, legacy: false })),
    ];
  } catch (err) {
    console.error('Dynamic tests fetch failed, falling back to legacy only:', err);
    return legacy; // <-- regression-proof fallback
  }
}

// Resolve a single student's mark for any test (legacy or dynamic).
// For legacy: read MATH_MARKS_RAW + marksOverrides.
// For dynamic: read mathTestMarks/{testId}_{rollNo}.
// Return: number | null (null = absent or no data). Keep "Ab" -> null parity
// with the existing resolve() in TestScoresPage / MathsDashboard.
```

You will also need a batch fetch for the dashboard: load all `mathTestMarks` for
each dynamic test once (e.g. `getTestMarks(testId)`), build a
`{ rollNo: marks }` map per test, to avoid N+1 reads.

---

## 4. Task Breakdown

### Task A — Unified model helper + tests
- Add `getUnifiedTests()` and a mark-resolver to `mathTestService.js`
  (or a small new `marksModel.js` if cleaner).
- Unit-reason about the percentage normalisation helper:
  `toPct(marks, maxMarks)`.
- **Demo:** From console, `getUnifiedTests()` returns legacy + dynamic; killing
  the network still returns the 2 legacy tests.

### Task B — TestScoresPage integration (LOWER RISK, do first)
- Replace hardcoded `t1`/`t2` logic with a loop over `getUnifiedTests()`.
- One score card per test (raw `marks / maxMarks`).
- **Overall average + rank computed on percentage basis** across all tests the
  student has a mark for.
- Class analytics table: one row per test (avg / high / low / present), each in
  that test's own scale.
- Complaint form: the "Which test?" dropdown lists all tests dynamically.
  - NOTE: `marksService.fileComplaint` stores `test` as a string key
    (`'test1'`). For dynamic tests use the `testId`. The admin complaint
    resolver (`applyOverride`) currently writes to `marksOverrides/{rollNo}`
    keyed by `test1/test2` — dynamic-test complaints will need either a
    matching override path in `mathTestMarks` OR a clearly separated handling.
    Decide and document; do NOT silently break legacy complaint approval.
- **Demo:** A student with a Test 3 mark sees its card, correct overall rank,
  and can file a complaint against Test 3.

### Task C — MathsDashboard integration (HIGHEST RISK, do last)
- Generalise the dashboard to iterate over `getUnifiedTests()`:
  - Roster table: one column per test.
  - Per-test stat cards (avg, present count) generated dynamically.
  - Comparison / distribution charts: normalise to percentage when mixing tests
    of different `maxMarks`; keep per-test raw where a chart is single-test.
- Preserve every existing chart's current behaviour for the legacy-only case.
- This file is large and tightly coupled — change incrementally, build & eyeball
  after each section.
- **Demo:** Dashboard renders with 3 tests, no console errors, legacy stats
  unchanged when no dynamic tests exist.

### Task D — Verify + ship
- `npm run build` clean.
- Manual click-through: student with dynamic marks, student without, teacher,
  admin. Confirm legacy-only users see zero change.
- Commit per task; push only after full verification.

---

## 5. Acceptance Criteria
- [ ] With NO dynamic tests, TestScoresPage & MathsDashboard look/behave 100%
      identical to pre-Phase-2.
- [ ] With dynamic tests, students see them with correct per-test scale.
- [ ] Cross-test aggregates use percentage normalisation (no unfair mixing).
- [ ] Complaints work for both legacy and dynamic tests (or dynamic-test
      complaint handling is explicitly defined, not broken).
- [ ] Build passes; no console errors in any role.

## 6. Out of Scope (do NOT do unless separately asked)
- Making legacy Test 1 & 2 editable in the teacher module.
- Migrating `mathMarks.js` into Firestore.
- Changing the complaint/override schema for legacy tests.

---

## 7. How to invoke
Tell the AI: *"Do Phase 2 of the Maths marks module"* and point it at this file
(`MATHS_MARKS_MODULE_PHASE2.md`). It should read Phase 1 files first, then follow
Tasks A→D in order, honouring the Safety Pattern in section 3.
