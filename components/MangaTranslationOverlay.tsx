import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

interface TranslationBox {
  box: [number, number, number, number]; // [ymin, xmin, ymax, xmax] normalized to 1000
  originalText: string;
  translatedText: string;
}

interface TranslationData {
  boxes: TranslationBox[];
}

interface MangaTranslationOverlayProps {
  translationData: TranslationData | null;
  isLoading: boolean;
  error: string | null;
  isActive: boolean;
  showOriginalOnHover?: boolean;
}

export const MangaTranslationOverlay: React.FC<MangaTranslationOverlayProps> = ({
  translationData,
  isLoading,
  error,
  isActive,
  showOriginalOnHover = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(600);

  // ResizeObserver to track container width for perfect responsive typesetting
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(containerRef.current);
    // Initial size
    setContainerWidth(containerRef.current.getBoundingClientRect().width);

    return () => observer.disconnect();
  }, []);

  if (!isActive) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-30 select-none overflow-hidden"
    >
      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 pointer-events-auto">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 flex items-center gap-2.5 shadow-2xl">
            <Loader2 className="animate-spin text-red-500" size={16} />
            <span className="text-[11px] font-bold text-zinc-300 tracking-wider">Translating speech...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute top-4 left-4 right-4 bg-red-950/90 border border-red-500/20 text-red-200 px-3 py-2 rounded-xl text-[10px] font-semibold flex items-center gap-2 pointer-events-auto shadow-lg animate-fade-in">
          <AlertCircle size={14} className="text-red-400 shrink-0" />
          <span className="flex-1">Translation Failed: {error}</span>
        </div>
      )}

      {/* Render text bubbles */}
      {!isLoading && !error && translationData?.boxes && (
        <>
          <style dangerouslySetInnerHTML={{
            __html: `
              .manga-bubble-overlay {
                transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
              }
              ${showOriginalOnHover ? `
                .manga-bubble-overlay:hover {
                  opacity: 0 !important;
                }
              ` : ''}
            `
          }} />
          {translationData.boxes.map((item, idx) => {
            const [ymin, xmin, ymax, xmax] = item.box;

            // Calculate height and width of the detected text bounding box
            const boxHeight = ymax - ymin;
            const boxWidth = xmax - xmin;

            // Expand the box to cover speech bubble margins and prevent text peeking
            // Vertically and horizontally padding by 12% of the box dimension
            const yPadding = boxHeight * 0.12;
            const xPadding = boxWidth * 0.12;

            const yminVal = Math.max(0, ymin - yPadding);
            const ymaxVal = Math.min(1000, ymax + yPadding);
            const xminVal = Math.max(0, xmin - xPadding);
            const xmaxVal = Math.min(1000, xmax + xPadding);

            // Convert expanded coordinates (0-1000) to percentages
            const top = yminVal / 10;
            const left = xminVal / 10;
            const height = (ymaxVal - yminVal) / 10;
            const width = (xmaxVal - xminVal) / 10;

            // Calculate dynamic font size based on bubble width in pixels
            const bubbleWidthPx = (containerWidth * width) / 100;
            const bubbleHeightPx = (containerWidth * height) / 100;
            
            // Scaled font size based on dimensions (aiming for standard readable sizes)
            const fontSize = Math.max(
              8,
              Math.min(
                20,
                Math.round(Math.min(bubbleWidthPx * 0.13, bubbleHeightPx * 0.23))
              )
            );

            return (
              <div
                key={idx}
                className="manga-bubble-overlay absolute pointer-events-auto cursor-help flex items-center justify-center text-center leading-tight overflow-hidden"
                style={{
                  top: `${top}%`,
                  left: `${left}%`,
                  width: `${width}%`,
                  height: `${height}%`,
                  // Dynamic white masking to hide original Japanese text
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  borderRadius: '24px',
                  padding: '8% 10%',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                  opacity: 0.98,
                }}
                title={`Original: ${item.originalText}`}
              >
                <div
                  style={{
                    fontFamily: '"Outfit", "Segoe UI", Roboto, sans-serif',
                    fontWeight: 700,
                    fontSize: `${fontSize}px`,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    wordBreak: 'break-word',
                  }}
                >
                  {item.translatedText}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};
