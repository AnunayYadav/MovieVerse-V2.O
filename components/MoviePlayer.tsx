import React, { useState, useEffect } from 'react';
import { Film, Tv, Ghost, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface MoviePlayerProps {
  tmdbId: number;
  imdbId?: string;
  onClose: () => void;
  mediaType: string;
  isAnime: boolean;
  initialSeason?: number;
  initialEpisode?: number;
}

export const MoviePlayer: React.FC<MoviePlayerProps> = ({ 
  tmdbId, onClose, mediaType, isAnime, initialSeason = 1, initialEpisode = 1 
}) => {
  const [isTv, setIsTv] = useState(mediaType === 'tv' || isAnime);
  const [season, setSeason] = useState(initialSeason);
  const [episode, setEpisode] = useState(initialEpisode);
  const [animeType, setAnimeType] = useState<'sub' | 'dub'>('sub');
  const [isMenuExpanded, setIsMenuExpanded] = useState(true);

  useEffect(() => {
    setSeason(initialSeason);
    setEpisode(initialEpisode);
  }, [initialSeason, initialEpisode]);

  const getEmbedUrl = () => {
    // Vidsrc.cc is a popular embed source for demos
    if (isAnime) {
        return `https://vidsrc.cc/v2/embed/anime/tmdb${tmdbId}/${episode}/${animeType}?autoPlay=1&autoSkipIntro=1`;
    }
    if (isTv) {
        return `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season}/${episode}?autoPlay=1&color=dc2626`;
    }
    return `https://vidsrc.cc/v2/embed/movie/${tmdbId}?autoPlay=1&color=dc2626`;
  };

  return (
    <div className="w-full h-full flex flex-col bg-black relative">
       <div className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-start pointer-events-none">
          <div className="pointer-events-auto flex flex-col gap-2">
            <div className="flex items-center gap-2">
                {isMenuExpanded ? (
                    <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-lg animate-in fade-in slide-in-from-left-2 duration-300">
                        {!isAnime && (
                          <>
                            <button 
                                onClick={() => setIsTv(false)} 
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${!isTv ? 'bg-red-600 text-white shadow-md shadow-red-900/50' : 'hover:bg-white/10 text-gray-300'}`}
                            >
                                <Film size={14}/> Movie
                            </button>
                            <button 
                                onClick={() => setIsTv(true)} 
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${isTv ? 'bg-red-600 text-white shadow-md shadow-red-900/50' : 'hover:bg-white/10 text-gray-300'}`}
                            >
                                <Tv size={14}/> TV Show
                            </button>
                          </>
                        )}
                        {isAnime && (
                            <div className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 text-white shadow-md shadow-purple-900/50 flex items-center gap-2">
                                <Ghost size={14}/> Anime Mode
                            </div>
                        )}
                        <div className="w-px h-4 bg-white/10 mx-1"></div>
                        <button 
                            onClick={() => setIsMenuExpanded(false)}
                            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                            title="Collapse Menu"
                        >
                            <ChevronLeft size={14}/>
                        </button>
                    </div>
                ) : (
                    <button 
                        onClick={() => setIsMenuExpanded(true)}
                        className="bg-black/60 backdrop-blur-md p-2.5 rounded-xl border border-white/10 shadow-lg text-gray-300 hover:text-white hover:bg-white/10 transition-all animate-in fade-in zoom-in duration-300"
                        title="Expand Menu"
                    >
                        <ChevronRight size={16}/>
                    </button>
                )}
            </div>

            {isMenuExpanded && (isTv || isAnime) && (
                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md p-2 rounded-xl border border-white/10 shadow-lg animate-in slide-in-from-left-2">
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-400 uppercase font-bold px-1">S</span>
                        <input 
                          type="number" 
                          min="1" 
                          value={season}
                          onChange={(e) => setSeason(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-12 bg-white/10 border border-white/20 rounded-md text-center text-white text-sm py-1 focus:outline-none focus:border-red-500"
                        />
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-400 uppercase font-bold px-1">E</span>
                        <input 
                          type="number" 
                          min="1" 
                          value={episode}
                          onChange={(e) => setEpisode(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-12 bg-white/10 border border-white/20 rounded-md text-center text-white text-sm py-1 focus:outline-none focus:border-red-500"
                        />
                    </div>
                    {isAnime && (
                        <div className="flex bg-white/10 rounded-md p-0.5 ml-1">
                             <button onClick={() => setAnimeType('sub')} className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${animeType === 'sub' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}>SUB</button>
                             <button onClick={() => setAnimeType('dub')} className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${animeType === 'dub' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}>DUB</button>
                        </div>
                    )}
                </div>
            )}
          </div>

          <button 
            onClick={onClose}
            className="pointer-events-auto bg-black/60 hover:bg-red-600 text-white p-2 rounded-full transition-colors backdrop-blur-sm"
            title="Close Player"
          >
            <X size={24}/>
          </button>
       </div>

      <div className="flex-1 relative w-full h-full">
        <iframe 
            key={`${isTv}-${isAnime}-${season}-${episode}-${animeType}`} 
            src={getEmbedUrl()}
            className="w-full h-full absolute inset-0 bg-black"
            allowFullScreen 
            title="Movie Player"
            frameBorder="0"
            allow="autoplay; fullscreen" 
            sandbox="allow-forms allow-pointer-lock allow-same-origin allow-scripts allow-presentation"
        />
      </div>
    </div>
  );
};