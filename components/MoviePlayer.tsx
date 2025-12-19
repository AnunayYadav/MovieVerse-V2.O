
import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronLeft, X, Film, Tv, Ghost, Search, List, ChevronDown, Loader2 } from 'lucide-react';
import { Season, Episode } from '../types';
import { TMDB_BASE_URL } from './Shared';

interface MoviePlayerProps {
  tmdbId: number;
  imdbId?: string;
  onClose: () => void;
  mediaType: string;
  isAnime: boolean;
  initialSeason?: number;
  initialEpisode?: number;
  apiKey: string;
}

const HASH = "aHR0cHM6Ly92aWRzcmMuY2MvdjIvZW1iZWQ=";

export const MoviePlayer: React.FC<MoviePlayerProps> = ({ 
  tmdbId, onClose, mediaType, isAnime, initialSeason = 1, initialEpisode = 1, apiKey
}) => {
  const [season, setSeason] = useState(initialSeason);
  const [episode, setEpisode] = useState(initialEpisode);
  const [animeType, setAnimeType] = useState<'sub' | 'dub'>('sub');
  const [isMenuExpanded, setIsMenuExpanded] = useState(false);
  
  // Episode Selector State
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [currentSeasonData, setCurrentSeasonData] = useState<Episode[]>([]);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [epSearchQuery, setEpSearchQuery] = useState("");
  const [showSeasonDropdown, setShowSeasonDropdown] = useState(false);

  const showControls = mediaType === 'tv' || isAnime;

  useEffect(() => {
    setSeason(initialSeason);
    setEpisode(initialEpisode);
  }, [initialSeason, initialEpisode]);

  // Fetch Metadata for Episode List
  useEffect(() => {
    if (!showControls || !apiKey) return;

    const fetchMetadata = async () => {
        setLoadingMetadata(true);
        try {
            // Get all seasons
            const res = await fetch(`${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${apiKey}`);
            const data = await res.json();
            if (data.seasons) {
                const validSeasons = data.seasons.filter((s: Season) => s.season_number > 0);
                setSeasons(validSeasons);
                
                // Fetch initial season episodes
                const epRes = await fetch(`${TMDB_BASE_URL}/tv/${tmdbId}/season/${season}?api_key=${apiKey}`);
                const epData = await epRes.json();
                setCurrentSeasonData(epData.episodes || []);
            }
        } catch (e) {
            console.error("Failed to load player metadata", e);
        } finally {
            setLoadingMetadata(false);
        }
    };

    fetchMetadata();
  }, [tmdbId, apiKey, showControls]);

  // Fetch new episodes when season changes
  const handleSeasonChange = async (sNum: number) => {
      setSeason(sNum);
      setShowSeasonDropdown(false);
      setLoadingMetadata(true);
      try {
          const res = await fetch(`${TMDB_BASE_URL}/tv/${tmdbId}/season/${sNum}?api_key=${apiKey}`);
          const data = await res.json();
          setCurrentSeasonData(data.episodes || []);
      } catch (e) {
          console.error(e);
      } finally {
          setLoadingMetadata(false);
      }
  };

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
    if (mediaType === 'tv') return `${base}/tv/${tmdbId}/${season}/${episode}?${p.toString()}`;
    return `${base}/movie/${tmdbId}?${p.toString()}`;
  };

  const filteredEpisodes = currentSeasonData.filter(ep => 
    ep.episode_number.toString().includes(epSearchQuery) || 
    ep.name.toLowerCase().includes(epSearchQuery.toLowerCase())
  );

  return (
    <div className="w-full h-full flex flex-col bg-black relative group/player select-none overflow-hidden">
       {/* Overlay Container */}
       <div className="absolute top-0 left-0 right-0 z-40 p-6 flex justify-between items-start opacity-0 group-hover/player:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-b from-black/80 via-black/20 to-transparent">
          
          <div className="flex items-center gap-3 pointer-events-auto">
            {showControls && (
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setIsMenuExpanded(!isMenuExpanded)}
                        className={`bg-[#25252b]/80 backdrop-blur-xl p-2.5 rounded-xl border border-white/5 shadow-lg text-white/70 hover:text-white transition-all active:scale-95 flex items-center justify-center h-11 w-11 shrink-0 ${isMenuExpanded ? 'ring-2 ring-red-500/50 bg-[#25252b]' : ''}`}
                        title={isMenuExpanded ? "Close Episode List" : "Open Episode List"}
                    >
                        {isMenuExpanded ? <ChevronLeft size={20}/> : <List size={20}/>}
                    </button>
                    
                    <div className="bg-[#1c1c24]/90 backdrop-blur-xl px-4 h-11 rounded-xl border border-white/5 flex items-center gap-4 animate-in fade-in slide-in-from-left-1">
                       <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Playing</span>
                       <span className="text-[13px] font-bold text-red-500 flex gap-2">
                           <span>S{season}</span>
                           <span className="opacity-40">|</span>
                           <span>E{episode}</span>
                       </span>
                    </div>
                </div>
            )}
          </div>

          <button 
            onClick={onClose}
            className="bg-red-600/90 hover:bg-red-600 text-white p-2.5 rounded-xl transition-all shadow-lg active:scale-95 h-11 w-11 flex items-center justify-center shrink-0 border border-white/10 pointer-events-auto"
            title="Close Player"
          >
            <X size={22}/>
          </button>
       </div>

       {/* EPISODE LIST OVERLAY (MATCHING THE IMAGE) */}
       {isMenuExpanded && showControls && (
           <div className="absolute top-0 left-0 bottom-0 w-80 md:w-96 z-50 bg-[#0a0a0f]/95 backdrop-blur-3xl border-r border-white/5 shadow-2xl flex flex-col animate-in slide-in-from-left duration-300 ease-out">
                {/* Header */}
                <div className="p-8 pb-4">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-white font-bold text-sm tracking-tight uppercase opacity-50">List of episodes:</h3>
                        <button onClick={() => setIsMenuExpanded(false)} className="text-gray-600 hover:text-white transition-colors"><X size={20}/></button>
                    </div>

                    <div className="flex gap-3 items-center">
                        {/* Season Dropdown */}
                        <div className="relative flex-1">
                            <button 
                                onClick={() => setShowSeasonDropdown(!showSeasonDropdown)}
                                className="w-full bg-[#1c1c24] hover:bg-[#252530] border border-white/5 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs font-bold text-white transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <List size={16} className="text-gray-500"/>
                                    <span className="truncate">{seasons.find(s => s.season_number === season)?.name || `Season ${season}`}</span>
                                </div>
                                <ChevronDown size={14} className={`text-gray-500 transition-transform duration-300 ${showSeasonDropdown ? 'rotate-180' : ''}`}/>
                            </button>

                            {showSeasonDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1c1c24] border border-white/10 rounded-xl shadow-2xl z-[60] py-2 max-h-64 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
                                    {seasons.map(s => (
                                        <button 
                                            key={s.id}
                                            onClick={() => handleSeasonChange(s.season_number)}
                                            className={`w-full text-left px-5 py-3 text-xs font-bold transition-colors ${s.season_number === season ? 'text-red-500 bg-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                        >
                                            {s.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Search Box */}
                        <div className="relative w-32 md:w-40 shrink-0">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                            <input 
                                type="text"
                                value={epSearchQuery}
                                onChange={(e) => setEpSearchQuery(e.target.value)}
                                placeholder="Number of Ep"
                                className="w-full bg-[#1c1c24] border border-white/5 rounded-xl pl-11 pr-4 py-2.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-red-600/50 transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Episode Grid */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pt-4">
                    {loadingMetadata ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="animate-spin text-red-500" size={32}/>
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 pb-12">
                            {filteredEpisodes.map(ep => (
                                <button 
                                    key={ep.id}
                                    onClick={() => setEpisode(ep.episode_number)}
                                    className={`aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-all border ${
                                        ep.episode_number === episode 
                                        ? 'bg-pink-400 text-black border-transparent shadow-[0_0_20px_rgba(244,114,182,0.4)] scale-110 z-10' 
                                        : 'bg-[#252530] text-gray-400 hover:bg-[#303040] hover:text-white border-white/5 active:scale-95'
                                    }`}
                                >
                                    {ep.episode_number}
                                </button>
                            ))}
                            {filteredEpisodes.length === 0 && (
                                <div className="col-span-full py-12 text-center text-gray-700 italic text-xs">
                                    No episodes found.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Anime Toggle (If applicable) */}
                {isAnime && (
                    <div className="p-6 bg-black/40 border-t border-white/5 flex gap-3">
                        <button 
                            onClick={() => setAnimeType('sub')}
                            className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${animeType === 'sub' ? 'bg-white text-black shadow-lg' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                        >
                            SUBTITLED
                        </button>
                        <button 
                            onClick={() => setAnimeType('dub')}
                            className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${animeType === 'dub' ? 'bg-white text-black shadow-lg' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                        >
                            DUBBED
                        </button>
                    </div>
                )}
           </div>
       )}

      <div className="flex-1 relative w-full h-full z-0 overflow-hidden">
        <iframe 
            key={`${mediaType}-${isAnime}-${season}-${episode}-${animeType}`} 
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
