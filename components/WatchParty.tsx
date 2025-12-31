
import React, { useState, useEffect, useRef } from 'react';
import { Users, Search, Plus, Lock, Unlock, LogIn, MessageSquare, Send, Settings, Play, Pause, X, Loader2, Film, Crown, Check, Share2, Copy, Menu, UserPlus, UserMinus, ShieldAlert, LogOut, ChevronDown, MonitorPlay, Maximize2, Minimize2, Volume2, VolumeX, FastForward, Rewind, RefreshCcw, AlertTriangle, Link as LinkIcon } from 'lucide-react';
import { WatchParty, UserProfile, Movie, PartyMessage, PartySettings } from '../types';
import { createWatchParty, joinWatchParty, getPublicParties, updatePartySettings, updatePartyMovie, subscribeToParty, sendPartyMessage, deleteWatchParty } from '../services/supabase';
import { TMDB_IMAGE_BASE, TMDB_BASE_URL } from './Shared';

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

// --- SYNCHRONIZED PLAYER COMPONENT (Real Stream Extraction) ---
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
    const [streamUrl, setStreamUrl] = useState<string>("");
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    
    // Extraction State
    const [extracting, setExtracting] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [manualUrl, setManualUrl] = useState("");
    const [showManualInput, setShowManualInput] = useState(false);
    
    const controlsTimeoutRef = useRef<any>(null);
    const hlsRef = useRef<any>(null);

    // Get active season/episode from party settings or default to 1/1
    const season = settings.mediaParams?.season || 1;
    const episode = settings.mediaParams?.episode || 1;
    const mediaType = movie.media_type === 'tv' || movie.first_air_date ? 'tv' : 'movie';

    // 1. Stream Extraction Logic
    useEffect(() => {
        let isMounted = true;
        
        const fetchStream = async () => {
            setExtracting(true);
            setError(null);
            setStreamUrl("");
            
            try {
                // Try scraping via a few known open embeds
                // Using corsproxy.io to bypass CORS headers on the embed page itself.
                // We attempt multiple sources in order.
                const sources = [
                    // Source 1: vidsrc.cc (v2)
                    mediaType === 'movie' 
                        ? `https://vidsrc.cc/v2/embed/movie/${movie.id}`
                        : `https://vidsrc.cc/v2/embed/tv/${movie.id}/${season}/${episode}`,
                    // Source 2: vidsrc.xyz (often cleaner)
                    mediaType === 'movie'
                        ? `https://vidsrc.xyz/embed/movie/${movie.id}`
                        : `https://vidsrc.xyz/embed/tv/${movie.id}/${season}/${episode}`,
                    // Source 3: Pro (backup)
                    mediaType === 'movie'
                        ? `https://vidsrc.pro/embed/movie/${movie.id}`
                        : `https://vidsrc.pro/embed/tv/${movie.id}/${season}/${episode}`
                ];

                let foundStream = "";

                for (const source of sources) {
                    if (foundStream) break;
                    if (!isMounted) break;
                    
                    try {
                        console.log(`[Player] Attempting extract from: ${source}`);
                        // Use corsproxy.io which is robust for this
                        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(source)}`;
                        const response = await fetch(proxyUrl);
                        if (!response.ok) continue;
                        
                        const html = await response.text();
                        
                        // Look for .m3u8 patterns
                        // 1. Standard file: "..." or source: "..."
                        // 2. Encoded or obfuscated strings often start with http and end with m3u8
                        const patterns = [
                            /file:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/, 
                            /source:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/,
                            /src:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/,
                            /(https?:\/\/[a-zA-Z0-9\-_./]+\.m3u8[^"'\s]*)/
                        ];

                        for (const pattern of patterns) {
                            const match = html.match(pattern);
                            if (match && match[1]) {
                                // Sometimes the match includes extra garbage, simple clean
                                let candidate = match[1];
                                if (!candidate.startsWith('http')) continue;
                                foundStream = candidate;
                                break;
                            }
                        }
                    } catch (err) {
                        console.warn(`Failed source ${source}`, err);
                    }
                }

                if (foundStream) {
                    if (isMounted) {
                        console.log("[Player] Manifest found:", foundStream);
                        setStreamUrl(foundStream);
                        setExtracting(false);
                    }
                } else {
                    throw new Error("Could not auto-extract stream.");
                }

            } catch (e: any) {
                if (isMounted) {
                    console.error("[Player] Extraction failed", e);
                    setError("Could not automatically find the stream link.");
                    setExtracting(false);
                }
            }
        };

        fetchStream();

        return () => { isMounted = false; };
    }, [movie.id, mediaType, season, episode, retryCount]);

    // 2. Initialize Player (Hls.js)
    useEffect(() => {
        if (!streamUrl || !videoRef.current) return;
        
        const video = videoRef.current;
        const Hls = (window as any).Hls;

        // Cleanup previous instance
        if (hlsRef.current) {
            hlsRef.current.destroy();
        }

        if (Hls && Hls.isSupported()) {
            const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                // Add some buffer config to smooth out playback
                maxBufferLength: 30,
                maxMaxBufferLength: 600,
            });
            
            hlsRef.current = hls;
            
            // "The Handshake" & "The Injection"
            hls.loadSource(streamUrl);
            hls.attachMedia(video);
            
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                if (settings.playerState?.isPlaying) {
                    video.play().catch(() => {});
                }
            });
            
            hls.on(Hls.Events.ERROR, (event: any, data: any) => {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.error("Network error, trying to recover...");
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.error("Media error, trying to recover...");
                            hls.recoverMediaError();
                            break;
                        default:
                            // If it fails fatallly, we show error
                            // Often due to CORS on the .ts chunks themselves
                            setError("Stream blocked by provider (CORS).");
                            hls.destroy();
                            break;
                    }
                }
            });

        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS (Safari)
            video.src = streamUrl;
        }

        const handleTimeUpdate = () => {
            setProgress(video.currentTime);
            setDuration(video.duration || 0);
        };
        
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        
        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            if (hlsRef.current) hlsRef.current.destroy();
        };
    }, [streamUrl]);

    // 3. Sync Logic (Incoming from Server)
    useEffect(() => {
        if (!videoRef.current || !settings.playerState) return;
        
        const video = videoRef.current;
        const serverState = settings.playerState;
        
        // Calculate drift
        const drift = Math.abs(video.currentTime - serverState.currentTime);
        
        // Sync Time if drift > 2s to avoid jitter
        if (drift > 2) {
            video.currentTime = serverState.currentTime;
        }

        // Sync State
        if (serverState.isPlaying && video.paused) {
            video.play().catch(() => {});
        } else if (!serverState.isPlaying && !video.paused) {
            video.pause();
        }

    }, [settings.playerState]);

    // 4. Controls Logic (Outgoing to Server)
    const togglePlay = () => {
        if (!hasControl) return;
        const video = videoRef.current;
        if (!video) return;

        const newState = !video.paused;
        if (newState) {
            video.pause();
        } else {
            video.play().catch(() => {});
        }
        
        onSyncUpdate({
            isPlaying: !newState,
            currentTime: video.currentTime
        });
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!hasControl) return;
        const time = parseFloat(e.target.value);
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            setProgress(time);
        }
        onSyncUpdate({
            isPlaying: !videoRef.current?.paused,
            currentTime: time
        });
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
            setIsMuted(!isMuted);
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            videoRef.current?.parentElement?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const handleManualSubmit = () => {
        if (manualUrl) {
            setStreamUrl(manualUrl);
            setError(null);
            setExtracting(false);
        }
    };

    const formatTime = (seconds: number) => {
        if (isNaN(seconds)) return "0:00";
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    };

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) setShowControls(false);
        }, 3000);
    };

    return (
        <div 
            className="w-full h-full relative group bg-black flex flex-col justify-center overflow-hidden" 
            onMouseMove={handleMouseMove} 
            onMouseLeave={() => isPlaying && setShowControls(false)}
        >
            {extracting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-20">
                    <Loader2 size={48} className="animate-spin text-amber-500 mb-4"/>
                    <div className="flex flex-col items-center space-y-2">
                        <p className="text-amber-500 font-mono text-sm animate-pulse font-bold tracking-widest">SCANNING SOURCES...</p>
                        <p className="text-gray-500 text-xs">Looking for manifest: {mediaType.toUpperCase()} {movie.id}</p>
                    </div>
                </div>
            )}

            {error && !extracting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-20 p-6 text-center">
                    <AlertTriangle size={48} className="text-red-500 mb-4"/>
                    <h3 className="text-xl font-bold text-white mb-2">Stream Unavailable</h3>
                    <p className="text-gray-400 text-sm max-w-md mb-6">{error} Client-side extraction is limited.</p>
                    <div className="flex flex-col gap-3 w-full max-w-xs">
                        <button 
                            onClick={() => setRetryCount(prev => prev + 1)}
                            className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                        >
                            <RefreshCcw size={18}/> Retry Scan
                        </button>
                        <button 
                            onClick={() => setShowManualInput(!showManualInput)}
                            className="w-full py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                        >
                            <LinkIcon size={18}/> {showManualInput ? "Hide Input" : "Paste HLS Link"}
                        </button>
                    </div>
                    
                    {showManualInput && (
                        <div className="mt-4 w-full max-w-md animate-in slide-in-from-bottom-2">
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={manualUrl}
                                    onChange={(e) => setManualUrl(e.target.value)}
                                    placeholder="https://example.com/video.m3u8" 
                                    className="flex-1 bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 outline-none"
                                />
                                <button onClick={handleManualSubmit} className="bg-amber-500 text-black px-4 py-2 rounded-lg font-bold hover:bg-amber-400">Play</button>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2 text-left">Advanced: Open Developer Tools on the provider site, go to Network tab, filter by "m3u8", copy link.</p>
                        </div>
                    )}
                </div>
            )}

            <video 
                ref={videoRef}
                className="w-full h-full object-contain"
                playsInline
                autoPlay={false} // Managed by sync
                onClick={togglePlay}
                poster={movie.backdrop_path ? `${TMDB_IMAGE_BASE}${movie.backdrop_path}` : undefined}
            />

            {/* Controls Overlay */}
            {!extracting && !error && (
                <div className={`absolute inset-0 bg-black/40 flex flex-col justify-end transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                    {/* Center Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                         {!isPlaying && (
                             <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 shadow-2xl animate-in zoom-in pointer-events-auto cursor-pointer hover:scale-110 transition-transform" onClick={togglePlay}>
                                 <Play size={40} className="text-white ml-2" fill="currentColor"/>
                             </div>
                         )}
                    </div>

                    <div className="p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-20">
                        {/* Timeline */}
                        <div className="flex items-center gap-4 mb-2">
                            <span className="text-xs font-mono text-white/80 w-12 text-right">{formatTime(progress)}</span>
                            <div className="relative flex-1 h-1.5 bg-white/20 rounded-full group/timeline">
                                <div className="absolute top-0 left-0 h-full bg-amber-500 rounded-full" style={{ width: `${(progress / duration) * 100}%` }}></div>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max={duration || 100} 
                                    value={progress} 
                                    onChange={handleSeek}
                                    disabled={!hasControl}
                                    className={`absolute inset-0 w-full h-full opacity-0 ${hasControl ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                                />
                            </div>
                            <span className="text-xs font-mono text-white/50 w-12">{formatTime(duration)}</span>
                        </div>

                        {/* Bottom Bar */}
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <button onClick={togglePlay} disabled={!hasControl} className={`text-white hover:text-amber-500 transition-colors ${!hasControl && 'opacity-50 cursor-not-allowed'}`}>
                                    {isPlaying ? <Pause size={24} fill="currentColor"/> : <Play size={24} fill="currentColor"/>}
                                </button>
                                <button onClick={toggleMute} className="text-white hover:text-amber-500 transition-colors">
                                    {isMuted ? <VolumeX size={20}/> : <Volume2 size={20}/>}
                                </button>
                                <div className="flex items-center gap-2 border-l border-white/20 pl-4 ml-2">
                                    {hasControl ? (
                                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                                            <Crown size={10}/> CONTROLLER
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-bold text-gray-400">VIEWER</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {mediaType === 'tv' && (
                                    <div className="text-xs font-mono text-white/60 bg-white/5 px-2 py-1 rounded border border-white/5">
                                        S{season} E{episode}
                                    </div>
                                )}
                                <button onClick={toggleFullscreen} className="text-white hover:text-amber-500 transition-colors">
                                    {isFullscreen ? <Minimize2 size={20}/> : <Maximize2 size={20}/>}
                                </button>
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
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                        <Users size={32} className="text-amber-500"/> Watch Parties
                    </h1>
                    <p className="text-gray-400 mt-1 text-sm md:text-base">Watch movies together with friends across the world.</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white"><X/></button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Actions */}
                <div className="space-y-6">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <h3 className="font-bold text-white mb-4">Join by ID</h3>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={searchId}
                                onChange={(e) => setSearchId(e.target.value)}
                                placeholder="Enter Room ID..." 
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none"
                            />
                            <button onClick={handleSearch} className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-xl transition-colors"><Search size={20}/></button>
                        </div>
                    </div>

                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-bold py-4 rounded-2xl shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2 transition-transform active:scale-95"
                    >
                        <Plus size={20}/> Create New Party
                    </button>
                </div>

                {/* Right: Party List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-white">Public Parties</h3>
                        <button onClick={loadParties} className="text-xs text-gray-400 hover:text-white">Refresh</button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {parties.map(party => (
                            <div key={party.id} className="bg-white/5 border border-white/5 hover:border-amber-500/30 rounded-xl p-4 transition-all hover:bg-white/10 group relative overflow-hidden">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="min-w-0 pr-2">
                                        <h4 className="font-bold text-white text-lg truncate">{party.name}</h4>
                                        <p className="text-xs text-gray-400 flex items-center gap-1">Host: <span className="text-white truncate">{party.hostName}</span></p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {party.isPrivate ? <Lock size={14} className="text-red-400"/> : <Unlock size={14} className="text-green-400"/>}
                                        <span className="bg-black/40 px-2 py-1 rounded text-xs font-mono text-gray-300 hidden sm:inline-block">ID: {party.id}</span>
                                    </div>
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
                                        <p className="text-xs text-gray-500 italic">In Lobby - Selecting Movie</p>
                                    </div>
                                )}

                                <div className="flex items-center justify-between mt-auto">
                                    <span className="text-xs text-gray-500 flex items-center gap-1">Live Now</span>
                                    <button 
                                        onClick={() => handleJoinClick(party)}
                                        className="bg-white text-black text-xs font-bold px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                                    >
                                        Join <LogIn size={14}/>
                                    </button>
                                </div>
                            </div>
                        ))}
                        {parties.length === 0 && (
                            <div className="col-span-full py-12 text-center text-gray-500 border border-dashed border-white/10 rounded-xl">
                                No active public parties. Start one!
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isCreateModalOpen && (
                <CreatePartyModal 
                    userProfile={userProfile} 
                    onClose={() => setIsCreateModalOpen(false)}
                    onCreate={(party) => { setIsCreateModalOpen(false); onJoin(party, true); }}
                />
            )}

            {selectedPrivateParty && (
                <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
                        <h3 className="font-bold text-white mb-4">Enter Password</h3>
                        <p className="text-sm text-gray-400 mb-4">This room is locked.</p>
                        <input 
                            type="password" 
                            value={joinPassword}
                            onChange={(e) => setJoinPassword(e.target.value)}
                            placeholder="Password" 
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white mb-4 focus:border-amber-500 outline-none"
                        />
                        <div className="flex gap-3">
                            <button onClick={() => setSelectedPrivateParty(null)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-colors">Cancel</button>
                            <button onClick={() => attemptJoin(selectedPrivateParty.id, joinPassword)} className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold transition-colors" disabled={loading}>{loading ? 'Joining...' : 'Join'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

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
        } catch (e: any) {
            console.error(e);
            alert(e.message || "Failed to create party. Check DB setup.");
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">Create Watch Party</h3>
                    <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-white"/></button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Party Name</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white mt-1 focus:border-amber-500 outline-none"/>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                        <div className="flex items-center gap-3">
                            {isPrivate ? <Lock className="text-red-400"/> : <Unlock className="text-green-400"/>}
                            <div>
                                <p className="text-sm font-bold text-white">{isPrivate ? "Private Room" : "Public Room"}</p>
                                <p className="text-xs text-gray-500">{isPrivate ? "Requires password to join" : "Visible to everyone"}</p>
                            </div>
                        </div>
                        <button onClick={() => setIsPrivate(!isPrivate)} className={`w-12 h-6 rounded-full relative transition-colors ${isPrivate ? 'bg-amber-500' : 'bg-white/20'}`}>
                            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${isPrivate ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </button>
                    </div>

                    {isPrivate && (
                        <div className="animate-in slide-in-from-top-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">Set Password</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white mt-1 focus:border-amber-500 outline-none" placeholder="Secret Code"/>
                        </div>
                    )}

                    <button 
                        onClick={handleSubmit} 
                        disabled={creating}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 rounded-xl mt-4 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        {creating ? <Loader2 className="animate-spin"/> : <Check/>} Create Party
                    </button>
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
                    if (target === userProfile.name) {
                        alert("You have been kicked from the party.");
                        onLeave();
                    }
                    return;
                }
                setMessages(prev => [...prev, msg]);
            },
            onUpdate: (updatedFields) => {
                setActiveParty(prev => ({
                    ...prev,
                    ...updatedFields,
                    movie: updatedFields.movie || prev.movie
                }));
                if (updatedFields.movie) setShowSearch(false);
            },
            onViewersUpdate: (count, list) => {
                setViewers(list);
            },
            onDelete: () => {
                alert("The host has closed the party.");
                onLeave();
            }
        });

        sendPartyMessage(party.id, "System", `${userProfile.name} joined.`, true);

        return () => {
            unsubscribe();
        };
    }, []);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputMsg.trim()) return;
        sendPartyMessage(party.id, userProfile.name, inputMsg);
        setInputMsg("");
    };

    const handleMovieSelect = (m: Movie) => {
        // Reset media params to start of movie/series
        const newSettings = { ...activeParty.settings, mediaParams: { season: 1, episode: 1 } };
        
        // Optimistic update for local UI speed
        updatePartyMovie(party.id, m);
        updatePartySettings(party.id, newSettings);
        
        setShowSearch(false);
        sendPartyMessage(party.id, "System", `${userProfile.name} changed the movie to: ${m.title || m.name}`, true);
    };

    const handleSearchMovies = async (q: string) => {
        setSearchQuery(q);
        if (q.length > 2) {
            const res = await fetch(`${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(q)}`);
            const data = await res.json();
            // Also fetch TV shows if needed, but for now stick to movies as per search endpoint
            // To support both, we'd need multi-search.
            setSearchResults(data.results || []);
        }
    };

    const toggleSetting = (key: 'allowChat' | 'allowControls') => {
        const newSettings = { ...activeParty.settings, [key]: !activeParty.settings[key] };
        updatePartySettings(party.id, newSettings);
        sendPartyMessage(party.id, "System", `Host ${newSettings[key] ? 'enabled' : 'disabled'} ${key === 'allowChat' ? 'chat' : 'member controls'}.`, true);
    };

    const handlePromote = (userName: string) => {
        const currentHosts = activeParty.settings.coHosts || [];
        const newHosts = currentHosts.includes(userName) 
            ? currentHosts.filter(h => h !== userName) 
            : [...currentHosts, userName];
        
        updatePartySettings(party.id, { ...activeParty.settings, coHosts: newHosts });
        sendPartyMessage(party.id, "System", `${userName} is ${currentHosts.includes(userName) ? 'no longer' : 'now'} a co-host.`, true);
    };

    const handleKick = (userName: string) => {
        if (!confirm(`Kick ${userName}?`)) return;
        sendPartyMessage(party.id, "System", `CMD:KICK:${userName}`, true);
        sendPartyMessage(party.id, "System", `${userName} was kicked by host.`, true);
    };

    const handleDeleteParty = async () => {
        if (confirm("Are you sure you want to close this party for everyone?")) {
            await deleteWatchParty(party.id);
            onLeave();
        }
    };

    const copyInvite = () => {
        navigator.clipboard.writeText(party.id);
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
    };

    // Callback for SynchronizedPlayer to update DB
    const handleSyncUpdate = (state: { isPlaying: boolean, currentTime: number }) => {
        const newSettings = {
            ...activeParty.settings,
            playerState: {
                ...state,
                updatedAt: Date.now()
            }
        };
        updatePartySettings(party.id, newSettings);
    };

    return (
        <div className="flex flex-col md:flex-row h-full md:h-[calc(100vh-4rem)] bg-black overflow-hidden relative">
            {/* Main Content (Player) */}
            <div className="flex-1 flex flex-col relative w-full h-full">
                {/* Header Overlay */}
                <div className="bg-white/5 border-b border-white/5 p-3 md:p-4 flex justify-between items-center z-10 shrink-0">
                    <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
                        <button onClick={onLeave} className="p-2 hover:bg-white/10 rounded-full transition-colors shrink-0"><X size={20}/></button>
                        <div className="min-w-0">
                            <h2 className="font-bold text-white flex items-center gap-2 text-sm md:text-base truncate">
                                {activeParty.name} 
                                <button onClick={copyInvite} className="hidden md:flex items-center gap-1 text-xs bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded font-mono hover:bg-amber-500/30 transition-colors" title="Copy ID">
                                    ID: {activeParty.id} {copiedId ? <Check size={10}/> : <Copy size={10}/>}
                                </button>
                            </h2>
                            <p className="text-xs text-gray-400 truncate">{viewers.length} Online • Host: {activeParty.hostName}</p>
                        </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        {(isOwner || isCoHost) && (
                            <button 
                                onClick={() => setShowSearch(!showSearch)} 
                                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                            >
                                <Film size={14}/> <span className="hidden sm:inline">Movie</span>
                            </button>
                        )}
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-2 rounded-lg hover:bg-white/20 relative transition-colors ${isSidebarOpen ? 'bg-amber-500 text-black' : 'bg-white/10 text-white'}`}>
                            {isSidebarOpen ? <X size={18}/> : <Menu size={18}/>}
                        </button>
                    </div>
                </div>

                <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                    {activeParty.movie ? (
                        <div className="w-full h-full relative">
                            <SynchronizedPlayer 
                                partyId={activeParty.id}
                                movie={activeParty.movie}
                                isHost={isHost}
                                hasControl={hasControl}
                                settings={activeParty.settings}
                                onSyncUpdate={handleSyncUpdate}
                            />
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 p-6">
                            <MonitorPlay size={48} className="mx-auto mb-4 opacity-50"/>
                            <p>Waiting for host to select a movie...</p>
                            {(isOwner || isCoHost) && <button onClick={() => setShowSearch(true)} className="mt-4 text-amber-500 hover:underline">Select Now</button>}
                        </div>
                    )}

                    {/* Movie Selector Modal */}
                    {showSearch && (
                        <div className="absolute inset-0 z-[60] bg-black/95 backdrop-blur-md p-4 md:p-8 flex flex-col animate-in fade-in">
                            <div className="max-w-2xl mx-auto w-full flex flex-col h-full">
                                <div className="flex justify-between items-center mb-6 shrink-0">
                                    <h3 className="text-xl font-bold text-white">Select Content</h3>
                                    <button onClick={() => setShowSearch(false)}><X className="text-gray-400 hover:text-white"/></button>
                                </div>
                                <div className="relative mb-6 shrink-0">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"/>
                                    <input 
                                        autoFocus
                                        type="text" 
                                        className="w-full bg-white/10 border border-white/10 rounded-xl py-4 pl-12 text-white outline-none focus:border-amber-500"
                                        placeholder="Search TMDB..."
                                        value={searchQuery}
                                        onChange={(e) => handleSearchMovies(e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 overflow-y-auto custom-scrollbar flex-1 pb-10">
                                    {searchResults.map(m => (
                                        <div key={m.id} onClick={() => handleMovieSelect(m)} className="cursor-pointer group">
                                            <div className="aspect-[2/3] rounded-lg overflow-hidden bg-white/5 relative">
                                                <img src={`${TMDB_IMAGE_BASE}${m.poster_path}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt=""/>
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                    <Play className="fill-white text-white"/>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-300 mt-2 truncate">{m.title || m.name}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Sidebar (Chat & Settings & Members) */}
            <div className={`fixed inset-0 top-[60px] md:top-16 md:relative md:w-80 bg-[#0a0a0a] border-l border-white/5 transform transition-transform duration-300 z-20 flex flex-col ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:hidden'}`}>
                {/* Tabs */}
                <div className="flex border-b border-white/5 shrink-0">
                    <button onClick={() => setActiveTab('chat')} className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'chat' ? 'text-white border-b-2 border-amber-500 bg-white/5' : 'text-gray-400 hover:text-white'}`}>Chat</button>
                    <button onClick={() => setActiveTab('members')} className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'members' ? 'text-white border-b-2 border-amber-500 bg-white/5' : 'text-gray-400 hover:text-white'}`}>Members ({viewers.length})</button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col relative">
                    {activeTab === 'chat' ? (
                        <>
                            <div className="flex-1 space-y-4 mb-4">
                                {messages.length === 0 && <p className="text-gray-600 text-xs text-center mt-4">Room created. Invite friends!</p>}
                                {messages.map((msg, i) => (
                                    <div key={i} className={`flex flex-col ${msg.isSystem ? 'items-center' : 'items-start'}`}>
                                        {msg.isSystem ? (
                                            <span className="text-[10px] bg-white/10 text-gray-400 px-2 py-0.5 rounded-full my-2 text-center max-w-[90%]">{msg.text}</span>
                                        ) : (
                                            <>
                                                <div className="flex items-baseline gap-2">
                                                    <span className={`text-xs font-bold ${msg.user === userProfile.name ? 'text-amber-500' : 'text-gray-300'} ${activeParty.hostName === msg.user ? 'text-red-400' : ''}`}>{msg.user}</span>
                                                    <span className="text-[10px] text-gray-600">{msg.timestamp}</span>
                                                </div>
                                                <p className="text-sm text-gray-200 bg-white/5 p-2 rounded-lg rounded-tl-none mt-1 break-words w-full">{msg.text}</p>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                            
                            <div className="mt-auto shrink-0 pt-2">
                                {activeParty.settings.allowChat || hasControl ? (
                                    <form onSubmit={handleSendMessage} className="relative">
                                        <input 
                                            type="text" 
                                            value={inputMsg}
                                            onChange={(e) => setInputMsg(e.target.value)}
                                            placeholder="Type a message..." 
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm text-white outline-none focus:border-amber-500/50 transition-colors"
                                        />
                                        <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-amber-500 text-black rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50" disabled={!inputMsg.trim()}>
                                            <Send size={14}/>
                                        </button>
                                    </form>
                                ) : (
                                    <div className="text-center text-xs text-red-400 bg-red-900/10 p-2 rounded border border-red-900/30">
                                        Chat is disabled by host.
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="space-y-3">
                            {viewers.map((viewer, idx) => {
                                const isViewerOwner = viewer.user === activeParty.hostName;
                                const isViewerCoHost = activeParty.settings.coHosts?.includes(viewer.user);
                                
                                return (
                                    <div key={idx} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center overflow-hidden border border-white/10">
                                                {viewer.avatar ? <img src={viewer.avatar} className="w-full h-full object-cover"/> : viewer.user.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white flex items-center gap-2">
                                                    {viewer.user}
                                                    {isViewerOwner && <Crown size={12} className="text-yellow-500 fill-yellow-500"/>}
                                                    {isViewerCoHost && !isViewerOwner && <ShieldAlert size={12} className="text-blue-400"/>}
                                                </p>
                                                <p className="text-[10px] text-gray-500">{isViewerOwner ? "Owner" : isViewerCoHost ? "Co-Host" : "Member"}</p>
                                            </div>
                                        </div>
                                        
                                        {/* Actions for Owner Only */}
                                        {isOwner && viewer.user !== userProfile.name && (
                                            <div className="flex items-center gap-1">
                                                <button 
                                                    onClick={() => handlePromote(viewer.user)}
                                                    className={`p-2 rounded-lg transition-colors ${isViewerCoHost ? 'text-blue-400 bg-blue-500/10 hover:bg-blue-500/20' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                                                    title={isViewerCoHost ? "Demote" : "Promote to Co-Host"}
                                                >
                                                    {isViewerCoHost ? <UserMinus size={14}/> : <UserPlus size={14}/>}
                                                </button>
                                                <button 
                                                    onClick={() => handleKick(viewer.user)}
                                                    className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                                                    title="Kick Member"
                                                >
                                                    <LogOut size={14}/>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Host Controls Footer */}
                {hasControl && (
                    <div className="border-t border-white/10 bg-[#121212] p-4 shrink-0">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><Crown size={12}/> Host Controls</h4>
                            {isOwner && (
                                <button onClick={handleDeleteParty} className="text-[10px] text-red-500 font-bold hover:underline">CLOSE PARTY</button>
                            )}
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-300">Chat Enabled</span>
                                <button onClick={() => toggleSetting('allowChat')} className={`w-8 h-4 rounded-full relative transition-colors ${activeParty.settings.allowChat ? 'bg-green-500' : 'bg-gray-600'}`}>
                                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${activeParty.settings.allowChat ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                </button>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-300">Member Controls</span>
                                <button onClick={() => toggleSetting('allowControls')} className={`w-8 h-4 rounded-full relative transition-colors ${activeParty.settings.allowControls ? 'bg-green-500' : 'bg-gray-600'}`}>
                                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${activeParty.settings.allowControls ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
