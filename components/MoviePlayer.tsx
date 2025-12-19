
import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, X, Film, Tv, Ghost } from 'lucide-react';

interface MoviePlayerProps {
  tmdbId: number;
  imdbId?: string;
  onClose: () => void;
  mediaType: string;
  isAnime: boolean;
  initialSeason?: number;
  initialEpisode?: number;
}

const HASH = "aHR0cHM6Ly92aWRzcmMuY2MvdjIvZW1iZWQ=";

export const MoviePlayer: React.FC<MoviePlayerProps> = ({ 
  tmdbId, onClose, mediaType, isAnime, initialSeason = 1, initialEpisode = 1
}) => {
  const [isTv, setIsTv] = useState(mediaType === 'tv' || isAnime);
  const [season, setSeason] = useState(initialSeason);
  const [episode, setEpisode] = useState(initialEpisode);
  const [animeType, setAnimeType] = useState<'sub' | 'dub'>('sub');
  
  const [isMenuExpanded, setIsMenuExpanded] = useState(false);

  useEffect(() => {
    setSeason(initialSeason);
    setEpisode(initialEpisode);
  }, [initialSeason, initialEpisode]);

  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        const nav = navigator as any;
        if ('wakeLock' in nav) { wakeLock = await nav.wakeLock.request('screen'); }
      } catch (err) {}
    };
    requestWakeLock();
    const handleVisibilityChange = () => { if (document.visibilityState === 'visible') requestWakeLock(); };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
    };
  }, []);

  const getEmbedUrl = () => {
    const p = new URLSearchParams();
    p.set('autoPlay', '1');
    p.set('autoSkipIntro', '1');
    p.set('color', 'dc2626');

    let base = atob(HASH);

    if (isAnime) return `${base}/anime/tmdb${tmdbId}/${episode}/${animeType}?${p.toString()}`;
    if (isTv) return `${base}/tv/${tmdbId}/${season}/${episode}?${p.toString()}`;
    return `${base}/movie/${tmdbId}?${p.toString()}`;
  };

  return (
    <div className="w-full h-full flex flex-col bg-black relative group/player select-none">
       {/* Overlay Container - pointer-events-none allows interaction with iframe beneath */}
       <div className="absolute top-0 left-0 right-0 z-40 p-4 flex justify-between items-start opacity-0 group-hover/player:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-b from-black/80 via-transparent to-transparent">
          
          <div className="flex items-center gap-3 ml-24 pointer-events-auto">
            {/* Controls Toggle - Shifted right (ml-24) to avoid player's top-left native icons */}
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setIsMenuExpanded(!isMenuExpanded)}
                    className="bg-black/60 backdrop-blur-xl p-2 rounded-xl border border-white/10 shadow-lg text-white/70 hover:text-white transition-all active:scale-95 flex items-center justify-center h-10 w-10 shrink-0"
                    title={isMenuExpanded ? "Collapse" : "Expand"}
                >
                    {isMenuExpanded ? <ChevronLeft size={18}/> : <ChevronRight size={18}/>}
                </button>

                {isMenuExpanded && (
                    <div className="flex items-center gap-2 animate-in slide-in-from-left-2 fade-in duration-300">
                        <div className="flex items-center gap-1 bg-black/60 backdrop-blur-xl p-1 rounded-2xl border border-white/10 shadow-2xl h-10">
                            {!isAnime ? (
                              <>
                                <button 
                                    onClick={() => setIsTv(false)} 
                                    className={`px-3 h-full rounded-xl text-[10px] font-black transition-all flex items-center gap-1.5 ${!isTv ? 'bg-red-600 text-white shadow-md' : 'hover:bg-white/5 text-gray-500'}`}
                                >
                                    <Film size={12}/> MOVIE
                                </button>
                                <button 
                                    onClick={() => setIsTv(true)} 
                                    className={`px-3 h-full rounded-xl text-[10px] font-black transition-all flex items-center gap-1.5 ${isTv ? 'bg-red-600 text-white shadow-md' : 'hover:bg-white/5 text-gray-500'}`}
                                >
                                    <Tv size={12}/> TV
                                </button>
                              </>
                            ) : (
                                <div className="px-3 h-full rounded-xl text-[10px] font-black bg-purple-600 text-white flex items-center gap-1.5">
                                    <Ghost size={12}/> ANIME
                                </div>
                            )}
                        </div>

                        {(isTv || isAnime) && (
                            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-xl px-2 rounded-2xl border border-white/10 shadow-2xl h-10">
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-red-500 font-black">S</span>
                                    <input 
                                      type="number" 
                                      min="1" 
                                      value={season}
                                      onChange={(e) => setSeason(Math.max(1, parseInt(e.target.value) || 1))}
                                      className="w-8 bg-transparent text-center text-white text-xs py-1 focus:outline-none font-bold"
                                    />
                                </div>
                                <div className="w-px h-3 bg-white/10"></div>
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-red-500 font-black">E</span>
                                    <input 
                                      type="number" 
                                      min="1" 
                                      value={episode}
                                      onChange={(e) => setEpisode(Math.max(1, parseInt(e.target.value) || 1))}
                                      className="w-8 bg-transparent text-center text-white text-xs py-1 focus:outline-none font-bold"
                                    />
                                </div>
                                {isAnime && (
                                    <div className="flex bg-white/5 rounded-lg p-0.5 ml-1 border border-white/5">
                                        <button onClick={() => setAnimeType('sub')} className={`px-1.5 py-0.5 text-[8px] font-black rounded transition-all ${animeType === 'sub' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}>SUB</button>
                                        <button onClick={() => setAnimeType('dub')} className={`px-1.5 py-0.5 text-[8px] font-black rounded transition-all ${animeType === 'dub' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}>DUB</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
          </div>

          <button 
            onClick={onClose}
            className="bg-red-600 hover:bg-red-700 text-white p-2.5 rounded-xl transition-all shadow-lg active:scale-95 h-10 w-10 flex items-center justify-center shrink-0 border border-red-500/20 pointer-events-auto"
            title="Close"
          >
            <X size={20}/>
          </button>
       </div>

      <div className="flex-1 relative w-full h-full z-0 overflow-hidden">
        <iframe 
            key={`${isTv}-${isAnime}-${season}-${episode}-${animeType}`} 
            src={getEmbedUrl()}
            className="w-full h-full absolute inset-0 bg-black"
            allowFullScreen 
            title="Media Player"
            frameBorder="0"
            allow="autoplay; fullscreen" 
            sandbox="allow-forms allow-pointer-lock allow-same-origin allow-scripts allow-presentation"
        />
      </div>
    </div>
  );
};
