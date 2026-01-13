
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
  tmdbId, onClose, mediaType, isAnime, initialSeason = 1, initialEpisode = 1, onProgress
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const getEmbedUrl = () => {
    // Use vidsrc embed URL. 
    // For TV shows and Anime series, we only use the ID as requested.
    // The internal player UI will handle episode navigation.
    if (mediaType === 'tv' || (isAnime && mediaType !== 'movie')) {
        return `https://vidsrc.cc/v2/embed/tv/${tmdbId}`;
    }
    // Movies
    return `https://vidsrc.cc/v2/embed/movie/${tmdbId}`;
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
        // Strict origin check for security
        if (event.origin !== 'https://vidsrc.cc') return;

        if (event.data && event.data.type === 'PLAYER_EVENT' && onProgress) {
            // Forward the player event data to the parent component
            onProgress(event.data.data);
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
       {/* Minimal Overlay for Close Button */}
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
            // Sandbox configured to block popups (ads) but allow scripts and same-origin for postMessage and playback
            sandbox="allow-forms allow-pointer-lock allow-same-origin allow-scripts allow-top-navigation allow-presentation"
        />
      </div>
    </div>
  );
};
