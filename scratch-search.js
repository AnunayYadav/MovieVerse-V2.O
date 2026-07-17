import fs from 'fs';

const filepath = 'c:/Users/ASUS/OneDrive/Desktop/Anunayy/AntiGravity/MovieVerse-V2.O/components/MangaPage.tsx';
let content = fs.readFileSync(filepath, 'utf8');

// 1. Left Page Replacement
const leftTarget = `                          {activePageIdx + 1 < pages.length ? (
                            <img
                              src={pages[activePageIdx + 1]}
                              alt={\`Page \${activePageIdx + 2}\`}
                              referrerPolicy="no-referrer"
                              className="manga-page-img"
                              onError={(e) => {
                                if (readingSource !== 'mangadex') return;
                                const target = e.currentTarget;
                                if (!target.src.includes('uploads.mangadex.org')) {
                                  try {
                                    const parsedUrl = new URL(target.src);
                                    target.src = \`https://uploads.mangadex.org\${parsedUrl.pathname}\`;
                                  } catch (err) {
                                    console.error('Failed to resolve fallback URL:', err);
                                  }
                                }
                              }}
                            />`;

const leftReplacement = `                          {activePageIdx + 1 < pages.length ? (
                            readingSource === 'gigaviewer' ? (
                              <GigaViewerPage page={pages[activePageIdx + 1]} pageNum={activePageIdx + 2} className="manga-page-img" />
                            ) : (
                              <img
                                src={pages[activePageIdx + 1]}
                                alt={\`Page \${activePageIdx + 2}\`}
                                referrerPolicy="no-referrer"
                                className="manga-page-img"
                                onError={(e) => {
                                  if (readingSource !== 'mangadex') return;
                                  const target = e.currentTarget;
                                  if (!target.src.includes('uploads.mangadex.org')) {
                                    try {
                                      const parsedUrl = new URL(target.src);
                                      target.src = \`https://uploads.mangadex.org\${parsedUrl.pathname}\`;
                                    } catch (err) {
                                      console.error('Failed to resolve fallback URL:', err);
                                    }
                                  }
                                }}
                              />
                            )`;

// 2. Right Page Replacement
const rightTarget = `                        <img
                          src={pages[activePageIdx]}
                          alt={\`Page \${activePageIdx + 1}\`}
                          referrerPolicy="no-referrer"
                          className="manga-page-img"
                          onError={(e) => {
                            if (readingSource !== 'mangadex') return;
                            const target = e.currentTarget;
                            if (!target.src.includes('uploads.mangadex.org')) {
                              try {
                                const parsedUrl = new URL(target.src);
                                target.src = \`https://uploads.mangadex.org\${parsedUrl.pathname}\`;
                              } catch (err) {
                                console.error('Failed to resolve fallback URL:', err);
                              }
                            }
                          }}
                        />`;

const rightReplacement = `                        {readingSource === 'gigaviewer' ? (
                          <GigaViewerPage page={pages[activePageIdx]} pageNum={activePageIdx + 1} className="manga-page-img" />
                        ) : (
                          <img
                            src={pages[activePageIdx]}
                            alt={\`Page \${activePageIdx + 1}\`}
                            referrerPolicy="no-referrer"
                            className="manga-page-img"
                            onError={(e) => {
                              if (readingSource !== 'mangadex') return;
                              const target = e.currentTarget;
                              if (!target.src.includes('uploads.mangadex.org')) {
                                try {
                                  const parsedUrl = new URL(target.src);
                                  target.src = \`https://uploads.mangadex.org\${parsedUrl.pathname}\`;
                                } catch (err) {
                                  console.error('Failed to resolve fallback URL:', err);
                                }
                              }
                            }}
                          />
                        )}`;

// Standardize line endings to LF before replacing to avoid CR mismatch issues
const originalLF = content.replace(/\r\n/g, '\n');
const leftTargetLF = leftTarget.replace(/\r\n/g, '\n');
const leftReplacementLF = leftReplacement.replace(/\r\n/g, '\n');
const rightTargetLF = rightTarget.replace(/\r\n/g, '\n');
const rightReplacementLF = rightReplacement.replace(/\r\n/g, '\n');

if (!originalLF.includes(leftTargetLF)) {
  console.log("Error: Left page target not found in MangaPage.tsx");
} else {
  console.log("Found Left Page target!");
}

if (!originalLF.includes(rightTargetLF)) {
  console.log("Error: Right page target not found in MangaPage.tsx");
} else {
  console.log("Found Right Page target!");
}

const modifiedLF = originalLF.replace(leftTargetLF, leftReplacementLF).replace(rightTargetLF, rightReplacementLF);
fs.writeFileSync(filepath, modifiedLF, 'utf8');
console.log("Successfully wrote modifications to MangaPage.tsx!");
