const fs = require('fs');

const content = fs.readFileSync('Real DATA/Holiday homework/holiday homework.txt', 'utf8');

const rawLines = content.split('\n');
const blocks = [];
let currentBlock = [];

for (let i = 0; i < rawLines.length; i++) {
  const lowerLine = rawLines[i].toLowerCase();
  
  if (lowerLine.startsWith('message :-')) {
    let subjectLine = '';
    // Find the last non-empty line in currentBlock to be the subject
    while (currentBlock.length > 0 && currentBlock[currentBlock.length - 1].trim() === '') {
      currentBlock.pop();
    }
    if (currentBlock.length > 0) {
      subjectLine = currentBlock.pop();
    }
    
    // Push the previous block if it has content
    if (currentBlock.length > 0) {
      blocks.push(currentBlock);
    }
    
    // Start new block
    currentBlock = [subjectLine, rawLines[i]];
  } else {
    currentBlock.push(rawLines[i]);
  }
}
if (currentBlock.length > 0) {
  blocks.push(currentBlock);
}

const holidayData = [];

blocks.forEach((lines, index) => {
  if (lines.length >= 2) {
    const subjectLine = lines[0].trim();
    if (!subjectLine) return;
    
    let message = '';
    let filesList = [];
    let projectData = '';
    
    let isProjectData = false;
    let projectDataLines = [];
    
    // Process from the second line onwards
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();
      
      if (lowerLine.startsWith('message :-')) {
        message = line.substring(10).trim();
        isProjectData = false;
      }
      else if (lowerLine.startsWith('homework file :-')) {
         filesList.push(line.substring(16).trim());
         isProjectData = false;
      }
      else if (lowerLine.startsWith('project data :-')) {
         projectDataLines.push(line.substring(15).trim());
         isProjectData = true;
      }
      else if (isProjectData) {
         projectDataLines.push(line);
      }
    }
    
    projectData = projectDataLines.join('\n').trim();
    
    let processedFiles = [];
    filesList.forEach(fileUrl => {
      if (fileUrl) {
        const parts = fileUrl.split('/');
        const filename = parts[parts.length - 1].trim();
        if (filename) {
          processedFiles.push({
            name: filename,
            url: encodeURI('/holiday_homework/' + filename)
          });
        }
      }
    });
    
    if (subjectLine && message && (processedFiles.length > 0 || projectData)) {
      const entry = {
        id: index + 1,
        subject: subjectLine,
        message: message
      };
      
      if (processedFiles.length > 0) {
        entry.files = processedFiles;
        entry.file = processedFiles[0].name;
        entry.downloadUrl = processedFiles[0].url;
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
