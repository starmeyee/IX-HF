const fs = require('fs');

const content = fs.readFileSync('Real DATA/homework Record.md', 'utf8');
const lines = content.split('\n').map(l => l.trim());

const days = [];
let currentDay = null;
let currentSubject = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line || line === '---') continue;
  
  if (line.startsWith('_Date:')) {
    currentDay = {
      id: days.length + 1,
      date: line.replace('_Date:', '').replace(/_/g, '').trim(),
      tasks: []
    };
    days.push(currentDay);
    currentSubject = null;
    continue;
  }
  
  if (!currentDay) continue;
  
  if (line.startsWith('*') && line.endsWith('*')) {
     currentSubject = { subject: line.replace(/\*/g, '').trim(), description: '', type: 'homework' };
     currentDay.tasks.push(currentSubject);
     continue;
  }
  
  if (line.startsWith('>')) {
     let desc = line.replace('>', '').trim();
     if (currentSubject.description) {
        currentSubject.description += '\n' + desc;
     } else {
        currentSubject.description = desc;
     }
  }
}

const jsContent = `export const homeworkData = ${JSON.stringify(days, null, 2)};\n`;
fs.writeFileSync('src/data/homeworkData.js', jsContent);
console.log('Successfully saved cleaned homeworkData.js');
