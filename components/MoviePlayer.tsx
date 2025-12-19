
import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronLeft, X, Film, Tv, Ghost, Search, List, ChevronDown, Loader2, Maximize2, Minimize2, Server } from 'lucide-react';
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

const HASH_VIDSRC = "aHR0cHM6Ly92aWRzcmMuY2MvdjIvZW1iZWQ=";
const BASE_VIDFAST = "https://vidfast.pro";
const BASE_VIDKING = "https://www.vidking.net";

type StreamingServer = 'vidsrc' | 'vidfast' | 'vidking';

export const MoviePlayer: React.FC<MoviePlayerProps> = ({ 
  tmdbId, onClose, mediaType, isAnime, initialSeason = 1, initialEpisode = 1, apiKey
}) => {
  const [season, setSeason] = useState(initialSeason);
  const [episode, setEpisode] = useState(initialEpisode);
  const [animeType, setAnimeType] = useState<'sub' | 'dub'>('sub');
  const [isMenuExpanded, setIsMenuExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeServer, setActiveServer] = useState<StreamingServer>('vidsrc');
  const [showServerDropdown, setShowServerDropdown] = useState(false);
  
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

  // Fullscreen persistence logic
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

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
  }, [tmdbId, apiKey, showEpisodeControls]);

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
    if (activeServer === 'vidsrc') {
        const p = new URLSearchParams();
        p.set('autoPlay', '1');
        p.set('autoSkipIntro', '1');
        p.set('color', 'f59e0b');
        let base = atob(HASH_VIDSRC);
        if (isAnime) return `${base}/anime/tmdb${tmdbId}/${episode}/${animeType}?${p.toString()}`;
        if (mediaType === 'tv') return `${base}/tv/${tmdbId}/${season}/${episode}?${p.toString()}`;
        return `${base}/movie/${tmdbId}?${p.toString()}`;
    } else if (activeServer === 'vidfast') {
        // VidFast logic
        const p = new URLSearchParams();
        p.set('autoPlay', 'true');
        p.set('theme', 'f59e0b');
        if (mediaType === 'tv' || isAnime) {
            p.set('nextButton', 'true');
            p.set('autoNext', 'true');
            return `${BASE_VIDFAST}/tv/${tmdbId}/${season}/${episode}?${p.toString()}`;
        }
        return `${BASE_VIDFAST}/movie/${tmdbId}?${p.toString()}`;
    } else {
        // VidKing logic
        if (mediaType === 'tv' || isAnime) {
            return `${BASE_VIDKING}/embed/tv/${tmdbId}/${season}/${episode}`;
        }
        return `${BASE_VIDKING}/embed/movie/${tmdbId}`;
    }
  };

  const filteredEpisodes = currentSeasonData.filter(ep => 
    ep.episode_number.toString().includes(epSearchQuery) || 
    ep.name.toLowerCase().includes(epSearchQuery.toLowerCase())
  );

  const getServerLabel = (server: StreamingServer) => {
    switch(server) {
      case 'vidsrc': return 'Server 1';
      case 'vidfast': return 'Server 2';
      case 'vidking': return 'Server 3';
    }
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full flex flex-col bg-black relative group/player select-none overflow-hidden"
    >
       {/* Overlay Container */}
       <div className="absolute top-0 left-0 right-0 z-[100] p-6 flex justify-between items-start opacity-0 group-hover/player:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-b from-black/90 via-black/20 to-transparent">
          
          <div className="flex items-center gap-3 pointer-events-auto ml-14">
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

            {/* Server Selector */}
            <div className="relative pointer-events-auto">
                <button 
                  onClick={() => setShowServerDropdown(!showServerDropdown)}
                  className={`bg-black/60 backdrop-blur-xl px-4 h-10 rounded-lg border border-white/10 text-white/70 hover:text-white transition-all active:scale-95 flex items-center gap-3 text-xs font-bold ${showServerDropdown ? 'ring-2 ring-amber-500/50' : ''}`}
                >
                    <Server size={14} className="text-amber-500"/>
                    <span className="uppercase tracking-widest hidden sm:inline">{getServerLabel(activeServer)}</span>
                    <ChevronDown size={14} className={`transition-transform duration-300 ${showServerDropdown ? 'rotate-180' : ''}`}/>
                </button>

                {showServerDropdown && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-[#121212]/95 backdrop-blur-xl border border-amber-500/20 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <button 
                            onClick={() => { setActiveServer('vidsrc'); setShowServerDropdown(false); }}
                            className={`w-full text-left px-5 py-3 text-xs font-bold transition-all flex items-center justify-between ${activeServer === 'vidsrc' ? 'text-amber-500 bg-amber-500/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <span>SERVER 1 (VIDSRC)</span>
                            {activeServer === 'vidsrc' && <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>}
                        </button>
                        <button 
                            onClick={() => { setActiveServer('vidfast'); setShowServerDropdown(false); }}
                            className={`w-full text-left px-5 py-3 text-xs font-bold transition-all flex items-center justify-between border-t border-white/5 ${activeServer === 'vidfast' ? 'text-amber-500 bg-amber-500/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <span>SERVER 2 (VIDFAST)</span>
                            {activeServer === 'vidfast' && <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>}
                        </button>
                        <button 
                            onClick={() => { setActiveServer('vidking'); setShowServerDropdown(false); }}
                            className={`w-full text-left px-5 py-3 text-xs font-bold transition-all flex items-center justify-between border-t border-white/5 ${activeServer === 'vidking' ? 'text-amber-500 bg-amber-500/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <span>SERVER 3 (VIDKING)</span>
                            {activeServer === 'vidking' && <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>}
                        </button>
                    </div>
                )}
            </div>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
              <button 
                onClick={toggleFullscreen}
                className="bg-black/40 hover:bg-white/10 text-white p-2 rounded-lg transition-all shadow-lg active:scale-95 h-10 w-10 flex items-center justify-center shrink-0 border border-white/10"
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? <Minimize2 size={18}/> : <Maximize2 size={18}/>}
              </button>

              <button 
                onClick={onClose}
                className="bg-black/40 hover:bg-amber-600 text-white p-2 rounded-lg transition-all shadow-lg active:scale-95 h-10 w-10 flex items-center justify-center shrink-0 border border-white/10"
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
                                className="w-full bg-white/5 border border-white/5 rounded-lg pl-10 pr-4 py-2 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-amber-500/30 transition-all"
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

                {isAnime && (
                    <div className="p-6 bg-black/40 border-t border-white/5 flex gap-2">
                        <button 
                            onClick={() => setAnimeType('sub')}
                            className={`flex-1 py-2.5 text-[9px] font-black rounded-lg transition-all ${animeType === 'sub' ? 'bg-amber-500 text-black shadow-lg shadow-amber-900/40' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                        >
                            SUBTITLED
                        </button>
                        <button 
                            onClick={() => setAnimeType('dub')}
                            className={`flex-1 py-2.5 text-[9px] font-black rounded-lg transition-all ${animeType === 'dub' ? 'bg-amber-500 text-black shadow-lg shadow-amber-900/40' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                        >
                            DUBBED
                        </button>
                    </div>
                )}
           </div>
       )}

      <div className="flex-1 relative w-full h-full z-0 overflow-hidden">
        <iframe 
            key={`${activeServer}-${mediaType}-${isAnime}-${season}-${episode}-${animeType}`} 
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
