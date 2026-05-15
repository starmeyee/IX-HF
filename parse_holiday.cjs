const fs = require('fs');

const content = fs.readFileSync('Real DATA/Holiday homework/holiday homework.txt', 'utf8');

const blocks = content.split(/\n\s*\n/);
const holidayData = [];

blocks.forEach((block, index) => {
  const lines = block.trim().split('\n');
  if (lines.length >= 3) {
    const subjectLine = lines[0].trim();
    if (subjectLine.includes('Message :-') || subjectLine.includes('Homework File :-')) return;
    
    let message = '';
    let file = '';
    
    lines.forEach(line => {
      if (line.includes('Message :-')) {
        message = line.replace('Message :-', '').trim();
      }
      if (line.includes('Homework File :-')) {
         file = line.replace('Homework File :-', '').trim();
      }
    });
    
    // Extract actual filename from Real DATA/Holiday homework/...
    let filename = '';
    if (file) {
      const parts = file.split('/');
      filename = parts[parts.length - 1].trim();
    }
    
    if (subjectLine && message && filename) {
      holidayData.push({
        id: index + 1,
        subject: subjectLine,
        message: message,
        file: filename,
        downloadUrl: '/holiday_homework/' + filename
      });
    }
  }
});

const jsContent = `export const holidayData = ${JSON.stringify(holidayData, null, 2)};\n`;
fs.writeFileSync('src/data/holidayData.js', jsContent);
console.log('Saved to src/data/holidayData.js');
