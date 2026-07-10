# Star Batch Bulk Upload Guide

This guide explains how Admins can bulk upload hundreds of questions to the Reliable Question Bank using a JSON file.

## The JSON Format
Your file must be a valid JSON array containing objects. Each object represents one question.

### Required Fields
- `sectionId`: The ID of the section (e.g., `"science"`, `"mathematics"`)
- `subjectId`: The ID of the subject (e.g., `"physics"`, `"algebra"`)
- `chapterId`: The ID of the chapter (e.g., `"phy-ch-3"`, `"math-alg-2"`)
- `questionText`: The actual question text. (Can be left empty `""` ONLY IF `imageUrl` is provided).
- `marks`: The marks for the question. **Must be one of**: `"1"`, `"2"`, `"3"`, `"4"`, `"5"`, `"6"`, `"10"`, or `"Unknown"`.
- `source`: Where the question came from. **Must be one of**: `"School Test"`, `"Coaching"`, `"NCERT"`, `"Previous Year"`, `"Other"`, or `"Unknown"`.

### Optional Fields
- `topicName`: A short title or description (e.g., `"Important Numericals"`). If omitted, it will default to `"Untitled Topic"`.
- `imageUrl`: A direct public link to an image (e.g., `"https://res.cloudinary.com/..."`).

---

## How to Find the Correct IDs (sectionId, subjectId, chapterId)
You must use the exact IDs defined in your system (`syllabusData.js`). 
Here are some common examples:

**Science**
- Section: `"science"`
- Subjects: `"physics"`, `"chemistry"`, `"biology"`
- Chapters: `"phy-ch-3"` (for Chapter 3), `"chem-ch-1"`, etc.

**Mathematics**
- Section: `"mathematics"`
- Subjects: `"algebra"`, `"geometry"`, `"calculus"`
- Chapters: `"math-alg-2"`, etc.

If you are unsure of an ID, open `src/data/syllabusData.js` to see the exact mapping.

---

## Example Template

```json
[
  {
    "sectionId": "science",
    "subjectId": "physics",
    "chapterId": "phy-ch-3",
    "topicName": "Resistance in Series",
    "questionText": "Derive the expression for the equivalent resistance when three resistors R1, R2, and R3 are connected in series.",
    "imageUrl": "",
    "marks": "5",
    "source": "Previous Year"
  }
]
```

## How to Upload
1. Log in to the application with an **Admin** account.
2. Navigate to the **Star Batch** -> Reliable Question Bank page.
3. Click the **"Bulk Upload JSON"** button in the header (only visible to admins).
4. Select your `.json` file.
5. The system will process the file, validate the schema, and upload the questions in batches. Do not close the window until you see the success message.
