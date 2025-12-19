
import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, X, Film, Tv, Ghost } from 'lucide-react';

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
  
  // Menu now collapsed by default as requested
  const [isMenuExpanded, setIsMenuExpanded] = useState(false);

  useEffect(() => {
    setSeason(initialSeason);
    setEpisode(initialEpisode);
  }, [initialSeason, initialEpisode]);

  // Handle Screen Wake Lock to prevent screen dimming during playback
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
       {/* Controls Overlay */}
       <div className="absolute top-0 left-0 right-0 z-30 p-4 flex justify-between items-start opacity-0 group-hover/player:opacity-100 transition-opacity duration-300 bg-gradient-to-b from-black/80 to-transparent">
          
          {/* Menu Section - Shifted "a little right" as requested */}
          <div className="flex flex-col gap-2 ml-12">
            <button 
                onClick={() => setIsMenuExpanded(!isMenuExpanded)}
                className="bg-black/60 backdrop-blur-xl p-2 rounded-xl border border-white/10 shadow-lg text-white/70 hover:text-white transition-all active:scale-95 flex items-center gap-2 w-fit"
                title={isMenuExpanded ? "Hide Controls" : "Show Controls"}
            >
                {isMenuExpanded ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
                {!isMenuExpanded && <span className="text-[10px] font-bold uppercase tracking-wider pr-1">Controls</span>}
            </button>

            {isMenuExpanded && (
                <div className="flex flex-col gap-2 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 bg-black/60 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 shadow-2xl">
                        {!isAnime && (
                          <div className="flex gap-1">
                            <button 
                                onClick={() => setIsTv(false)} 
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${!isTv ? 'bg-red-600 text-white shadow-lg' : 'hover:bg-white/10 text-gray-400'}`}
                            >
                                <Film size={14}/> MOVIE
                            </button>
                            <button 
                                onClick={() => setIsTv(true)} 
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${isTv ? 'bg-red-600 text-white shadow-lg' : 'hover:bg-white/10 text-gray-400'}`}
                            >
                                <Tv size={14}/> TV SHOW
                            </button>
                          </div>
                        )}
                        {isAnime && (
                            <div className="px-4 py-2 rounded-xl text-xs font-black bg-purple-600 text-white shadow-lg flex items-center gap-2">
                                <Ghost size={14}/> ANIME
                            </div>
                        )}
                    </div>

                    {(isTv || isAnime) && (
                        <div className="flex items-center gap-3 bg-black/60 backdrop-blur-xl p-2 rounded-2xl border border-white/10 shadow-2xl">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-red-500 uppercase font-black px-1">S</span>
                                <input 
                                  type="number" 
                                  min="1" 
                                  value={season}
                                  onChange={(e) => setSeason(Math.max(1, parseInt(e.target.value) || 1))}
                                  className="w-10 bg-white/5 border border-white/5 rounded-lg text-center text-white text-xs py-1.5 focus:outline-none focus:border-red-500 transition-all font-bold"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-red-500 uppercase font-black px-1">E</span>
                                <input 
                                  type="number" 
                                  min="1" 
                                  value={episode}
                                  onChange={(e) => setEpisode(Math.max(1, parseInt(e.target.value) || 1))}
                                  className="w-10 bg-white/5 border border-white/5 rounded-lg text-center text-white text-xs py-1.5 focus:outline-none focus:border-red-500 transition-all font-bold"
                                />
                            </div>
                            {isAnime && (
                                <div className="flex bg-white/5 rounded-lg p-1 ml-1">
                                    <button onClick={() => setAnimeType('sub')} className={`px-2 py-1 text-[9px] font-black rounded transition-all ${animeType === 'sub' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}>SUB</button>
                                    <button onClick={() => setAnimeType('dub')} className={`px-2 py-1 text-[9px] font-black rounded transition-all ${animeType === 'dub' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}>DUB</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
          </div>

          <button 
            onClick={onClose}
            className="bg-red-600 hover:bg-red-700 text-white p-2.5 rounded-xl transition-all shadow-lg active:scale-95"
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
