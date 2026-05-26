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

  const lastMediaRef = useRef<{ id: number; type: string; s?: number; e?: number } | null>(null);
  const lastAppliedProgressRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const isTvShow = mediaType === 'tv' || (isAnime && mediaType !== 'movie');
    const mediaChanged = !lastMediaRef.current || 
                         lastMediaRef.current.id !== tmdbId || 
                         lastMediaRef.current.type !== mediaType || 
                         lastMediaRef.current.s !== initialSeason || 
                         lastMediaRef.current.e !== initialEpisode;

    const baseUrl = isTvShow 
      ? `https://player.videasy.net/tv/${tmdbId}/${initialSeason}/${initialEpisode}?nextEpisode=true&autoplayNextEpisode=true&episodeSelector=true&overlay=false&color=${color}&autoplay=true`
      : `https://player.videasy.net/movie/${tmdbId}?overlay=false&color=${color}&autoplay=true`;

    if (mediaChanged) {
        lastMediaRef.current = { id: tmdbId, type: mediaType, s: initialSeason, e: initialEpisode };
        lastAppliedProgressRef.current = forceProgress;
        
        let url = baseUrl;
        if (forceProgress && forceProgress > 0) {
            url += `&progress=${Math.floor(forceProgress)}`;
        }
        setEmbedUrl(url);
    } else {
        const hasNewProgress = forceProgress !== undefined && forceProgress !== lastAppliedProgressRef.current;
        if (hasNewProgress) {
            lastAppliedProgressRef.current = forceProgress;
            setEmbedUrl(`${baseUrl}&progress=${Math.floor(forceProgress!)}`);
        }
    }
  }, [tmdbId, mediaType, isAnime, initialSeason, initialEpisode, color, forceProgress]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
        try {
            let parsed: any = null;
            if (typeof event.data === 'string') {
                try {
                    parsed = JSON.parse(event.data);
                } catch (_) {
                    return;
                }
            } else if (event.data && typeof event.data === 'object') {
                parsed = event.data;
            }

            if (parsed) {
                let rawTime = parsed.timestamp ?? parsed.currentTime ?? parsed.current_time ?? parsed.time;
                let rawDuration = parsed.duration ?? parsed.totalTime ?? parsed.total_time;

                if (rawTime === undefined && parsed.data && typeof parsed.data === 'object') {
                    rawTime = parsed.data.timestamp ?? parsed.data.currentTime ?? parsed.data.current_time ?? parsed.data.time;
                    rawDuration = rawDuration ?? parsed.data.duration ?? parsed.data.totalTime ?? parsed.data.total_time;
                }

                if (rawTime === undefined && parsed.payload && typeof parsed.payload === 'object') {
                    rawTime = parsed.payload.timestamp ?? parsed.payload.currentTime ?? parsed.payload.current_time ?? parsed.payload.time;
                    rawDuration = rawDuration ?? parsed.payload.duration ?? parsed.payload.totalTime ?? parsed.payload.total_time;
                }

                if (rawTime !== undefined && rawTime !== null) {
                    const timeNum = Number(rawTime);
                    const durationNum = rawDuration !== undefined && rawDuration !== null ? Number(rawDuration) : 0;

                    if (!isNaN(timeNum) && onProgress) {
                        onProgress({
                            currentTime: timeNum,
                            duration: !isNaN(durationNum) ? durationNum : 0,
                            event: 'time',
                            season: parsed.season || parsed.data?.season || initialSeason,
                            episode: parsed.episode || parsed.data?.episode || initialEpisode
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
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
          />
        )}
      </div>
    </div>
  );
};
