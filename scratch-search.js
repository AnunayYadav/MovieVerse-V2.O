import fs from 'fs';

const content = fs.readFileSync('c:/Users/ASUS/OneDrive/Desktop/Anunayy/AntiGravity/MovieVerse-V2.O/api/manga-novels.ts', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('fetch(') || line.includes('fetch ') || line.includes('const fetch') || line.includes('import fetch')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
