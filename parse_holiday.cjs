const fs = require('fs');

const content = fs.readFileSync('Real DATA/Holiday homework/holiday homework.txt', 'utf8');

const blocks = content.split(/\n\s*\n/);
const holidayData = [];

blocks.forEach((block, index) => {
  const lines = block.trim().split('\n');
  if (lines.length >= 3) {
    const subjectLine = lines[0].trim();
    if (subjectLine.toLowerCase().includes('message :-') || subjectLine.toLowerCase().includes('homework file :-')) return;
    
    let message = '';
    let file = '';
    let projectData = '';
    
    let isProjectData = false;
    let projectDataLines = [];
    
    lines.forEach(line => {
      const lowerLine = line.toLowerCase();
      
      if (lowerLine.startsWith('message :-')) {
        message = line.substring(10).trim();
        isProjectData = false;
      }
      else if (lowerLine.startsWith('homework file :-')) {
         file = line.substring(16).trim();
         isProjectData = false;
      }
      else if (lowerLine.startsWith('project data :-')) {
         projectDataLines.push(line.substring(15).trim());
         isProjectData = true;
      }
      else if (isProjectData) {
         projectDataLines.push(line);
      }
    });
    
    projectData = projectDataLines.join('\n').trim();
    
    // Extract actual filename from Real DATA/Holiday homework/...
    let filename = '';
    if (file) {
      const parts = file.split('/');
      filename = parts[parts.length - 1].trim();
    }
    
    if (subjectLine && message && (filename || projectData)) {
      const entry = {
        id: index + 1,
        subject: subjectLine,
        message: message
      };
      
      if (filename) {
        entry.file = filename;
        entry.downloadUrl = encodeURI('/holiday_homework/' + filename);
      }
      
      if (projectData) {
        entry.projectData = projectData;
      }
      
      holidayData.push(entry);
    }
  }
});

const jsContent = `export const holidayData = ${JSON.stringify(holidayData, null, 2)};\n`;
fs.writeFileSync('src/data/holidayData.js', jsContent);
console.log('Saved to src/data/holidayData.js');
