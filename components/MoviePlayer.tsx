
import React, { useState, useEffect } from 'react';
import { Film, Tv, Ghost, ChevronLeft, ChevronRight, X, Monitor, Layers, Info, ShieldCheck, Zap } from 'lucide-react';

interface MoviePlayerProps {
  tmdbId: number;
  imdbId?: string;
  onClose: () => void;
  mediaType: string;
  isAnime: boolean;
  initialSeason?: number;
  initialEpisode?: number;
}

interface VideoSource {
  id: string;
  name: string;
  url: string;
  quality: string;
  type: 'embed' | 'direct';
}

const HASH = "aHR0cHM6Ly92aWRzcmMuY2MvdjIvZW1iZWQ=";

export const MoviePlayer: React.FC<MoviePlayerProps> = ({ 
  tmdbId, onClose, mediaType, isAnime, initialSeason = 1, initialEpisode = 1
}) => {
  const [isTv, setIsTv] = useState(mediaType === 'tv' || isAnime);
  const [season, setSeason] = useState(initialSeason);
  const [episode, setEpisode] = useState(initialEpisode);
  const [animeType, setAnimeType] = useState<'sub' | 'dub'>('sub');
  
  const [isMenuExpanded, setIsMenuExpanded] = useState(true);
  const [activeSourceId, setActiveSourceId] = useState('vidsrc');
  const [showSourceMenu, setShowSourceMenu] = useState(false);

  useEffect(() => {
    setSeason(initialSeason);
    setEpisode(initialEpisode);
  }, [initialSeason, initialEpisode]);

  // Handle Screen Wake Lock
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

  const sources: VideoSource[] = [
    { id: 'vidsrc', name: 'Server Blue (Fast)', url: getEmbedUrl(), quality: '4K', type: 'embed' },
    { id: 'vidsrc_pro', name: 'Server Red (Stable)', url: getEmbedUrl().replace('vidsrc.cc', 'vidsrc.pro'), quality: '1080p', type: 'embed' }
  ];

  const activeSource = sources.find(s => s.id === activeSourceId) || sources[0];

  return (
    <div className="w-full h-full flex flex-col bg-black relative group/player select-none">
       {/* High-End HUD Overlay */}
       <div className="absolute top-0 left-0 right-0 z-30 p-4 flex justify-between items-start pointer-events-none opacity-0 group-hover/player:opacity-100 transition-opacity duration-500 bg-gradient-to-b from-black/80 to-transparent">
          <div className="pointer-events-auto flex flex-col gap-3">
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => setIsMenuExpanded(!isMenuExpanded)}
                    className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-2.5 rounded-xl border border-white/10 shadow-lg text-white transition-all active:scale-95"
                >
                    {isMenuExpanded ? <ChevronLeft size={18}/> : <Layers size={18}/>}
                </button>

                {isMenuExpanded && (
                    <div className="flex items-center gap-2 bg-black/60 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 shadow-2xl animate-in slide-in-from-left-4 duration-300">
                        {!isAnime && (
                          <div className="flex gap-1">
                            <button 
                                onClick={() => setIsTv(false)} 
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${!isTv ? 'bg-red-600 text-white shadow-lg shadow-red-900/50' : 'hover:bg-white/10 text-gray-400'}`}
                            >
                                <Film size={14}/> MOVIE
                            </button>
                            <button 
                                onClick={() => setIsTv(true)} 
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${isTv ? 'bg-red-600 text-white shadow-lg shadow-red-900/50' : 'hover:bg-white/10 text-gray-400'}`}
                            >
                                <Tv size={14}/> TV SHOW
                            </button>
                          </div>
                        )}
                        {isAnime && (
                            <div className="px-4 py-2 rounded-xl text-xs font-black bg-purple-600 text-white shadow-lg shadow-purple-900/50 flex items-center gap-2">
                                <Ghost size={14}/> ANIME MODE
                            </div>
                        )}
                        <div className="w-px h-5 bg-white/10 mx-1"></div>
                        
                        {/* Source Toggle */}
                        <div className="relative">
                            <button 
                                onClick={() => setShowSourceMenu(!showSourceMenu)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 ${showSourceMenu ? 'bg-white text-black' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
                            >
                                <Monitor size={12}/> {activeSource.name.toUpperCase()}
                            </button>

                            {showSourceMenu && (
                                <div className="absolute top-full left-0 mt-2 w-56 bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <div className="p-3 border-b border-white/5 bg-white/5">
                                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Select Server</p>
                                    </div>
                                    {sources.map(s => (
                                        <button 
                                            key={s.id}
                                            onClick={() => { setActiveSourceId(s.id); setShowSourceMenu(false); }}
                                            className={`w-full text-left p-3 text-xs font-bold flex items-center justify-between hover:bg-white/5 transition-colors ${activeSourceId === s.id ? 'text-red-500' : 'text-gray-400'}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Zap size={14} className={activeSourceId === s.id ? 'text-red-500' : 'text-gray-600'}/>
                                                {s.name}
                                            </div>
                                            <span className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded text-gray-500">{s.quality}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {isMenuExpanded && (isTv || isAnime) && (
                <div className="flex items-center gap-3 bg-black/60 backdrop-blur-xl p-2.5 rounded-2xl border border-white/10 shadow-2xl animate-in slide-in-from-left-6 duration-400 delay-75">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-red-500 uppercase font-black px-1 tracking-tighter">Season</span>
                        <input 
                          type="number" 
                          min="1" 
                          value={season}
                          onChange={(e) => setSeason(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-12 bg-white/5 border border-white/10 rounded-lg text-center text-white text-xs py-1.5 focus:outline-none focus:border-red-500 focus:bg-white/10 transition-all font-bold"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-red-500 uppercase font-black px-1 tracking-tighter">Episode</span>
                        <input 
                          type="number" 
                          min="1" 
                          value={episode}
                          onChange={(e) => setEpisode(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-12 bg-white/5 border border-white/10 rounded-lg text-center text-white text-xs py-1.5 focus:outline-none focus:border-red-500 focus:bg-white/10 transition-all font-bold"
                        />
                    </div>
                    {isAnime && (
                        <div className="flex bg-white/5 rounded-xl p-1 ml-1 border border-white/5">
                             <button onClick={() => setAnimeType('sub')} className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${animeType === 'sub' ? 'bg-white text-black shadow-md' : 'text-gray-500 hover:text-white'}`}>SUB</button>
                             <button onClick={() => setAnimeType('dub')} className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${animeType === 'dub' ? 'bg-white text-black shadow-md' : 'text-gray-500 hover:text-white'}`}>DUB</button>
                        </div>
                    )}
                </div>
            )}
          </div>

          <div className="pointer-events-auto flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-3 py-2 rounded-xl text-[10px] font-bold text-green-400 backdrop-blur-md">
                  <ShieldCheck size={12}/> SECURE STREAM
              </div>
              <button 
                onClick={onClose}
                className="bg-red-600 hover:bg-red-700 text-white p-2.5 rounded-xl transition-all shadow-lg active:scale-95 border border-red-500/50"
                title="Close Player"
              >
                <X size={20}/>
              </button>
          </div>
       </div>

       {/* Hint Overlay when Mouse is Idle */}
       <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center opacity-0 group-hover/player:opacity-0 transition-opacity duration-1000 group-hover/player:delay-0 delay-3000">
            <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 flex items-center gap-3">
                <Info size={16} className="text-red-500"/>
                <p className="text-sm font-bold text-white/80">Press ESC to exit theater mode</p>
            </div>
       </div>

      <div className="flex-1 relative w-full h-full z-0 overflow-hidden">
        <iframe 
            key={`${activeSourceId}-${isTv}-${isAnime}-${season}-${episode}-${animeType}`} 
            src={activeSource.url}
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
