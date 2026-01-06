
import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronLeft, X, Film, Tv, Ghost, Search, List, ChevronDown, Loader2, ArrowLeft } from 'lucide-react';
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
  server?: string;
}

export const MoviePlayer: React.FC<MoviePlayerProps> = ({ 
  tmdbId, onClose, mediaType, isAnime, initialSeason = 1, initialEpisode = 1, apiKey, server = 'server1'
}) => {
  const [season, setSeason] = useState(initialSeason);
  const [episode, setEpisode] = useState(initialEpisode);
  const [isMenuExpanded, setIsMenuExpanded] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Episode Selector State
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [currentSeasonData, setCurrentSeasonData] = useState<Episode[]>([]);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [epSearchQuery, setEpSearchQuery] = useState("");
  const [showSeasonDropdown, setShowSeasonDropdown] = useState(false);

  const showEpisodeControls = mediaType === 'tv' || isAnime;

  useEffect(() => {
    setSeason(initialSeason);
    setEpisode(initialEpisode);
  }, [initialSeason, initialEpisode]);

  // Fetch Metadata for Episode List
  useEffect(() => {
    if (!showEpisodeControls || !apiKey) return;

    const fetchMetadata = async () => {
        setLoadingMetadata(true);
        try {
            const res = await fetch(`${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${apiKey}`);
            const data = await res.json();
            if (data.seasons) {
                const validSeasons = data.seasons.filter((s: Season) => s.season_number > 0);
                setSeasons(validSeasons);
                
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
  }, [tmdbId, apiKey, showEpisodeControls, season]);

  const handleSeasonChange = async (sNum: number) => {
      setSeason(sNum);
      setShowSeasonDropdown(false);
      setLoadingMetadata(true);
      try {
          const res = await fetch(`${TMDB_BASE_URL}/tv/${tmdbId}/season/${sNum}?api_key=${apiKey}`);
          const data = await res.json();
          setCurrentSeasonData(data.episodes || []);
          setEpisode(1); // Reset to ep 1 on season change
      } catch (e) {
          console.error(e);
      } finally {
          setLoadingMetadata(false);
      }
  };

  const getEmbedUrl = () => {
    // Server 2: VidFast
    if (server === 'server2') {
         if (mediaType === 'tv' || (isAnime && mediaType !== 'movie')) {
             return `https://vidfast.pro/tv/${tmdbId}/${season}/${episode}`;
         }
         return `https://vidfast.pro/movie/${tmdbId}`;
    }

    // Default Server 1: VidSrc
    if (mediaType === 'tv' || (isAnime && mediaType !== 'movie')) {
        return `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season}/${episode}`;
    }
    // Movies
    return `https://vidsrc.cc/v2/embed/movie/${tmdbId}`;
  };

  const filteredEpisodes = currentSeasonData.filter(ep => 
    ep.episode_number.toString().includes(epSearchQuery) || 
    ep.name.toLowerCase().includes(epSearchQuery.toLowerCase())
  );

  return (
    <div 
      ref={containerRef}
      className="w-full h-full flex flex-col bg-black relative group/player select-none overflow-hidden"
    >
       {/* Overlay Container */}
       <div className="absolute top-0 left-0 right-0 z-[100] p-6 flex items-center justify-between gap-4 opacity-0 group-hover/player:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-b from-black/90 via-black/20 to-transparent">
          
          <div className="flex items-center gap-3 pointer-events-auto">
            {showEpisodeControls && (
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setIsMenuExpanded(!isMenuExpanded)}
                        className={`bg-black/60 backdrop-blur-xl p-2 rounded-lg border border-white/10 shadow-lg text-white/70 hover:text-amber-500 transition-all active:scale-95 flex items-center justify-center h-10 w-10 shrink-0 ${isMenuExpanded ? 'ring-2 ring-amber-500/50 bg-[#1a1a1a]' : ''}`}
                        title={isMenuExpanded ? "Close Episode List" : "Open Episode List"}
                    >
                        {isMenuExpanded ? <ChevronLeft size={18}/> : <List size={18}/>}
                    </button>
                    
                    <div className="bg-black/60 backdrop-blur-xl px-4 h-10 rounded-lg border border-white/5 flex items-center gap-4 animate-in fade-in slide-in-from-left-1">
                       <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Playing</span>
                       <span className="text-[12px] font-bold text-amber-500 flex gap-2">
                           <span>S{season}</span>
                           <span className="opacity-40">|</span>
                           <span>E{episode}</span>
                       </span>
                    </div>
                </div>
            )}
          </div>

          <div className="pointer-events-auto">
              <button 
                onClick={onClose}
                className="bg-black/40 hover:bg-red-600 text-white p-2 rounded-lg transition-all shadow-lg active:scale-95 h-10 w-10 flex items-center justify-center shrink-0 border border-white/10"
                title="Close Player"
              >
                <X size={20}/>
              </button>
          </div>
       </div>

       {/* EPISODE LIST OVERLAY */}
       {isMenuExpanded && showEpisodeControls && (
           <div className="absolute top-0 left-0 bottom-0 w-80 md:w-96 z-[110] bg-[#050505]/95 backdrop-blur-3xl border-r border-amber-500/10 shadow-2xl flex flex-col animate-in slide-in-from-left duration-400 ease-[cubic-bezier(0.4,0,0.2,1)]">
                <div className="p-6 pb-4">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-white font-bold text-[10px] tracking-widest uppercase opacity-40">Select Episode</h3>
                        <button onClick={() => setIsMenuExpanded(false)} className="text-gray-600 hover:text-white transition-colors p-1"><X size={18}/></button>
                    </div>

                    <div className="flex flex-col gap-3">
                        <div className="relative">
                            <button 
                                onClick={() => setShowSeasonDropdown(!showSeasonDropdown)}
                                className="w-full bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg px-4 py-2.5 flex items-center justify-between text-xs font-bold text-white transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <List size={14} className="text-amber-500/50"/>
                                    <span className="truncate">{seasons.find(s => s.season_number === season)?.name || `Season ${season}`}</span>
                                </div>
                                <ChevronDown size={14} className={`text-gray-500 transition-transform duration-300 ${showSeasonDropdown ? 'rotate-180' : ''}`}/>
                            </button>

                            {showSeasonDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-[#121212] border border-amber-500/20 rounded-xl shadow-2xl z-[60] py-1 max-h-64 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
                                    {seasons.map(s => (
                                        <button 
                                            key={s.id}
                                            onClick={() => handleSeasonChange(s.season_number)}
                                            className={`w-full text-left px-5 py-3 text-xs font-bold transition-colors ${s.season_number === season ? 'text-amber-500 bg-amber-500/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                        >
                                            {s.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="relative w-full">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                            <input 
                                type="text"
                                value={epSearchQuery}
                                onChange={(e) => setEpSearchQuery(e.target.value)}
                                placeholder="Jump to Episode..."
                                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-amber-500/30 transition-all"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-2">
                    {loadingMetadata ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="animate-spin text-amber-500" size={24}/>
                        </div>
                    ) : (
                        <div className="grid grid-cols-5 md:grid-cols-6 gap-2 pb-12">
                            {filteredEpisodes.map(ep => (
                                <button 
                                    key={ep.id}
                                    onClick={() => { setEpisode(ep.episode_number); setIsMenuExpanded(false); }}
                                    className={`aspect-square rounded-md flex items-center justify-center text-[11px] font-bold transition-all border ${
                                        ep.episode_number === episode 
                                        ? 'bg-amber-500 text-black border-transparent shadow-[0_0_15px_rgba(245,158,11,0.3)]' 
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border-white/5 active:scale-95'
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
           </div>
       )}

      <div className="flex-1 relative w-full h-full z-0 overflow-hidden bg-black">
        <iframe 
            key={`${mediaType}-${isAnime}-${season}-${episode}-${server}`} 
            src={getEmbedUrl()}
            className="w-full h-full absolute inset-0 bg-black"
            title="Media Player"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            sandbox={server === 'server2' ? undefined : "allow-forms allow-pointer-lock allow-same-origin allow-scripts allow-top-navigation"}
        />
      </div>
    </div>
  );
};
