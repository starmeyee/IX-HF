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

## Complete List of Correct IDs (sectionId, subjectId, chapterId)
Below is the complete hierarchy of IDs you can use for bulk uploads.

### Science
- **Section ID**: `science`

#### Physics
- **Subject ID**: `science-0`

**Chapters:**
- `science-0-c0`: Light - Reflection and Refraction
- `science-0-c1`: Human Eye and Colourful World
- `science-0-c2`: Electricity
- `science-0-c3`: Magnetic Effects of Electric Current

#### Chemistry
- **Subject ID**: `science-1`

**Chapters:**
- `science-1-c0`: Chemical Reactions and Equations
- `science-1-c1`: Acids, Bases and Salts
- `science-1-c2`: Metals and Non-Metals
- `science-1-c3`: Carbon and Its Compounds
- `science-1-c4`: Periodic Classification of Elements

#### Biology
- **Subject ID**: `science-2`

**Chapters:**
- `science-2-c0`: Life Processes
- `science-2-c1`: Control and Coordination
- `science-2-c2`: How Do Organisms Reproduce?
- `science-2-c3`: Heredity and Evolution
- `science-2-c4`: Our Environment
- `science-2-c5`: Sustainable Management of Natural Resources

### SST
- **Section ID**: `sst`

#### History
- **Subject ID**: `sst-0`

**Chapters:**
- `sst-0-c0`: The Rise of Nationalism in Europe
- `sst-0-c1`: Nationalism in India
- `sst-0-c2`: The Making of a Global World
- `sst-0-c3`: The Age of Industrialisation
- `sst-0-c4`: Print Culture and the Modern World

#### Geography
- **Subject ID**: `sst-1`

**Chapters:**
- `sst-1-c0`: Resources and Development
- `sst-1-c1`: Forest and Wildlife Resources
- `sst-1-c2`: Water Resources
- `sst-1-c3`: Agriculture
- `sst-1-c4`: Minerals and Energy Resources
- `sst-1-c5`: Manufacturing Industries
- `sst-1-c6`: Lifelines of National Economy

#### Political Science (Civics)
- **Subject ID**: `sst-2`

**Chapters:**
- `sst-2-c0`: Power Sharing
- `sst-2-c1`: Federalism
- `sst-2-c2`: Gender Religion and Caste
- `sst-2-c3`: Political Parties
- `sst-2-c4`: Outcomes of Democracy

#### Economics
- **Subject ID**: `sst-3`

**Chapters:**
- `sst-3-c0`: Development
- `sst-3-c1`: Sectors of the Indian Economy
- `sst-3-c2`: Money and Credit
- `sst-3-c3`: Globalisation and the Indian Economy
- `sst-3-c4`: Consumer Rights

### Maths
- **Section ID**: `maths`

#### Mathematics
- **Subject ID**: `maths-0`

**Chapters:**
- `maths-0-c0`: Real Numbers
- `maths-0-c1`: Polynomials
- `maths-0-c2`: Pair of Linear Equations in Two Variables
- `maths-0-c3`: Quadratic Equations
- `maths-0-c4`: Arithmetic Progressions
- `maths-0-c5`: Triangles
- `maths-0-c6`: Coordinate Geometry
- `maths-0-c7`: Introduction to Trigonometry
- `maths-0-c8`: Applications of Trigonometry
- `maths-0-c9`: Circles
- `maths-0-c10`: Areas Related to Circles
- `maths-0-c11`: Surface Areas and Volumes
- `maths-0-c12`: Statistics
- `maths-0-c13`: Probability

### English
- **Section ID**: `english`

#### Reading Skills
- **Subject ID**: `english-0`

**Chapters:**
- `english-0-c0`: Unseen Passage

#### Writing Skills
- **Subject ID**: `english-1`

**Chapters:**
- `english-1-c0`: Article Writing
- `english-1-c1`: Speech Writing
- `english-1-c2`: Debate Writing
- `english-1-c3`: Letter Writing
- `english-1-c4`: Story Writing

#### Grammar
- **Subject ID**: `english-2`

**Chapters:**
- `english-2-c0`: Tenses
- `english-2-c1`: Modals
- `english-2-c2`: Subject Verb Agreement
- `english-2-c3`: Determiners
- `english-2-c4`: Reported Speech
- `english-2-c5`: Active and Passive Voice
- `english-2-c6`: Editing and Omission

#### Literature
- **Subject ID**: `english-3`

**Chapters:**
- `english-3-c0`: Two Gentlemen of Verona
- `english-3-c1`: Mrs Packletides Tiger
- `english-3-c2`: The Letter
- `english-3-c3`: A Shady Plot
- `english-3-c4`: Patol Babu Film Star
- `english-3-c5`: Virtually True
- `english-3-c6`: The Frog and the Nightingale
- `english-3-c7`: Mirror
- `english-3-c8`: Not Marble Nor the Gilded Monuments
- `english-3-c9`: Ozymandias
- `english-3-c10`: The Rime of the Ancient Mariner
- `english-3-c11`: Snake
- `english-3-c12`: The Dear Departed
- `english-3-c13`: Julius Caesar

### IT
- **Section ID**: `it`

#### Employability Skills
- **Subject ID**: `it-0`

**Chapters:**
- `it-0-c0`: Communication Skills
- `it-0-c1`: Self Management Skills
- `it-0-c2`: ICT Skills
- `it-0-c3`: Entrepreneurial Skills
- `it-0-c4`: Green Skills

#### Vocational Skills
- **Subject ID**: `it-1`

**Chapters:**
- `it-1-c0`: Digital Documentation Advanced
- `it-1-c1`: Electronic Spreadsheet Advanced
- `it-1-c2`: Database Management System
- `it-1-c3`: Web Applications and Security

### Hindi
- **Section ID**: `hindi`

#### Sparsh
- **Subject ID**: `hindi-0`

**Chapters:**
- `hindi-0-c0`: बड़े भाई साहब
- `hindi-0-c1`: डायरी का एक पन्ना
- `hindi-0-c2`: तताँरा-वामीरो कथा
- `hindi-0-c3`: तीसरी कसम के शिल्पकार शैलेन्द्र
- `hindi-0-c4`: अब कहाँ दूसरे के दुख से दुखी होने वाले
- `hindi-0-c5`: पतझर में टूटी पत्तियाँ
- `hindi-0-c6`: कारतूस

#### Sparsh Poetry
- **Subject ID**: `hindi-1`

**Chapters:**
- `hindi-1-c0`: साखी
- `hindi-1-c1`: पद
- `hindi-1-c2`: मनुष्यता
- `hindi-1-c3`: पर्वत प्रदेश में पावस
- `hindi-1-c4`: तोप
- `hindi-1-c5`: कर चले हम फ़िदा
- `hindi-1-c6`: आत्मत्राण

#### Sanchayan
- **Subject ID**: `hindi-2`

**Chapters:**
- `hindi-2-c0`: हरिहर काका
- `hindi-2-c1`: सपनों के से दिन
- `hindi-2-c2`: टोपी शुक्ला

#### Grammar
- **Subject ID**: `hindi-3`

**Chapters:**
- `hindi-3-c0`: पद परिचय
- `hindi-3-c1`: रचना के आधार पर वाक्य भेद
- `hindi-3-c2`: वाच्य
- `hindi-3-c3`: अलंकार
- `hindi-3-c4`: समास
- `hindi-3-c5`: मुहावरे
- `hindi-3-c6`: अपठित गद्यांश
- `hindi-3-c7`: अपठित पद्यांश
- `hindi-3-c8`: पत्र लेखन
- `hindi-3-c9`: अनुच्छेद लेखन
- `hindi-3-c10`: सूचना लेखन
- `hindi-3-c11`: लघुकथा लेखन
- `hindi-3-c12`: विज्ञापन लेखन
- `hindi-3-c13`: ई-मेल लेखन


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
