import fs from 'fs';

const content = fs.readFileSync('c:/Users/ASUS/OneDrive/Desktop/Anunayy/AntiGravity/MovieVerse-V2.O/components/MangaPage.tsx', 'utf8');
const lines = content.split('\n');

console.log("=== GigaViewer reader pages occurrences ===");
lines.forEach((line, idx) => {
  if (line.includes('gigaviewer') && (line.includes('pages') || line.includes('fetch') || line.includes('readingSource'))) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
