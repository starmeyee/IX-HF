# Star Batch Test JSON Generation Skill

You are an AI tasked with converting raw MCQ questions into a strictly formatted JSON file for the Star Batch Test module.

## Output Schema
Your output must be a JSON array of objects, separating out each chapter. Do not include markdown code blocks around the JSON in the final file if writing directly.

```json
[
  {
    "chapterId": "science-0-c0",
    "subjectId": "science-0",
    "sectionId": "science",
    "title": "Light: Reflection and Refraction",
    "questions": [
      {
        "text": "The radius of curvature of a spherical mirror is 20 cm. What is its focal length?",
        "options": ["10 cm", "20 cm", "40 cm", "5 cm"],
        "correctOptionIndex": 0,
        "difficulty": "Easy",
        "topic": "Spherical Mirrors"
      }
    ]
  },
  {
    "chapterId": "science-0-c1",
    "subjectId": "science-0",
    "sectionId": "science",
    "title": "Human Eye and Colourful World",
    "questions": [
      {
        "text": "Which part of the eye controls the amount of light entering it?",
        "options": ["Cornea", "Iris", "Pupil", "Retina"],
        "correctOptionIndex": 1,
        "difficulty": "Easy",
        "topic": "Human Eye Structure"
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
  - `topic`: (String) The specific topic the question belongs to (e.g. "Laws of Reflection").

## ID Reference Guide

You MUST use the exact IDs provided below for the `sectionId`, `subjectId`, and `chapterId` fields. Do NOT invent or guess IDs.

### Section: Science (ID: `science`)

#### Subject: Physics (ID: `science-0`)

- **Light - Reflection and Refraction** (ID: `science-0-c0`)
- **Human Eye and Colourful World** (ID: `science-0-c1`)
- **Electricity** (ID: `science-0-c2`)
- **Magnetic Effects of Electric Current** (ID: `science-0-c3`)

#### Subject: Chemistry (ID: `science-1`)

- **Chemical Reactions and Equations** (ID: `science-1-c0`)
- **Acids, Bases and Salts** (ID: `science-1-c1`)
- **Metals and Non-Metals** (ID: `science-1-c2`)
- **Carbon and Its Compounds** (ID: `science-1-c3`)
- **Periodic Classification of Elements** (ID: `science-1-c4`)

#### Subject: Biology (ID: `science-2`)

- **Life Processes** (ID: `science-2-c0`)
- **Control and Coordination** (ID: `science-2-c1`)
- **How Do Organisms Reproduce?** (ID: `science-2-c2`)
- **Heredity and Evolution** (ID: `science-2-c3`)
- **Our Environment** (ID: `science-2-c4`)
- **Sustainable Management of Natural Resources** (ID: `science-2-c5`)

### Section: SST (ID: `sst`)

#### Subject: History (ID: `sst-0`)

- **The Rise of Nationalism in Europe** (ID: `sst-0-c0`)
- **Nationalism in India** (ID: `sst-0-c1`)
- **The Making of a Global World** (ID: `sst-0-c2`)
- **The Age of Industrialisation** (ID: `sst-0-c3`)
- **Print Culture and the Modern World** (ID: `sst-0-c4`)

#### Subject: Geography (ID: `sst-1`)

- **Resources and Development** (ID: `sst-1-c0`)
- **Forest and Wildlife Resources** (ID: `sst-1-c1`)
- **Water Resources** (ID: `sst-1-c2`)
- **Agriculture** (ID: `sst-1-c3`)
- **Minerals and Energy Resources** (ID: `sst-1-c4`)
- **Manufacturing Industries** (ID: `sst-1-c5`)
- **Lifelines of National Economy** (ID: `sst-1-c6`)

#### Subject: Political Science (Civics) (ID: `sst-2`)

- **Power Sharing** (ID: `sst-2-c0`)
- **Federalism** (ID: `sst-2-c1`)
- **Gender Religion and Caste** (ID: `sst-2-c2`)
- **Political Parties** (ID: `sst-2-c3`)
- **Outcomes of Democracy** (ID: `sst-2-c4`)

#### Subject: Economics (ID: `sst-3`)

- **Development** (ID: `sst-3-c0`)
- **Sectors of the Indian Economy** (ID: `sst-3-c1`)
- **Money and Credit** (ID: `sst-3-c2`)
- **Globalisation and the Indian Economy** (ID: `sst-3-c3`)
- **Consumer Rights** (ID: `sst-3-c4`)

### Section: Maths (ID: `maths`)

#### Subject: Mathematics (ID: `maths-0`)

- **Real Numbers** (ID: `maths-0-c0`)
- **Polynomials** (ID: `maths-0-c1`)
- **Pair of Linear Equations in Two Variables** (ID: `maths-0-c2`)
- **Quadratic Equations** (ID: `maths-0-c3`)
- **Arithmetic Progressions** (ID: `maths-0-c4`)
- **Triangles** (ID: `maths-0-c5`)
- **Coordinate Geometry** (ID: `maths-0-c6`)
- **Introduction to Trigonometry** (ID: `maths-0-c7`)
- **Applications of Trigonometry** (ID: `maths-0-c8`)
- **Circles** (ID: `maths-0-c9`)
- **Areas Related to Circles** (ID: `maths-0-c10`)
- **Surface Areas and Volumes** (ID: `maths-0-c11`)
- **Statistics** (ID: `maths-0-c12`)
- **Probability** (ID: `maths-0-c13`)

### Section: English (ID: `english`)

#### Subject: Reading Skills (ID: `english-0`)

- **Unseen Passage** (ID: `english-0-c0`)

#### Subject: Writing Skills (ID: `english-1`)

- **Article Writing** (ID: `english-1-c0`)
- **Speech Writing** (ID: `english-1-c1`)
- **Debate Writing** (ID: `english-1-c2`)
- **Letter Writing** (ID: `english-1-c3`)
- **Story Writing** (ID: `english-1-c4`)

#### Subject: Grammar (ID: `english-2`)

- **Tenses** (ID: `english-2-c0`)
- **Modals** (ID: `english-2-c1`)
- **Subject Verb Agreement** (ID: `english-2-c2`)
- **Determiners** (ID: `english-2-c3`)
- **Reported Speech** (ID: `english-2-c4`)
- **Active and Passive Voice** (ID: `english-2-c5`)
- **Editing and Omission** (ID: `english-2-c6`)

#### Subject: Literature (ID: `english-3`)

- **Two Gentlemen of Verona** (ID: `english-3-c0`)
- **Mrs Packletides Tiger** (ID: `english-3-c1`)
- **The Letter** (ID: `english-3-c2`)
- **A Shady Plot** (ID: `english-3-c3`)
- **Patol Babu Film Star** (ID: `english-3-c4`)
- **Virtually True** (ID: `english-3-c5`)
- **The Frog and the Nightingale** (ID: `english-3-c6`)
- **Mirror** (ID: `english-3-c7`)
- **Not Marble Nor the Gilded Monuments** (ID: `english-3-c8`)
- **Ozymandias** (ID: `english-3-c9`)
- **The Rime of the Ancient Mariner** (ID: `english-3-c10`)
- **Snake** (ID: `english-3-c11`)
- **The Dear Departed** (ID: `english-3-c12`)
- **Julius Caesar** (ID: `english-3-c13`)

### Section: IT (ID: `it`)

#### Subject: Employability Skills (ID: `it-0`)

- **Communication Skills** (ID: `it-0-c0`)
- **Self Management Skills** (ID: `it-0-c1`)
- **ICT Skills** (ID: `it-0-c2`)
- **Entrepreneurial Skills** (ID: `it-0-c3`)
- **Green Skills** (ID: `it-0-c4`)

#### Subject: Vocational Skills (ID: `it-1`)

- **Digital Documentation Advanced** (ID: `it-1-c0`)
- **Electronic Spreadsheet Advanced** (ID: `it-1-c1`)
- **Database Management System** (ID: `it-1-c2`)
- **Web Applications and Security** (ID: `it-1-c3`)

### Section: Hindi (ID: `hindi`)

#### Subject: Sparsh (ID: `hindi-0`)

- **बड़े भाई साहब** (ID: `hindi-0-c0`)
- **डायरी का एक पन्ना** (ID: `hindi-0-c1`)
- **तताँरा-वामीरो कथा** (ID: `hindi-0-c2`)
- **तीसरी कसम के शिल्पकार शैलेन्द्र** (ID: `hindi-0-c3`)
- **अब कहाँ दूसरे के दुख से दुखी होने वाले** (ID: `hindi-0-c4`)
- **पतझर में टूटी पत्तियाँ** (ID: `hindi-0-c5`)
- **कारतूस** (ID: `hindi-0-c6`)

#### Subject: Sparsh Poetry (ID: `hindi-1`)

- **साखी** (ID: `hindi-1-c0`)
- **पद** (ID: `hindi-1-c1`)
- **मनुष्यता** (ID: `hindi-1-c2`)
- **पर्वत प्रदेश में पावस** (ID: `hindi-1-c3`)
- **तोप** (ID: `hindi-1-c4`)
- **कर चले हम फ़िदा** (ID: `hindi-1-c5`)
- **आत्मत्राण** (ID: `hindi-1-c6`)

#### Subject: Sanchayan (ID: `hindi-2`)

- **हरिहर काका** (ID: `hindi-2-c0`)
- **सपनों के से दिन** (ID: `hindi-2-c1`)
- **टोपी शुक्ला** (ID: `hindi-2-c2`)

#### Subject: Grammar (ID: `hindi-3`)

- **पद परिचय** (ID: `hindi-3-c0`)
- **रचना के आधार पर वाक्य भेद** (ID: `hindi-3-c1`)
- **वाच्य** (ID: `hindi-3-c2`)
- **अलंकार** (ID: `hindi-3-c3`)
- **समास** (ID: `hindi-3-c4`)
- **मुहावरे** (ID: `hindi-3-c5`)
- **अपठित गद्यांश** (ID: `hindi-3-c6`)
- **अपठित पद्यांश** (ID: `hindi-3-c7`)
- **पत्र लेखन** (ID: `hindi-3-c8`)
- **अनुच्छेद लेखन** (ID: `hindi-3-c9`)
- **सूचना लेखन** (ID: `hindi-3-c10`)
- **लघुकथा लेखन** (ID: `hindi-3-c11`)
- **विज्ञापन लेखन** (ID: `hindi-3-c12`)
- **ई-मेल लेखन** (ID: `hindi-3-c13`)

