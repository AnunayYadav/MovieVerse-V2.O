/**
 * On-Device Manga Text Detection, OCR, Inpainting, and Typesetting Pipeline
 * High precision, zero-distortion manga bubble detection & clean typesetting.
 * 100% Client-side WASM execution.
 */

import { translateJapaneseText, cleanJapaneseText } from './offlineTranslationEngine';

export interface SpeechBubbleRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rawJapaneseText: string;
  translatedEnglishText: string;
  confidence: number;
  bgColor: string;
  textColor: string;
}

export interface PageTranslationResult {
  imageUrl: string;
  bubbles: SpeechBubbleRegion[];
  processedCanvasDataUrl: string;
}

declare global {
  interface Window {
    Tesseract?: any;
  }
}

/**
 * Dynamically load Tesseract.js WASM library for on-device client OCR
 */
export async function loadTesseractJS(): Promise<any> {
  if (window.Tesseract) return window.Tesseract;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    script.async = true;
    script.onload = () => {
      if (window.Tesseract) resolve(window.Tesseract);
      else reject(new Error('Tesseract script loaded but global object missing'));
    };
    script.onerror = () => reject(new Error('Failed to load Tesseract.js script'));
    document.head.appendChild(script);
  });
}

/**
 * High-precision Manga Text & Speech Bubble Bounding Box Detector
 */
export function detectSpeechBubbles(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): { x: number; y: number; width: number; height: number; bgColor: string }[] {
  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Grid step relative to canvas resolution
  const step = Math.max(8, Math.floor(Math.min(width, height) / 80));
  const gridW = Math.floor(width / step);
  const gridH = Math.floor(height / step);

  const lightPixels = new Uint8Array(gridW * gridH);
  const darkTextPixels = new Uint8Array(gridW * gridH);

  // 1. Analyze brightness & dark text stroke density
  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const px = gx * step;
      const py = gy * step;
      const idx = (py * width + px) * 4;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      const gridIdx = gy * gridW + gx;
      if (lum > 220) lightPixels[gridIdx] = 1;      // Speech bubble interior
      if (lum < 70) darkTextPixels[gridIdx] = 1;     // Dark text stroke candidate
    }
  }

  // 2. Locate clusters of dark text strokes surrounded by light background
  const textClusters: { minX: number; minY: number; maxX: number; maxY: number; darkCount: number }[] = [];
  const visited = new Uint8Array(gridW * gridH);

  for (let gy = 1; gy < gridH - 1; gy++) {
    for (let gx = 1; gx < gridW - 1; gx++) {
      const gidx = gy * gridW + gx;
      if (darkTextPixels[gidx] === 1 && !visited[gidx]) {
        // Flood fill text stroke cluster
        let minGx = gx, maxGx = gx, minGy = gy, maxGy = gy;
        let darkCount = 0;
        const queue: [number, number][] = [[gx, gy]];

        while (queue.length > 0 && queue.length < 500) {
          const [cx, cy] = queue.pop()!;
          const cidx = cy * gridW + cx;
          if (cx < 0 || cx >= gridW || cy < 0 || cy >= gridH || visited[cidx] || darkTextPixels[cidx] === 0) {
            continue;
          }
          visited[cidx] = 1;
          darkCount++;

          if (cx < minGx) minGx = cx;
          if (cx > maxGx) maxGx = cx;
          if (cy < minGy) minGy = cy;
          if (cy > maxGy) maxGy = cy;

          queue.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
        }

        const boxW = (maxGx - minGx + 1) * step;
        const boxH = (maxGy - minGy + 1) * step;
        const boxX = minGx * step;
        const boxY = minGy * step;

        // Verify size limits for valid speech bubble text (supports tall vertical manga bubbles)
        const isMinSize = boxW >= width * 0.015 && boxH >= height * 0.015;
        const isMaxSize = boxW <= width * 0.60 && boxH <= height * 0.70;

        if (isMinSize && isMaxSize && darkCount >= 2) {
          textClusters.push({
            minX: Math.max(0, boxX - 16),
            minY: Math.max(0, boxY - 16),
            maxX: Math.min(width, boxX + boxW + 16),
            maxY: Math.min(height, boxY + boxH + 16),
            darkCount
          });
        }
      }
    }
  }

  // Merge overlapping bounding boxes
  const merged = mergeBoxes(textClusters);

  return merged.map(b => ({
    x: b.minX,
    y: b.minY,
    width: b.maxX - b.minX,
    height: b.maxY - b.minY,
    bgColor: '#ffffff'
  }));
}

function mergeBoxes(boxes: { minX: number; minY: number; maxX: number; maxY: number }[]) {
  const result = [...boxes];
  let changed = true;

  while (changed) {
    changed = false;
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const a = result[i];
        const b = result[j];
        if (a.minX <= b.maxX + 15 && a.maxX >= b.minX - 15 && a.minY <= b.maxY + 15 && a.maxY >= b.minY - 15) {
          result[i] = {
            minX: Math.min(a.minX, b.minX),
            minY: Math.min(a.minY, b.minY),
            maxX: Math.max(a.maxX, b.maxX),
            maxY: Math.max(a.maxY, b.maxY),
          };
          result.splice(j, 1);
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
  }

  // Sort Right to Left, Top to Bottom (Japanese Manga Reading Order)
  return result.sort((a, b) => {
    const diffX = b.maxX - a.maxX;
    if (Math.abs(diffX) > 80) return diffX;
    return a.minY - b.minY;
  });
}

/**
 * Filter OCR output to ensure it contains genuine Japanese characters, not random noise
 */
function isGenuineJapanese(text: string): boolean {
  if (!text || text.length < 1) return false;
  // Check for Japanese Hiragana, Katakana, Kanji range
  const jaRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
  const matches = text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g);
  return jaRegex.test(text) && (matches ? matches.length >= 1 : false);
}

/**
 * Translate an entire Manga Page image canvas on-device
 */
export async function processMangaPageOffline(
  imageElement: HTMLImageElement | HTMLCanvasElement,
  onProgress?: (msg: string, percent: number) => void
): Promise<PageTranslationResult> {
  onProgress?.('Initializing On-Device OCR Engine...', 10);
  const Tesseract = await loadTesseractJS();

  const canvas = document.createElement('canvas');
  const imgW = imageElement.width || (imageElement as HTMLImageElement).naturalWidth || 800;
  const imgH = imageElement.height || (imageElement as HTMLImageElement).naturalHeight || 1200;
  canvas.width = imgW;
  canvas.height = imgH;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(imageElement, 0, 0, imgW, imgH);

  onProgress?.('Scanning Manga Speech Bubbles...', 25);
  const rawBubbles = detectSpeechBubbles(canvas, ctx);

  onProgress?.('Running Japanese Vertical OCR...', 40);
  let worker: any = null;
  try {
    worker = await Tesseract.createWorker('jpn_vert+jpn', 1, {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          onProgress?.(`Extracting Text (${Math.round((m.progress || 0) * 100)}%)...`, 40 + Math.round((m.progress || 0) * 35));
        }
      }
    });
  } catch (err) {
    console.warn('Falling back to standard Japanese OCR model', err);
    worker = await Tesseract.createWorker('jpn');
  }

  const translatedBubbles: SpeechBubbleRegion[] = [];

  for (let i = 0; i < rawBubbles.length; i++) {
    const b = rawBubbles[i];
    onProgress?.(`Translating Text Area ${i + 1}/${rawBubbles.length}...`, 75 + Math.round((i / Math.max(1, rawBubbles.length)) * 20));

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = b.width;
    cropCanvas.height = b.height;
    const cropCtx = cropCanvas.getContext('2d')!;
    cropCtx.drawImage(canvas, b.x, b.y, b.width, b.height, 0, 0, b.width, b.height);

    let rawOcrText = '';
    try {
      const ret = await worker.recognize(cropCanvas);
      rawOcrText = ret?.data?.text || '';
    } catch (ocrErr) {
      console.error('OCR Error on region:', ocrErr);
    }

    const cleanedText = cleanJapaneseText(rawOcrText);

    // Reject false positive noise
    if (isGenuineJapanese(cleanedText)) {
      const translation = await translateJapaneseText(cleanedText);

      // Only include if translation is valid, meaningful, and non-empty English
      if (translation.translatedText && translation.translatedText !== cleanedText) {
        translatedBubbles.push({
          id: `bubble_${i}_${Date.now()}`,
          x: b.x,
          y: b.y,
          width: b.width,
          height: b.height,
          rawJapaneseText: cleanedText,
          translatedEnglishText: translation.translatedText,
          confidence: translation.confidence,
          bgColor: '#ffffff',
          textColor: '#000000'
        });
      }
    }
  }

  if (worker) {
    await worker.terminate();
  }

  onProgress?.('Typesetting English Manga Text...', 98);
  const resultCanvas = renderTypesetMangaCanvas(canvas, translatedBubbles);
  onProgress?.('Complete!', 100);

  return {
    imageUrl: canvas.toDataURL(),
    bubbles: translatedBubbles,
    processedCanvasDataUrl: resultCanvas.toDataURL('image/png')
  };
}

/**
 * Erase Japanese text and render cleanly formatted English text in speech bubbles
 * Seamlessly blends into circular/oval manga speech bubbles with authentic lettering
 */
export function renderTypesetMangaCanvas(
  sourceCanvas: HTMLCanvasElement,
  bubbles: SpeechBubbleRegion[]
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;
  const ctx = canvas.getContext('2d')!;

  // Draw original manga page
  ctx.drawImage(sourceCanvas, 0, 0);

  for (const b of bubbles) {
    if (!b.translatedEnglishText) continue;

    ctx.save();

    // 1. Calculate speech bubble oval bounds
    const centerX = b.x + b.width / 2;
    const centerY = b.y + b.height / 2;
    const radiusX = Math.max(10, b.width / 2 + 2);
    const radiusY = Math.max(10, b.height / 2 + 2);

    // 2. Inpaint interior with pure bubble white fill (NO rectangular borders/stickers)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Render uppercase Manga Lettering
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Format text into uppercase for official manga lettering feel
    const formattedText = b.translatedEnglishText.toUpperCase();

    let fontSize = Math.max(11, Math.min(20, Math.floor(radiusY / 2.8)));
    ctx.font = `700 ${fontSize}px "Bangers", "Comic Sans MS", "Changa", sans-serif`;

    const words = formattedText.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    const maxLineWidth = radiusX * 1.65;

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxLineWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    const lineHeight = fontSize * 1.25;
    const totalHeight = lines.length * lineHeight;
    let startY = centerY - totalHeight / 2 + lineHeight / 2;

    for (const line of lines) {
      ctx.fillText(line, centerX, startY);
      startY += lineHeight;
    }

    ctx.restore();
  }

  return canvas;
}
