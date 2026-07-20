/**
 * On-Device Manga Text Detection, OCR, Inpainting, and Typesetting Pipeline
 * Handles vertical Japanese text reading order (Right to Left, Top to Bottom).
 * 100% Client-side WASM execution.
 */

import { translateJapaneseOffline, cleanJapaneseText } from './offlineTranslationEngine';

export interface SpeechBubbleRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rawJapaneseText: string;
  translatedEnglishText: string;
  confidence: number;
  bgColor: string; // e.g. '#ffffff'
  textColor: string; // e.g. '#000000'
  isVertical: boolean;
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
 * Detect high-contrast speech bubble candidate regions in a Manga Image Canvas
 */
export function detectSpeechBubbles(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): { x: number; y: number; width: number; height: number; bgColor: string }[] {
  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const binarized = new Uint8Array(width * height);
  
  // 1. Threshold canvas to find light/white speech bubble pixels
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    const idx = i / 4;
    binarized[idx] = luminance > 210 ? 1 : 0; // White/bright speech bubble regions
  }

  // 2. Grid-based connected component sampling for bounding boxes
  const gridStep = Math.max(16, Math.floor(Math.min(width, height) / 35));
  const visited = new Uint8Array(width * height);
  const rawBoxes: { minX: number; minY: number; maxX: number; maxY: number }[] = [];

  for (let y = gridStep; y < height - gridStep; y += gridStep) {
    for (let x = gridStep; x < width - gridStep; x += gridStep) {
      const idx = y * width + x;
      if (binarized[idx] === 1 && !visited[idx]) {
        // Flood fill cluster
        let minX = x, maxX = x, minY = y, maxY = y;
        let count = 0;
        const stack: [number, number][] = [[x, y]];

        while (stack.length > 0 && count < 2000) {
          const [cx, cy] = stack.pop()!;
          const cidx = cy * width + cx;
          if (cx < 0 || cx >= width || cy < 0 || cy >= height || visited[cidx] || binarized[cidx] === 0) {
            continue;
          }
          visited[cidx] = 1;
          count++;
          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;

          // Push neighbors
          stack.push([cx + gridStep, cy], [cx - gridStep, cy], [cx, cy + gridStep], [cx, cy - gridStep]);
        }

        const bw = maxX - minX;
        const bh = maxY - minY;
        const area = bw * bh;

        // Filter valid speech bubble size candidates
        if (bw >= width * 0.08 && bh >= height * 0.04 && area >= (width * height) * 0.005 && area <= (width * height) * 0.4) {
          rawBoxes.push({ minX, minY, maxX, maxY });
        }
      }
    }
  }

  // Merge overlapping bounding boxes
  const merged = mergeBoxes(rawBoxes);

  // Convert to regions with sampled background colors
  return merged.map((b) => {
    const bx = Math.max(0, b.minX);
    const by = Math.max(0, b.minY);
    const bw = Math.min(width - bx, b.maxX - b.minX);
    const bh = Math.min(height - by, b.maxY - b.minY);
    const bgColor = sampleBackgroundColor(ctx, bx, by, bw, bh);
    return { x: bx, y: by, width: bw, height: bh, bgColor };
  });
}

/**
 * Merge overlapping candidate bounding boxes
 */
function mergeBoxes(boxes: { minX: number; minY: number; maxX: number; maxY: number }[]) {
  const result = [...boxes];
  let changed = true;

  while (changed) {
    changed = false;
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const a = result[i];
        const b = result[j];
        // Check overlap
        if (a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY) {
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
    const diffX = b.maxX - a.maxX; // Right-to-left columns priority
    if (Math.abs(diffX) > 60) return diffX;
    return a.minY - b.minY; // Top-to-bottom priority
  });
}

/**
 * Sample dominant background color inside a speech bubble
 */
function sampleBackgroundColor(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): string {
  try {
    const sampleW = Math.max(1, Math.floor(w * 0.4));
    const sampleH = Math.max(1, Math.floor(h * 0.4));
    const sampleX = Math.floor(x + w * 0.3);
    const sampleY = Math.floor(y + h * 0.3);
    const data = ctx.getImageData(sampleX, sampleY, sampleW, sampleH).data;

    let totalR = 0, totalG = 0, totalB = 0, count = 0;
    for (let i = 0; i < data.length; i += 16) {
      totalR += data[i];
      totalG += data[i + 1];
      totalB += data[i + 2];
      count++;
    }
    if (count === 0) return '#ffffff';
    const r = Math.round(totalR / count);
    const g = Math.round(totalG / count);
    const b = Math.round(totalB / count);
    return `rgb(${r}, ${g}, ${b})`;
  } catch {
    return '#ffffff';
  }
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

  // 1. Render image to hidden processing canvas
  const canvas = document.createElement('canvas');
  canvas.width = imageElement.width || (imageElement as HTMLImageElement).naturalWidth || 800;
  canvas.height = imageElement.height || (imageElement as HTMLImageElement).naturalHeight || 1200;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);

  // 2. Detect Speech Bubbles & Vertical Text Regions
  onProgress?.('Detecting Japanese Speech Bubbles...', 25);
  const rawBubbles = detectSpeechBubbles(canvas, ctx);

  // Create Tesseract Worker for Japanese Vertical Text OCR
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

  // 3. Process each speech bubble box
  for (let i = 0; i < rawBubbles.length; i++) {
    const b = rawBubbles[i];
    onProgress?.(`Translating Speech Bubble ${i + 1}/${rawBubbles.length}...`, 75 + Math.round((i / rawBubbles.length) * 20));

    // Crop box canvas for OCR
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
      console.error('OCR Error on bubble region:', ocrErr);
    }

    const cleanedText = cleanJapaneseText(rawOcrText);

    if (cleanedText.length > 0) {
      // Offline translation lookup
      const translation = translateJapaneseOffline(cleanedText);

      translatedBubbles.push({
        id: `bubble_${i}_${Date.now()}`,
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        rawJapaneseText: cleanedText,
        translatedEnglishText: translation.translatedText || cleanedText,
        confidence: translation.confidence,
        bgColor: b.bgColor,
        textColor: '#000000',
        isVertical: true
      });
    }
  }

  // Terminate OCR Worker to free memory
  if (worker) {
    await worker.terminate();
  }

  // 4. Inpaint and Render Clean Typeset Canvas Overlay
  onProgress?.('Inpainting & Typesetting English Manga Text...', 98);
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

    // 1. Inpaint speech bubble interior with solid/sampled background color
    ctx.save();
    ctx.fillStyle = b.bgColor || '#ffffff';

    // Draw smooth ellipse or rounded rectangle over text box
    const padding = 4;
    const rx = Math.max(0, b.x - padding);
    const ry = Math.max(0, b.y - padding);
    const rw = b.width + padding * 2;
    const rh = b.height + padding * 2;

    ctx.beginPath();
    ctx.ellipse(rx + rw / 2, ry + rh / 2, rw / 2, rh / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Typeset English Text cleanly inside bubble
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Auto-calculate font size based on bounding box area
    let fontSize = Math.max(11, Math.min(22, Math.floor(b.height / 5)));
    ctx.font = `bold ${fontSize}px "Comic Sans MS", "Bangers", "Changa", sans-serif`;

    const text = b.translatedEnglishText;
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    const maxLineWidth = b.width * 0.82;

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

    // Render lines vertically centered inside bubble
    const lineHeight = fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    let startY = (b.y + b.height / 2) - (totalHeight / 2) + (lineHeight / 2);

    for (const line of lines) {
      ctx.fillText(line, b.x + b.width / 2, startY);
      startY += lineHeight;
    }

    ctx.restore();
  }

  return canvas;
}
