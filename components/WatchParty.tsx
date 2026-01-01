import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Users, Search, Plus, Lock, Unlock, LogIn, MessageSquare, Send, Settings, Play, Pause, X, Loader2, Film, Crown, Check, Share2, Copy, Menu, UserPlus, UserMinus, ShieldAlert, LogOut, ChevronDown, MonitorPlay, Maximize2, Minimize2, Volume2, VolumeX, FastForward, Rewind, RefreshCcw, AlertTriangle, Link as LinkIcon, ExternalLink, Tv, SkipForward, Volume1 } from 'lucide-react';
import { WatchParty, UserProfile, Movie, PartyMessage, PartySettings } from '../types';
import { createWatchParty, joinWatchParty, getPublicParties, updatePartySettings, updatePartyMovie, subscribeToParty, sendPartyMessage, deleteWatchParty } from '../services/supabase';
import { TMDB_IMAGE_BASE, TMDB_BASE_URL } from './Shared';
import Hls from 'hls.js'; // Ensure you have run: npm install hls.js

interface WatchPartyProps {
    userProfile: UserProfile;
    apiKey: string;
    onClose: () => void;
}

export const WatchPartySection: React.FC<WatchPartyProps> = ({ userProfile, apiKey, onClose }) => {
    const [currentParty, setCurrentParty] = useState<WatchParty | null>(null);
    const [isHost, setIsHost] = useState(false);

    if (currentParty) {
        return (
            <WatchPartyRoom 
                party={currentParty} 
                isHost={isHost} 
                userProfile={userProfile} 
                apiKey={apiKey}
                onLeave={() => setCurrentParty(null)}
            />
        );
    }

    return (
        <WatchPartyLobby 
            userProfile={userProfile} 
            onJoin={(party, host) => { setCurrentParty(party); setIsHost(host); }}
            onClose={onClose}
        />
    );
};

// --- SYNCHRONIZED PLAYER COMPONENT (Modified for your Decryption Engine) ---
const SynchronizedPlayer = ({ 
    partyId, 
    movie, 
    isHost, 
    hasControl, 
    settings,
    onSyncUpdate 
}: { 
    partyId: string, 
    movie: Movie, 
    isHost: boolean, 
    hasControl: boolean, 
    settings: PartySettings,
    onSyncUpdate: (state: { isPlaying: boolean, currentTime: number }) => void 
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Player State
    const [streamUrl, setStreamUrl] = useState<string>("");
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [showSkipIntro, setShowSkipIntro] = useState(false);
    const [buffering, setBuffering] = useState(false);
    
    // Extraction & Fallback State
    const [extracting, setExtracting] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [useEmbedFallback, setUseEmbedFallback] = useState(false);
    
    const controlsTimeoutRef = useRef<any>(null);
    const hlsRef = useRef<Hls | null>(null);

    const season = settings.mediaParams?.season || 1;
    const episode = settings.mediaParams?.episode || 1;
    const mediaType = movie.media_type === 'tv' || movie.first_air_date ? 'tv' : 'movie';

    // Construct embed URLs for fallback
    const getEmbedUrl = (server = 'cc') => {
        const baseUrl = server === 'xyz' ? 'https://vidsrc.xyz/embed' : 'https://vidsrc.cc/v2/embed';
        if (mediaType === 'movie') return `${baseUrl}/movie/${movie.id}`;
        return `${baseUrl}/tv/${movie.id}/${season}/${episode}`;
    };

    // 1. Decryption Proxy Integration (Replaces your old scraper)
    useEffect(() => {
        if (useEmbedFallback) return;

        let isMounted = true;
        const fetchStream = async () => {
            setExtracting(true);
            setError(null);
            setStreamUrl("");
            
            try {
                // Calling your File 2 API route (/app/api/proxy/route.js)
                const response = await fetch(`/api/proxy?id=${movie.id}`);
                const data = await response.json();

                if (isMounted) {
                    if (data.url) {
                        setStreamUrl(data.url);
                        setExtracting(false);
                    } else {
                        setUseEmbedFallback(true);
                        setExtracting(false);
                    }
                }
            } catch (e: any) {
                if (isMounted) {
                    setUseEmbedFallback(true);
                    setExtracting(false);
                }
            }
        };

        fetchStream();
        return () => { isMounted = false; };
    }, [movie.id, mediaType, season, episode, useEmbedFallback]);

    // 2. Initialize HLS Player with Blob Magic
    useEffect(() => {
        if (useEmbedFallback || !streamUrl || !videoRef.current) return;
        
        const video = videoRef.current;
        if (hlsRef.current) hlsRef.current.destroy();

        if (Hls.isSupported()) {
            const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90,
                xhrSetup: function (xhr: XMLHttpRequest) {
                    // Critical for preventing server-side blocks during playback
                    xhr.setRequestHeader('Referer', 'https://vidsrc.cc/');
                }
            });
            
            hlsRef.current = hls;
            hls.loadSource(streamUrl);
            hls.attachMedia(video); // This creates the 'blob:' URL behavior
            
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                if (settings.playerState?.isPlaying) video.play().catch(() => {});
            });
            
            hls.on(Hls.Events.ERROR, (event: any, data: any) => {
                if (data.fatal) {
                    hls.destroy();
                    setUseEmbedFallback(true);
                }
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = streamUrl;
        }

        const handleTimeUpdate = () => {
            setProgress(video.currentTime);
            setDuration(video.duration || 0);
            setBuffering(false);
            if (video.currentTime > 60 && video.currentTime < 180) setShowSkipIntro(true);
            else setShowSkipIntro(false);
        };
        
        const handleWaiting = () => setBuffering(true);
        const handlePlaying = () => { setIsPlaying(true); setBuffering(false); };
        const handlePause = () => setIsPlaying(false);

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('waiting', handleWaiting);
        video.addEventListener('playing', handlePlaying);
        video.addEventListener('pause', handlePause);
        
        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('waiting', handleWaiting);
            video.removeEventListener('playing', handlePlaying);
            video.removeEventListener('pause', handlePause);
            if (hlsRef.current) hlsRef.current.destroy();
        };
    }, [streamUrl, useEmbedFallback]);

    // 3. Sync Logic & Keyboard Controls (Untouched from original)
    useEffect(() => {
        if (useEmbedFallback || !videoRef.current || !settings.playerState) return;
        const video = videoRef.current;
        const serverState = settings.playerState;
        const drift = Math.abs(video.currentTime - serverState.currentTime);
        if (drift > 2) video.currentTime = serverState.currentTime;

        if (serverState.isPlaying && video.paused) video.play().catch(() => {});
        else if (!serverState.isPlaying && !video.paused) video.pause();
    }, [settings.playerState, useEmbedFallback]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (useEmbedFallback || !hasControl) return;
            switch(e.key.toLowerCase()) {
                case " ": case "k": e.preventDefault(); togglePlay(); break;
                case "f": toggleFullscreen(); break;
                case "m": toggleMute(); break;
                case "arrowright": skip(10); break;
                case "arrowleft": skip(-10); break;
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [hasControl, useEmbedFallback, isPlaying]);

    const togglePlay = () => {
        if (!hasControl) return;
        const newState = !isPlaying;
        onSyncUpdate({ isPlaying: newState, currentTime: videoRef.current?.currentTime || 0 });
    };

    const skip = (amount: number) => {
        if (!hasControl || !videoRef.current) return;
        const newTime = videoRef.current.currentTime + amount;
        videoRef.current.currentTime = newTime;
        onSyncUpdate({ isPlaying, currentTime: newTime });
    };

    const handleSkipIntro = () => {
        if (!hasControl || !videoRef.current) return;
        videoRef.current.currentTime += 85;
        onSyncUpdate({ isPlaying, currentTime: videoRef.current.currentTime });
        setShowSkipIntro(false);
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!hasControl || !videoRef.current) return;
        const time = parseFloat(e.target.value);
        videoRef.current.currentTime = time;
        setProgress(time);
        onSyncUpdate({ isPlaying, currentTime: time });
    };

    const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setVolume(val);
        if (videoRef.current) {
            videoRef.current.volume = val;
            videoRef.current.muted = val === 0;
            setIsMuted(val === 0);
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            const newMute = !videoRef.current.muted;
            videoRef.current.muted = newMute;
            setIsMuted(newMute);
            if (!newMute && volume === 0) {
                setVolume(0.5);
                videoRef.current.volume = 0.5;
            }
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const formatTime = (seconds: number) => {
        if (isNaN(seconds)) return "0:00";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => { if (isPlaying) setShowControls(false); }, 3000);
    };

    if (useEmbedFallback) {
        return (
            <div className="w-full h-full relative bg-black flex flex-col">
                <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/90 to-transparent z-10 flex justify-between items-start pointer-events-none">
                    <div className="pointer-events-auto bg-amber-500/10 border border-amber-500/20 text-amber-500 px-3 py-1.5 rounded-lg backdrop-blur-md flex items-center gap-2">
                        <AlertTriangle size={14}/> 
                        <span className="text-xs font-bold uppercase tracking-wider">Embed Mode</span>
                    </div>
                    <div className="pointer-events-auto flex flex-col items-end gap-2">
                        <div className="bg-black/60 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 text-right">
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Host Time</p>
                            <p className="text-sm font-mono text-white font-bold">{formatTime(settings.playerState?.currentTime || 0)}</p>
                        </div>
                        {hasControl && (
                            <div className="flex gap-2">
                                <button onClick={() => onSyncUpdate({ isPlaying: true, currentTime: settings.playerState?.currentTime || 0 })} className="bg-green-600 text-white p-2 rounded hover:bg-green-500" title="Signal Play"><Play size={14}/></button>
                                <button onClick={() => onSyncUpdate({ isPlaying: false, currentTime: settings.playerState?.currentTime || 0 })} className="bg-red-600 text-white p-2 rounded hover:bg-red-500" title="Signal Pause"><Pause size={14}/></button>
                            </div>
                        )}
                        <p className="text-[10px] text-gray-500 max-w-[150px] text-right text-balance">Syncing is manual in Embed Mode. Use Host Time to coordinate.</p>
                    </div>
                </div>
                <iframe src={getEmbedUrl('cc')} className="w-full h-full border-0" allow="autoplay; fullscreen" allowFullScreen sandbox="allow-scripts allow-same-origin allow-forms allow-presentation" />
                <div className="absolute bottom-4 left-4 z-10 pointer-events-auto">
                    <button onClick={() => setUseEmbedFallback(false)} className="text-xs text-gray-500 hover:text-white underline">Try Native Player Again</button>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="w-full h-full relative group bg-black flex flex-col justify-center overflow-hidden" onMouseMove={handleMouseMove} onMouseLeave={() => isPlaying && setShowControls(false)} onDoubleClick={toggleFullscreen}>
            {extracting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-20">
                    <Loader2 size={48} className="animate-spin text-red-600"/>
                    <p className="text-white font-medium text-sm mt-4 tracking-widest uppercase">Initializing Secure Stream</p>
                    <button onClick={() => setUseEmbedFallback(true)} className="mt-8 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-xs font-bold text-gray-300 transition-colors">Switch to Embed Mode</button>
                </div>
            )}
            <video ref={videoRef} className="w-full h-full object-contain" playsInline onClick={togglePlay} poster={movie.backdrop_path ? `${TMDB_IMAGE_BASE}${movie.backdrop_path}` : undefined} />
            {buffering && !extracting && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="bg-black/50 p-4 rounded-full backdrop-blur-md"><Loader2 size={32} className="animate-spin text-white"/></div>
                </div>
            )}
            {showSkipIntro && !extracting && hasControl && (
                <div className={`absolute bottom-24 right-6 z-20 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                    <button onClick={handleSkipIntro} className="bg-white text-black font-bold px-6 py-2.5 rounded-md shadow-lg flex items-center gap-2 hover:bg-gray-200 transition-all active:scale-95 group/skip">
                        Skip Intro <SkipForward size={16} className="group-hover/skip:translate-x-1 transition-transform"/>
                    </button>
                </div>
            )}
            {!extracting && !useEmbedFallback && (
                <div className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 to-transparent pointer-events-none p-6">
                        <h3 className="text-white font-bold text-lg drop-shadow-md">{movie.title || movie.name}</h3>
                        {mediaType === 'tv' && <p className="text-gray-300 text-xs font-medium">S{season} E{episode}</p>}
                    </div>
                    <div className="px-4 pb-4 pt-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                        <div className="flex items-center gap-4 mb-3 group/timeline">
                            <span className="text-xs font-medium text-gray-300 w-12 text-right">{formatTime(progress)}</span>
                            <div className="relative flex-1 h-1.5 bg-white/20 rounded-full cursor-pointer group-hover/timeline:h-2.5 transition-all">
                                <div className="absolute top-0 left-0 h-full bg-red-600 rounded-full" style={{ width: `${(progress / duration) * 100}%` }} />
                                <input type="range" min="0" max={duration || 100} value={progress} onChange={handleSeek} disabled={!hasControl} className={`absolute inset-0 w-full h-full opacity-0 ${hasControl ? 'cursor-pointer' : 'cursor-not-allowed'}`} />
                            </div>
                            <span className="text-xs font-medium text-gray-300 w-12">{formatTime(duration)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <button onClick={togglePlay} disabled={!hasControl} className={`text-white transition-colors ${!hasControl && 'opacity-50'}`}>
                                    {isPlaying ? <Pause size={28} fill="currentColor"/> : <Play size={28} fill="currentColor"/>}
                                </button>
                                <button onClick={() => skip(-10)} disabled={!hasControl} className="text-gray-300 hover:text-white"><Rewind size={24}/></button>
                                <button onClick={() => skip(10)} disabled={!hasControl} className="text-gray-300 hover:text-white"><FastForward size={24}/></button>
                                <div className="flex items-center gap-2 group/vol">
                                    <button onClick={toggleMute} className="text-gray-300 hover:text-white">{isMuted || volume === 0 ? <VolumeX size={24}/> : <Volume2 size={24}/>}</button>
                                    <div className="w-0 overflow-hidden group-hover/vol:w-24 transition-all duration-300"><input type="range" min="0" max="1" step="0.1" value={isMuted ? 0 : volume} onChange={handleVolume} className="w-20 h-1 bg-white/30 rounded-full appearance-none cursor-pointer accent-red-600" /></div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <button onClick={() => setUseEmbedFallback(true)} className="text-xs font-bold text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors"><Tv size={14}/> Backup Player</button>
                                <button onClick={toggleFullscreen} className="text-white hover:scale-110 transition-transform">{isFullscreen ? <Minimize2 size={24}/> : <Maximize2 size={24}/>}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- WATCH PARTY LOBBY ---
const WatchPartyLobby = ({ userProfile, onJoin, onClose }: { userProfile: UserProfile, onJoin: (p: WatchParty, isHost: boolean) => void, onClose: () => void }) => {
    const [parties, setParties] = useState<WatchParty[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchId, setSearchId] = useState("");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [joinPassword, setJoinPassword] = useState("");
    const [selectedPrivateParty, setSelectedPrivateParty] = useState<WatchParty | null>(null);

    useEffect(() => {
        loadParties();
        const interval = setInterval(loadParties, 10000); 
        return () => clearInterval(interval);
    }, []);

    const loadParties = async () => {
        const res = await getPublicParties();
        setParties(res);
    };

    const handleJoinClick = async (party: WatchParty) => {
        if (party.isPrivate) {
            setSelectedPrivateParty(party);
            setJoinPassword("");
        } else {
            attemptJoin(party.id);
        }
    };

    const attemptJoin = async (id: string, password?: string) => {
        setLoading(true);
        try {
            const party = await joinWatchParty(id, password);
            if (party) onJoin(party, false);
        } catch (e: any) {
            alert(e.message || "Failed to join");
        } finally {
            setLoading(false);
            setSelectedPrivateParty(null);
        }
    };

    const handleSearch = () => {
        if (!searchId) return;
        attemptJoin(searchId.toUpperCase());
    };

    return (
        <div className="w-full h-full p-4 md:p-10 animate-in fade-in overflow-y-auto pb-20">
            <div className="flex justify-between items-center mb-8 text-white">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                        <Users size={32} className="text-amber-500"/> Watch Parties
                    </h1>
                    <p className="text-gray-400 mt-1">Watch movies together with friends across the world.</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X/></button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="space-y-6">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <h3 className="font-bold text-white mb-4">Join by ID</h3>
                        <div className="flex gap-2">
                            <input type="text" value={searchId} onChange={(e) => setSearchId(e.target.value)} placeholder="Enter Room ID..." className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none" />
                            <button onClick={handleSearch} className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-xl transition-colors"><Search size={20}/></button>
                        </div>
                    </div>
                    <button onClick={() => setIsCreateModalOpen(true)} className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-amber-900/20">
                        <Plus size={20}/> Create New Party
                    </button>
                </div>
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-white">Public Parties</h3>
                        <button onClick={loadParties} className="text-xs text-gray-400 hover:text-white">Refresh</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {parties.map(party => (
                            <div key={party.id} className="bg-white/5 border border-white/5 hover:border-amber-500/30 rounded-xl p-4 transition-all hover:bg-white/10 group relative overflow-hidden">
                                <div className="flex justify-between items-start mb-3 text-white">
                                    <div className="min-w-0 pr-2">
                                        <h4 className="font-bold text-lg truncate">{party.name}</h4>
                                        <p className="text-xs text-gray-400 flex items-center gap-1">Host: <span className="text-white truncate">{party.hostName}</span></p>
                                    </div>
                                    {party.isPrivate ? <Lock size={14} className="text-red-400"/> : <Unlock size={14} className="text-green-400"/>}
                                </div>
                                {party.movie ? (
                                    <div className="flex items-center gap-3 mb-4 bg-black/20 p-2 rounded-lg">
                                        <img src={`${TMDB_IMAGE_BASE}${party.movie.poster_path}`} className="w-8 h-12 object-cover rounded" alt=""/>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-white truncate">{party.movie.title}</p>
                                            <p className="text-[10px] text-gray-500">Now Playing</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mb-4 p-2 bg-black/20 rounded-lg text-center">
                                        <p className="text-xs text-gray-500 italic">Selecting Content...</p>
                                    </div>
                                )}
                                <div className="flex items-center justify-between mt-auto">
                                    <span className="text-xs text-gray-500">Live Now</span>
                                    <button onClick={() => handleJoinClick(party)} className="bg-white text-black text-xs font-bold px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">Join Party</button>
                                </div>
                            </div>
                        ))}
                        {parties.length === 0 && <div className="col-span-full py-12 text-center text-gray-500 border border-dashed border-white/10 rounded-xl">No active public parties.</div>}
                    </div>
                </div>
            </div>
            {isCreateModalOpen && <CreatePartyModal userProfile={userProfile} onClose={() => setIsCreateModalOpen(false)} onCreate={(party) => { setIsCreateModalOpen(false); onJoin(party, true); }} />}
            {selectedPrivateParty && (
                <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
                        <h3 className="font-bold text-white mb-4 text-center uppercase tracking-widest text-xs">Room Password</h3>
                        <input type="password" value={joinPassword} onChange={(e) => setJoinPassword(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white mb-4 outline-none focus:border-amber-500" placeholder="Enter password..." />
                        <div className="flex gap-3"><button onClick={() => setSelectedPrivateParty(null)} className="flex-1 py-3 text-white font-bold hover:bg-white/5 rounded-xl">Cancel</button><button onClick={() => attemptJoin(selectedPrivateParty.id, joinPassword)} className="flex-1 py-3 bg-amber-500 rounded-xl text-black font-bold">{loading ? '...' : 'Join'}</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- CREATE MODAL ---
const CreatePartyModal = ({ userProfile, onClose, onCreate }: { userProfile: UserProfile, onClose: () => void, onCreate: (p: WatchParty) => void }) => {
    const [name, setName] = useState(`${userProfile.name}'s Party`);
    const [isPrivate, setIsPrivate] = useState(false);
    const [password, setPassword] = useState("");
    const [creating, setCreating] = useState(false);

    const handleSubmit = async () => {
        if (!name) return;
        setCreating(true);
        try {
            const party = await createWatchParty(name, isPrivate, password, userProfile.name);
            onCreate(party);
        } catch (e: any) { alert(e.message || "Failed to create party"); } 
        finally { setCreating(false); }
    };

    return (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <div className="flex justify-between items-center mb-6 text-white"><h3 className="text-xl font-bold">New Watch Party</h3><button onClick={onClose}><X size={20}/></button></div>
                <div className="space-y-4">
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Party Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white mt-1 outline-none" /></div>
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                        <div className="text-white text-sm">
                            <p className="font-bold">{isPrivate ? "Private Party" : "Public Party"}</p>
                            <p className="text-xs text-gray-500">{isPrivate ? "Password Required" : "Open access"}</p>
                        </div>
                        <button onClick={() => setIsPrivate(!isPrivate)} className={`w-12 h-6 rounded-full relative transition-colors ${isPrivate ? 'bg-amber-500' : 'bg-white/20'}`}><div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${isPrivate ? 'translate-x-6' : 'translate-x-0'}`}></div></button>
                    </div>
                    {isPrivate && <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white" placeholder="Set Room Password" />}
                    <button onClick={handleSubmit} disabled={creating} className="w-full bg-amber-500 py-4 rounded-xl text-black font-bold uppercase tracking-widest">{creating ? 'Creating...' : 'Start Party'}</button>
                </div>
            </div>
        </div>
    );
};

// --- ROOM COMPONENT ---
const WatchPartyRoom = ({ party, isHost, userProfile, apiKey, onLeave }: { party: WatchParty, isHost: boolean, userProfile: UserProfile, apiKey: string, onLeave: () => void }) => {
    const [activeParty, setActiveParty] = useState(party);
    const [messages, setMessages] = useState<PartyMessage[]>([]);
    const [inputMsg, setInputMsg] = useState("");
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
    const [showSearch, setShowSearch] = useState(!party.movie && isHost);
    const [viewers, setViewers] = useState<any[]>([]);
    const [copiedId, setCopiedId] = useState(false);
    const [activeTab, setActiveTab] = useState<'chat' | 'members'>('chat');
    
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Movie[]>([]);

    const isOwner = userProfile.name === activeParty.hostName;
    const isCoHost = activeParty.settings.coHosts?.includes(userProfile.name);
    const hasControl = isOwner || isCoHost || activeParty.settings.allowControls;

    useEffect(() => {
        setMessages([{ id: 'sys-1', user: 'System', text: `Welcome to ${party.name}!`, timestamp: '', isSystem: true }]);
        const unsubscribe = subscribeToParty(party.id, userProfile, {
            onMessage: (msg) => {
                if (msg.text.startsWith('CMD:KICK:')) {
                    const target = msg.text.split(':')[2];
                    if (target === userProfile.name) { alert("You have been kicked."); onLeave(); }
                    return;
                }
                setMessages(prev => [...prev, msg]);
            },
            onUpdate: (updated) => {
                setActiveParty(prev => ({ ...prev, ...updated, movie: updated.movie || prev.movie }));
                if (updated.movie) setShowSearch(false);
            },
            onViewersUpdate: (count, list) => setViewers(list),
            onDelete: () => { alert("Host closed the party."); onLeave(); }
        });
        sendPartyMessage(party.id, "System", `${userProfile.name} joined.`, true);
        return () => { unsubscribe(); };
    }, []);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputMsg.trim()) return;
        sendPartyMessage(party.id, userProfile.name, inputMsg);
        setInputMsg("");
    };

    const handleMovieSelect = (m: Movie) => {
        const newSettings = { ...activeParty.settings, mediaParams: { season: 1, episode: 1 } };
        updatePartyMovie(party.id, m);
        updatePartySettings(party.id, newSettings);
        setShowSearch(false);
        sendPartyMessage(party.id, "System", `${userProfile.name} changed movie to: ${m.title || m.name}`, true);
    };

    const handleSearchMovies = async (q: string) => {
        setSearchQuery(q);
        if (q.length > 2) {
            const res = await fetch(`${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(q)}`);
            const data = await res.json();
            setSearchResults(data.results || []);
        }
    };

    const toggleSetting = (key: 'allowChat' | 'allowControls') => {
        const newSettings = { ...activeParty.settings, [key]: !activeParty.settings[key] };
        updatePartySettings(party.id, newSettings);
        sendPartyMessage(party.id, "System", `Host ${newSettings[key] ? 'enabled' : 'disabled'} ${key === 'allowChat' ? 'chat' : 'public controls'}.`, true);
    };

    const handlePromote = (userName: string) => {
        const currentHosts = activeParty.settings.coHosts || [];
        const newHosts = currentHosts.includes(userName) ? currentHosts.filter(h => h !== userName) : [...currentHosts, userName];
        updatePartySettings(party.id, { ...activeParty.settings, coHosts: newHosts });
        sendPartyMessage(party.id, "System", `${userName} is ${currentHosts.includes(userName) ? 'demoted' : 'promoted to co-host'}.`, true);
    };

    const handleKick = (userName: string) => {
        if (confirm(`Kick ${userName}?`)) sendPartyMessage(party.id, "System", `CMD:KICK:${userName}`, true);
    };

    const handleDeleteParty = async () => {
        if (confirm("Permanently close this party?")) {
            await deleteWatchParty(party.id);
            onLeave();
        }
    };

    const handleSyncUpdate = (state: { isPlaying: boolean, currentTime: number }) => {
        const newSettings = { ...activeParty.settings, playerState: { ...state, updatedAt: Date.now() } };
        updatePartySettings(party.id, newSettings);
    };

    return (
        <div className="flex flex-col md:flex-row h-full md:h-[calc(100vh-4rem)] bg-black overflow-hidden relative">
            <div className="flex-1 flex flex-col relative w-full h-full">
                <div className="bg-white/5 border-b border-white/5 p-4 flex justify-between items-center z-10 text-white shadow-xl backdrop-blur-sm">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <button onClick={onLeave} className="p-2 hover:bg-white/10 rounded-full shrink-0 transition-colors"><X size={20}/></button>
                        <div className="min-w-0">
                            <h2 className="font-bold text-sm md:text-base truncate flex items-center gap-2">
                                {activeParty.name} 
                                <button onClick={() => { navigator.clipboard.writeText(party.id); setCopiedId(true); setTimeout(() => setCopiedId(false), 2000); }} className="text-[10px] bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded font-mono hover:bg-amber-500/30 transition-colors">
                                    ID: {activeParty.id} {copiedId ? <Check size={10}/> : <Copy size={10}/>}
                                </button>
                            </h2>
                            <p className="text-[10px] text-gray-500 truncate">{viewers.length} Live • Host: {activeParty.hostName}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {(isOwner || isCoHost) && <button onClick={() => setShowSearch(!showSearch)} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"><Film size={14}/> Movie</button>}
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-2 rounded-lg transition-colors ${isSidebarOpen ? 'bg-amber-500 text-black' : 'bg-white/10 text-white'}`}><Menu size={18}/></button>
                    </div>
                </div>

                <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                    {activeParty.movie ? (
                        <SynchronizedPlayer 
                            partyId={activeParty.id} movie={activeParty.movie} isHost={isHost} 
                            hasControl={hasControl} settings={activeParty.settings} onSyncUpdate={handleSyncUpdate}
                        />
                    ) : (
                        <div className="text-center text-gray-500 animate-pulse">
                            <MonitorPlay size={64} className="mx-auto mb-4 opacity-20"/>
                            <p className="font-medium tracking-wide">Waiting for host to choose a movie...</p>
                        </div>
                    )}

                    {showSearch && (
                        <div className="absolute inset-0 z-[60] bg-black/95 backdrop-blur-md p-8 flex flex-col animate-in fade-in">
                            <div className="max-w-3xl mx-auto w-full flex flex-col h-full">
                                <div className="flex justify-between items-center mb-6 text-white"><h3 className="text-xl font-bold">Select Movie or TV Show</h3><button onClick={() => setShowSearch(false)} className="hover:text-amber-500 transition-colors"><X size={24}/></button></div>
                                <div className="relative mb-6">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"/>
                                    <input autoFocus type="text" className="w-full bg-white/10 border border-white/10 rounded-2xl py-5 pl-14 text-white outline-none focus:border-amber-500 transition-all text-lg" placeholder="Search content by title..." value={searchQuery} onChange={(e) => handleSearchMovies(e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 overflow-y-auto custom-scrollbar flex-1 pb-10 pr-2">
                                    {searchResults.map(m => (
                                        <div key={m.id} onClick={() => handleMovieSelect(m)} className="cursor-pointer group">
                                            <div className="aspect-[2/3] rounded-xl overflow-hidden bg-white/5 relative border border-white/5 group-hover:border-amber-500/50 transition-all">
                                                <img src={`${TMDB_IMAGE_BASE}${m.poster_path}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Play className="fill-white text-white" size={32}/></div>
                                            </div>
                                            <p className="text-xs font-bold text-gray-300 mt-3 truncate group-hover:text-white">{m.title || m.name}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* SIDEBAR */}
            <div className={`fixed inset-0 top-[60px] md:relative md:w-85 bg-[#0a0a0a] border-l border-white/5 transform transition-transform duration-300 z-20 flex flex-col shadow-2xl ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:hidden'}`}>
                <div className="flex border-b border-white/5 shrink-0 bg-white/2">
                    <button onClick={() => setActiveTab('chat')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-colors ${activeTab === 'chat' ? 'text-amber-500 border-b-2 border-amber-500 bg-white/5' : 'text-gray-500 hover:text-white'}`}>Chat Box</button>
                    <button onClick={() => setActiveTab('members')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-colors ${activeTab === 'members' ? 'text-amber-500 border-b-2 border-amber-500 bg-white/5' : 'text-gray-500 hover:text-white'}`}>People ({viewers.length})</button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col relative">
                    {activeTab === 'chat' ? (
                        <>
                            <div className="flex-1 space-y-5 mb-5">
                                {messages.map((msg, i) => (
                                    <div key={i} className={`flex flex-col ${msg.isSystem ? 'items-center' : 'items-start'}`}>
                                        {msg.isSystem ? <span className="text-[9px] font-bold uppercase tracking-tighter bg-white/5 text-gray-500 px-3 py-1 rounded-full my-3 border border-white/5">{msg.text}</span> : (
                                            <div className="w-full">
                                                <div className="flex items-baseline gap-2 mb-1"><span className={`text-[11px] font-black ${msg.user === userProfile.name ? 'text-amber-500' : 'text-gray-400'} ${activeParty.hostName === msg.user ? 'text-red-500' : ''}`}>{msg.user}</span><span className="text-[9px] text-gray-700">{msg.timestamp}</span></div>
                                                <p className="text-sm text-gray-300 bg-white/5 p-3 rounded-2xl rounded-tl-none break-words leading-relaxed border border-white/5">{msg.text}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <form onSubmit={handleSendMessage} className="relative mt-auto pt-3">
                                <input type="text" value={inputMsg} onChange={(e) => setInputMsg(e.target.value)} disabled={!activeParty.settings.allowChat && !hasControl} placeholder={activeParty.settings.allowChat || hasControl ? "Send a message..." : "Chat disabled"} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-5 pr-14 text-sm text-white outline-none focus:border-amber-500/50 transition-all placeholder:text-gray-600" />
                                <button type="submit" className="absolute right-3 top-[25px] text-amber-500 hover:scale-110 transition-transform disabled:opacity-30" disabled={!inputMsg.trim() || (!activeParty.settings.allowChat && !hasControl)}><Send size={20}/></button>
                            </form>
                        </>
                    ) : (
                        <div className="space-y-4">
                            {viewers.map((viewer, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white/3 p-4 rounded-2xl border border-white/5 hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-black border border-white/10 flex items-center justify-center font-bold text-gray-400">{viewer.user.charAt(0)}</div>
                                        <div><p className="text-sm font-bold text-white flex items-center gap-2">{viewer.user} {viewer.user === activeParty.hostName && <Crown size={12} className="text-amber-500 fill-amber-500"/>}</p><p className="text-[10px] text-gray-600 uppercase font-black">Member</p></div>
                                    </div>
                                    {isOwner && viewer.user !== userProfile.name && (
                                        <div className="flex gap-2">
                                            <button onClick={() => handlePromote(viewer.user)} className="p-2 hover:bg-amber-500 hover:text-black rounded-lg transition-all text-gray-500" title="Promote"><UserPlus size={16}/></button>
                                            <button onClick={() => handleKick(viewer.user)} className="p-2 hover:bg-red-600 hover:text-white rounded-lg transition-all text-gray-500" title="Kick"><LogOut size={16}/></button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {hasControl && (
                    <div className="border-t border-white/10 bg-black/40 p-6 shrink-0 backdrop-blur-md">
                        <div className="flex justify-between items-center mb-5 text-white"><h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><ShieldAlert size={12}/> Host Panel</h4>{isOwner && <button onClick={handleDeleteParty} className="text-[10px] text-red-500 font-black hover:scale-105 transition-transform uppercase">Destroy Party</button>}</div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs font-bold text-gray-400"><span>Allow Public Chat</span><button onClick={() => toggleSetting('allowChat')} className={`w-10 h-5 rounded-full transition-all relative ${activeParty.settings.allowChat ? 'bg-green-500' : 'bg-gray-800'}`}><div className={`absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all ${activeParty.settings.allowChat ? 'right-0.5' : 'left-0.5'}`}></div></button></div>
                            <div className="flex justify-between items-center text-xs font-bold text-gray-400"><span>Allow Member Controls</span><button onClick={() => toggleSetting('allowControls')} className={`w-10 h-5 rounded-full transition-all relative ${activeParty.settings.allowControls ? 'bg-green-500' : 'bg-gray-800'}`}><div className={`absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all ${activeParty.settings.allowControls ? 'right-0.5' : 'left-0.5'}`}></div></button></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};