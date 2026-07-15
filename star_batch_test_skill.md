# Star Batch Test JSON Generation Skill

You are an AI tasked with converting raw MCQ questions into a strictly formatted JSON file for the Star Batch Test module.

## Output Schema
Your output must be a JSON array of objects, separating out each chapter. Do not include markdown code blocks around the JSON in the final file if writing directly.

```json
[
  {
    "chapterId": "sci-phy-c1",
    "subjectId": "science-physics",
    "sectionId": "science",
    "title": "Motion",
    "questions": [
      {
        "text": "A car travels 50 km to the north and then returns 50 km south. What is its displacement?",
        "options": ["100 km", "50 km", "0 km", "25 km"],
        "correctOptionIndex": 2,
        "difficulty": "Easy",
        "topic": "Distance and Displacement"
      }
    ]
  },
  {
    "chapterId": "sci-chem-c1",
    "subjectId": "science-chem",
    "sectionId": "science",
    "title": "Matter in Our Surroundings",
    "questions": [
      {
        "text": "Which of the following is not a state of matter?",
        "options": ["Solid", "Liquid", "Gas", "Energy"],
        "correctOptionIndex": 3,
        "difficulty": "Easy",
        "topic": "Physical Nature of Matter"
      }
    ]
  }
]
```

### Fields:
- `chapterId`: (String) The exact ID of the chapter from the Reference Guide below.
- `subjectId`: (String) The exact ID of the subject from the Reference Guide below.
- `sectionId`: (String) The exact ID of the section from the Reference Guide below.
- `title`: (String) A descriptive title for the test.
- `questions`: (Array of Objects) 
  - `text`: (String) The question text. **IMPORTANT**: You can and should use **Markdown** here! Use `**bold**`, bullet points (`- item`), or Markdown Tables (`| Col 1 | Col 2 |`) if a question requires a chart or structured data. Also use **LaTeX** for math and chemistry formulas! Wrap math and chemistry formulas in `$` (e.g. `$567x + 693 \times (-4)$` or `$H_2O$`).
  - `options`: (Array of Strings) Exactly 4 options. Options fully support Markdown and LaTeX formulas (e.g. `"$2x$"`).
  - `correctOptionIndex`: (Integer) The 0-based index of the correct option in the `options` array.
  - `difficulty`: (String) "Easy", "Medium", or "Hard".
  - `topic`: (String) The specific topic the question belongs to.

## ID Reference Guide (Class 9 NCERT)

You MUST use the exact IDs provided below for the `sectionId`, `subjectId`, and `chapterId` fields. Do NOT invent or guess IDs.

### Section: Science (ID: `science`)

#### Subject: Physics (ID: `science-physics`)
- **Motion** (ID: `sci-phy-c1`)
- **Force and Laws of Motion** (ID: `sci-phy-c2`)
- **Gravitation** (ID: `sci-phy-c3`)

#### Subject: Chemistry (ID: `science-chem`)
- **Matter in Our Surroundings** (ID: `sci-chem-c1`)
- **Is Matter Around Us Pure** (ID: `sci-chem-c2`)

#### Subject: Biology (ID: `science-bio`)
- **The Fundamental Unit of Life** (ID: `sci-bio-c1`)
- **Tissues** (ID: `sci-bio-c2`)


### Section: Mathematics (ID: `maths`)

#### Subject: Mathematics (ID: `maths-all`)
- **Number Systems** (ID: `math-c1`)
- **Polynomials** (ID: `math-c2`)
- **Coordinate Geometry** (ID: `math-c3`)
- **Linear Equations in Two Variables** (ID: `math-c4`)


### Section: Social Science (ID: `sst`)

#### Subject: History (ID: `sst-his`)
- **The French Revolution** (ID: `sst-his-c1`)
- **Socialism in Europe and the Russian Revolution** (ID: `sst-his-c2`)

#### Subject: Geography (ID: `sst-geo`)
- **India - Size and Location** (ID: `sst-geo-c1`)
- **Physical Features of India** (ID: `sst-geo-c2`)

#### Subject: Civics (ID: `sst-civ`)
- **What is Democracy?** (ID: `sst-civ-c1`)

#### Subject: Economics (ID: `sst-eco`)
- **The Story of Village Palampur** (ID: `sst-eco-c1`)


### Section: English (ID: `english`)

#### Subject: Beehive (ID: `eng-beehive`)
- **The Fun They Had** (ID: `eng-bee-c1`)
- **The Sound of Music** (ID: `eng-bee-c2`)

#### Subject: Moments (ID: `eng-moments`)
- **The Lost Child** (ID: `eng-mom-c1`)


### Section: Hindi (ID: `hindi`)

#### Subject: Kshitij (ID: `hin-kshitij`)
- **Do Bailon Ki Katha** (ID: `hin-ksh-c1`)

#### Subject: Kritika (ID: `hin-kritika`)
- **Is Jal Pralay Mein** (ID: `hin-kri-c1`)
