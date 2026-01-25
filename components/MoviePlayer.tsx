
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
}

export const MoviePlayer: React.FC<MoviePlayerProps> = ({ 
  tmdbId, onClose, mediaType, isAnime, onProgress
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const getEmbedUrl = () => {
    // vidsrc.cc structure
    // Per user request: for TV series and Anime, use the base TV path without season/episode parameters
    if (mediaType === 'tv' || (isAnime && mediaType !== 'movie')) {
        return `https://vidsrc.cc/v2/embed/tv/${tmdbId}`;
    }
    return `https://vidsrc.cc/v2/embed/movie/${tmdbId}`;
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
        try {
            const msg = event.data;
            if (msg && msg.type === 'PLAYER_EVENT' && msg.data) {
                if (onProgress) onProgress(msg.data);
            }
        } catch (e) {
            // Ignore cross-origin access errors
        }
    };

    window.addEventListener('message', handleMessage);
    return () => {
        window.removeEventListener('message', handleMessage);
    };
  }, [onProgress]);

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
        <iframe 
            src={getEmbedUrl()}
            className="w-full h-full absolute inset-0 bg-black"
            title="Media Player"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            sandbox="allow-forms allow-pointer-lock allow-same-origin allow-scripts allow-top-navigation allow-presentation"
        />
      </div>
    </div>
  );
};
