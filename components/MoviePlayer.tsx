import React, { useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface MoviePlayerProps {
  tmdbId: number;
  imdbId?: string;
  onClose: () => void;
  mediaType: string;
  isAnime: boolean;
  initialSeason?: number;
  initialEpisode?: number;
  apiKey: string;
  onProgress?: (data: any) => void;
  color?: string;
  forceProgress?: number;
}

export const MoviePlayer: React.FC<MoviePlayerProps> = ({ 
  tmdbId, onClose, mediaType, isAnime, initialSeason = 1, initialEpisode = 1, onProgress, color = 'EF4444', forceProgress
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [embedUrl, setEmbedUrl] = React.useState('');

  useEffect(() => {
    const isTvShow = mediaType === 'tv' || (isAnime && mediaType !== 'movie');
    let url = isTvShow 
      ? `https://player.videasy.net/tv/${tmdbId}/${initialSeason}/${initialEpisode}?nextEpisode=true&autoplayNextEpisode=true&episodeSelector=true&overlay=true&color=${color}`
      : `https://player.videasy.net/movie/${tmdbId}?overlay=true&color=${color}`;
    
    if (forceProgress && forceProgress > 0) {
        url += `&progress=${Math.floor(forceProgress)}`;
    }
    setEmbedUrl(url);
  }, [tmdbId, mediaType, isAnime, initialSeason, initialEpisode, color, forceProgress]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
        try {
            if (typeof event.data === 'string') {
                const parsed = JSON.parse(event.data);
                if (parsed && typeof parsed.timestamp === 'number' && typeof parsed.duration === 'number') {
                    if (onProgress) {
                        onProgress({
                            currentTime: parsed.timestamp,
                            duration: parsed.duration,
                            event: 'time',
                            season: parsed.season || initialSeason,
                            episode: parsed.episode || initialEpisode
                        });
                    }
                }
            }
        } catch (e) {
            // Ignore parse errors or cross-origin access errors
        }
    };

    window.addEventListener('message', handleMessage);
    return () => {
        window.removeEventListener('message', handleMessage);
    };
  }, [onProgress, initialSeason, initialEpisode]);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full flex flex-col bg-black relative group/player select-none overflow-hidden"
    >
       {/* Close Button Overlay */}
       <div className="absolute top-0 right-0 z-[100] p-6 opacity-0 group-hover/player:opacity-100 transition-opacity duration-300 pointer-events-none">
          <button 
            onClick={onClose}
            className="pointer-events-auto bg-black/40 hover:bg-red-600 text-white p-2 rounded-lg transition-all shadow-lg active:scale-95 h-10 w-10 flex items-center justify-center border border-white/10"
            title="Close Player"
          >
            <X size={20}/>
          </button>
       </div>

      <div className="flex-1 relative w-full h-full z-0 overflow-hidden bg-black">
        {embedUrl && (
          <iframe 
              src={embedUrl}
              className="w-full h-full absolute inset-0 bg-black"
              title="Media Player"
              frameBorder="0"
              allow="autoplay; fullscreen *; picture-in-picture"
              allowFullScreen
          />
        )}
      </div>
    </div>
  );
};
