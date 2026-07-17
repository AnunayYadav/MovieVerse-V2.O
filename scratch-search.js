import fs from 'fs';

const content = fs.readFileSync('c:/Users/ASUS/OneDrive/Desktop/Anunayy/AntiGravity/MovieVerse-V2.O/components/MangaPage.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('comic-walker.com')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
