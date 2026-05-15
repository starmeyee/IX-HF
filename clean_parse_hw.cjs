const fs = require('fs');

const content = fs.readFileSync('Real DATA/homework Record.md', 'utf8');
const lines = content.split('\n').map(l => l.trim());

const days = [];
let currentDay = null;
let currentSubject = null;

// robust date check
const isDateLine = (line) => {
  return (line.includes('_Date:') || line.includes('_📅') || line.match(/_[A-Za-z]+,?\s*\d+\s*[A-Za-z]+\s*\d{4}_/)) || line.match(/_\d{1,2}\s*[A-Za-z]+\s*\d{4}_/) || line.match(/_Date:\s*\d{1,2}\s*[A-Za-z]+\s*\d{4}_/);
};

// extract date
const extractDate = (line) => {
  let text = line.replace(/_/g, '').trim();
  text = text.replace('Date:', '').replace('📅', '').trim();
  return text;
};

const isDecoration = (line) => {
  if (line.includes('━') || line.includes('═') || line.includes('─')) return true;
  if (line.includes('⠂⠄') || line.includes('⋆⋅☆⋅⋆')) return true;
  if (line.includes('T O D A Y') || line.includes("TODAY'S")) return true;
  if (line.includes('IMPORTANT NOTICE')) return true;
  if (line.match(/^```/)) return true;
  if (line.startsWith('•')) return true;
  if (line.includes('For students who have not done these yet:')) return true;
  if (line.includes('Homework 📚✨')) return true;
  if (line.includes('Note for Students')) return true;
  if (line.includes('Dear students, please bring')) return true;
  if (line.includes('Please make sure to bring your diary page')) return true;
  return false;
};

// Check if line is a subject header
const getSubjectFromLine = (line) => {
  // Pattern 1: *📙 HINDI / हिन्दी*
  if (line.startsWith('*') && line.endsWith('*')) {
     return line.replace(/\*/g, '').trim();
  }
  // Pattern 2: 📙 *HINDI / हिन्दी*
  const p2 = line.match(/^[\u2700-\u27BF\uE000-\uF8FF\uD83C-\uDFFF\u2011-\u26FF\uD83E\uDD10-\uDDFF\s]*\*(.+)\*$/);
  if (p2) return p2[1].trim();

  // Pattern 3: - *Hindi* 📖: Complete ...
  const p3 = line.match(/^-\s*\**([^*]+)\**\s*[\u2700-\u27BF\uE000-\uF8FF\uD83C-\uDFFF\u2011-\u26FF\uD83E\uDD10-\uDDFF\s]*:\s*(.*)/);
  if (p3) return { subject: p3[1].trim(), desc: p3[2].trim() };

  // Pattern 4: 💻 *IT:* Teacher Absent
  const p4 = line.match(/^[\u2700-\u27BF\uE000-\uF8FF\uD83C-\uDFFF\u2011-\u26FF\uD83E\uDD10-\uDDFF\s]*\*(.+)\*:\s*(.*)/);
  if (p4) return { subject: p4[1].trim(), desc: p4[2].trim() };
  
  return null;
};

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line || isDecoration(line)) continue;
  
  if (isDateLine(line)) {
    currentDay = {
      id: days.length + 1,
      date: extractDate(line),
      tasks: []
    };
    days.push(currentDay);
    currentSubject = null;
    continue;
  }
  
  if (!currentDay) continue;
  
  const subjInfo = getSubjectFromLine(line);
  if (subjInfo) {
    if (typeof subjInfo === 'string') {
       currentSubject = { subject: subjInfo, description: '' };
       currentDay.tasks.push(currentSubject);
    } else {
       currentSubject = { subject: subjInfo.subject, description: subjInfo.desc };
       currentDay.tasks.push(currentSubject);
    }
    continue;
  }
  
  // It's a description
  let desc = line.replace(/^[>↳👉\-]\s*/, '').trim();
  if (desc && currentSubject) {
     if (currentSubject.description) {
        currentSubject.description += '\n' + desc;
     } else {
        currentSubject.description = desc;
     }
  } else if (desc && !currentSubject) {
     currentSubject = { subject: 'General', description: desc };
     currentDay.tasks.push(currentSubject);
  }
}

// remove emoji characters from subjects to make it cleaner
days.forEach(day => {
   day.tasks.forEach(t => {
      t.subject = t.subject.replace(/[\u2700-\u27BF\uE000-\uF8FF\uD83C-\uDFFF\u2011-\u26FF\uD83E\uDD10-\uDDFF]/g, '').trim();
      t.type = 'homework';
   });
});

const jsContent = `export const homeworkData = ${JSON.stringify(days, null, 2)};\n`;
fs.writeFileSync('src/data/homeworkData.js', jsContent);
console.log('Saved perfect data');
