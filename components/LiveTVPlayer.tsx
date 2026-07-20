import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AlertCircle, Loader2, Play, Pause, Volume2, VolumeX, Maximize, Minimize, Radio, ArrowLeft, RefreshCw, SkipBack, SkipForward, Calendar, Clock, List, ExternalLink, Tv, Cast } from 'lucide-react';
import { LiveChannel } from '../types';
import { getCurrentProgram, generateEPG } from '../utils/epgGenerator';
import { getDynamicChannelDetails, ChannelDetails, StreamServer } from '../utils/channelMetadata';
import { useCasting } from '../utils/castManager';

interface LiveTVPlayerProps {
    channel: LiveChannel;
    playlist?: LiveChannel[];
    onClose: () => void;
    onChannelChange?: (channel: LiveChannel) => void;
}

export const LiveTVPlayer: React.FC<LiveTVPlayerProps> = ({ channel, playlist = [], onClose, onChannelChange }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [retryKey, setRetryKey] = useState(0);
    
    // Player State
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Next/Prev Playlist Navigation
    const currentIndex = playlist.findIndex(c => c.id === channel.id);
    const prevChannel = currentIndex > 0 ? playlist[currentIndex - 1] : null;
    const nextChannel = currentIndex !== -1 && currentIndex < playlist.length - 1 ? playlist[currentIndex + 1] : null;

    const handleNext = useCallback(() => {
        if (nextChannel && onChannelChange) {
            onChannelChange(nextChannel);
        }
    }, [nextChannel, onChannelChange]);

    const handlePrev = useCallback(() => {
        if (prevChannel && onChannelChange) {
            onChannelChange(prevChannel);
        }
    }, [prevChannel, onChannelChange]);

    // EPG State
    const [epg, setEpg] = useState<ReturnType<typeof getCurrentProgram>>(null);
    const [showEpgGuide, setShowEpgGuide] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const activeProgramRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setIsMinimized(false);
        setIsClosing(false);
    }, [channel]);

    useEffect(() => {
        const updateEpg = () => {
            setEpg(getCurrentProgram(channel));
        };
        updateEpg();
        const interval = setInterval(updateEpg, 60000);
        return () => clearInterval(interval);
    }, [channel]);

    // Channel API Details & Stream Servers
    const [channelDetails, setChannelDetails] = useState<ChannelDetails | null>(null);
    const [servers, setServers] = useState<StreamServer[]>([]);
    const [currentServerIndex, setCurrentServerIndex] = useState(0);

    // PiP Mode State
    const [isPipSupported, setIsPipSupported] = useState(false);
    const [isPipActive, setIsPipActive] = useState(false);

    // Watch count state
    const [watchCount, setWatchCount] = useState(0);

    // Load API Metadata & Servers
    useEffect(() => {
        let isMounted = true;
        setChannelDetails(null);
        setServers([]);
        setCurrentServerIndex(0);
        
        getDynamicChannelDetails(channel).then(res => {
            if (isMounted) {
                setChannelDetails(res.details);
                setServers(res.servers);
            }
        });
        return () => { isMounted = false; };
    }, [channel]);

    // Seeded Watch Count Calculation
    useEffect(() => {
        const getSeededWatchCount = (id: string) => {
            const timeIndex = Math.floor(new Date().getTime() / 600000);
            let hash = 0;
            for (let i = 0; i < id.length; i++) {
                hash = (hash << 5) - hash + id.charCodeAt(i);
                hash |= 0;
            }
            const seedVal = Math.abs(hash + timeIndex) % 2500;
            return 100 + seedVal;
        };
        
        setWatchCount(getSeededWatchCount(channel.id));
        const interval = setInterval(() => {
            setWatchCount(getSeededWatchCount(channel.id));
        }, 60000);
        return () => clearInterval(interval);
    }, [channel]);

    // Check PiP support
    useEffect(() => {
        const video = videoRef.current;
        if (video && document.pictureInPictureEnabled) {
            setIsPipSupported(true);
        }
    }, []);

    // Recommendations filtering from current playlist
    const recommendations = playlist
        .filter(c => c.id !== channel.id)
        .slice(0, 4);

    const togglePip = async () => {
        const video = videoRef.current;
        if (!video) return;
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
                setIsPipActive(false);
            } else {
                await video.requestPictureInPicture();
                setIsPipActive(true);
            }
        } catch (e) {
            console.error("Picture in Picture failed", e);
        }
    };

    // Casting integrations
    const {
        isChromecastAvailable,
        isCasting,
        castingDevice,
        isAirPlayAvailable,
        castChannel,
        airPlay,
        stopCasting
    } = useCasting(videoRef.current);

    // Pause video if casting starts
    useEffect(() => {
        if (isCasting && isPlaying) {
            if (videoRef.current) videoRef.current.pause();
            setIsPlaying(false);
        }
    }, [isCasting, isPlaying]);

    // Picture in Picture and minimization sync
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleEnterPip = () => {
            setIsPipActive(true);
            setIsMinimized(true);
        };

        const handleLeavePip = () => {
            setIsPipActive(false);
            setIsMinimized(currentMin => {
                if (currentMin) {
                    onClose();
                }
                return false;
            });
        };

        video.addEventListener('enterpictureinpicture', handleEnterPip);
        video.addEventListener('leavepictureinpicture', handleLeavePip);
        return () => {
            video.removeEventListener('enterpictureinpicture', handleEnterPip);
            video.removeEventListener('leavepictureinpicture', handleLeavePip);
        };
    }, [onClose]);

    // Scroll active show into view on guide open
    useEffect(() => {
        if (showEpgGuide) {
            setTimeout(() => {
                activeProgramRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }, 300);
        }
    }, [showEpgGuide]);

    const handleClose = () => {
        const isPip = document.pictureInPictureElement && document.pictureInPictureElement === videoRef.current;
        if (isPip) {
            setIsMinimized(true);
        } else {
            setIsClosing(true);
            setTimeout(() => {
                onClose();
            }, 300);
        }
    };

    // Dynamic Colors
    const accentColor = 'text-red-500';
    const accentBg = 'bg-red-600';
    const sliderClass = 'accent-red-500';

    const handleMouseMove = useCallback(() => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying && !loading && !error) setShowControls(false);
        }, 3000);
    }, [isPlaying, loading, error]);

    // Close controls immediately when playing and mouse leaves container
    const handleMouseLeave = () => {
        if (isPlaying && !loading && !error) {
            setShowControls(false);
        }
    };

    // Reload/Retry stream action
    const handleRetry = () => {
        setRetryKey(prev => prev + 1);
    };

    // Fullscreen state listener sync
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // HLS stream loader logic with auto switching
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        setLoading(true);
        setError(null);

        const hlsUrl = servers[currentServerIndex]?.url || channel.url;
        const Hls = (window as any).Hls;
        let hls: any;

        const handleAutoSwitchServer = () => {
            if (servers.length > 1 && currentServerIndex < servers.length - 1) {
                const nextIndex = currentServerIndex + 1;
                setError(`Stream offline. Trying Server ${nextIndex + 1}...`);
                setLoading(true);
                setTimeout(() => {
                    setCurrentServerIndex(nextIndex);
                    setError(null);
                }, 2000);
            } else {
                setLoading(false);
                setError("Stream is currently offline, geo-blocked, or uses an unsupported protocol.");
            }
        };

        const handleCanPlay = () => {
            setLoading(false);
            setError(null);
        };

        const handleStreamError = (e: Event | string, data?: any) => {
            console.error("Stream Error", e, data);
            if (data && data.fatal) {
                handleAutoSwitchServer();
            }
        };

        if (Hls && Hls.isSupported()) {
            hls = new Hls();
            hls.loadSource(hlsUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                video.play().catch(e => {
                    console.log("Autoplay prevented", e);
                    setIsPlaying(false);
                });
            });
            hls.on(Hls.Events.ERROR, handleStreamError);
            
            video.addEventListener('loadeddata', handleCanPlay);
            video.addEventListener('error', handleAutoSwitchServer);

        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = hlsUrl;
            video.addEventListener('loadedmetadata', () => {
                video.play().catch(e => {
                    console.log("Autoplay prevented", e);
                    setIsPlaying(false);
                });
            });
            video.addEventListener('loadeddata', handleCanPlay);
            video.addEventListener('error', handleAutoSwitchServer);
        } else {
            setLoading(false);
            setError("Your browser does not support HLS playback formats.");
        }

        return () => {
            if (hls) hls.destroy();
            if (video) {
                video.removeEventListener('loadeddata', handleCanPlay);
                video.removeEventListener('error', handleStreamError);
                video.removeEventListener('error', handleAutoSwitchServer);
            }
        };
    }, [channel, retryKey, currentServerIndex, servers]);

    const togglePlay = () => {
        if (videoRef.current) {
            if (videoRef.current.paused) {
                videoRef.current.play().catch(() => {});
                setIsPlaying(true);
            } else {
                videoRef.current.pause();
                setIsPlaying(false);
                setShowControls(true);
            }
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const vol = parseFloat(e.target.value);
        setVolume(vol);
        if (videoRef.current) {
            videoRef.current.volume = vol;
            setIsMuted(vol === 0);
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            const newMutedState = !isMuted;
            videoRef.current.muted = newMutedState;
            setIsMuted(newMutedState);
            if (!newMutedState && volume === 0) {
                setVolume(0.5);
                videoRef.current.volume = 0.5;
            }
        }
    };

    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(() => {});
            setIsFullscreen(true);
        } else {
            document.exitFullscreen().catch(() => {});
            setIsFullscreen(false);
        }
    };

    // Keyboard Shortcuts support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === ' ' || e.key === 'k' || e.key === 'K') {
                e.preventDefault();
                togglePlay();
            } else if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                toggleFullscreen();
            } else if (e.key === 'm' || e.key === 'M') {
                e.preventDefault();
                toggleMute();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setVolume(prev => {
                    const next = Math.min(prev + 0.1, 1);
                    if (videoRef.current) videoRef.current.volume = next;
                    setIsMuted(false);
                    return next;
                });
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setVolume(prev => {
                    const next = Math.max(prev - 0.1, 0);
                    if (videoRef.current) {
                        videoRef.current.volume = next;
                        if (next === 0) setIsMuted(true);
                    }
                    return next;
                });
            } else if (e.key === 'n' || e.key === 'N' || e.key === 'ArrowRight' || e.key === ']') {
                if (nextChannel) {
                    e.preventDefault();
                    handleNext();
                }
            } else if (e.key === 'p' || e.key === 'P' || e.key === 'ArrowLeft' || e.key === '[') {
                if (prevChannel) {
                    e.preventDefault();
                    handlePrev();
                }
            } else if (e.key === 'g' || e.key === 'G') {
                e.preventDefault();
                setShowEpgGuide(prev => !prev);
            } else if (e.key === 'Escape' && !document.fullscreenElement) {
                handleClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isMuted, volume, isFullscreen, isPlaying, handleNext, handlePrev, nextChannel, prevChannel, onClose, setShowEpgGuide]);

    // Handle video state bindings on external interaction
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const onPlay = () => setIsPlaying(true);
        const onPause = () => { setIsPlaying(false); setShowControls(true); };
        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);
        return () => {
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
        };
    }, []);

    return (
        <div 
            ref={containerRef}
            className={`fixed bg-black z-[100] flex flex-col group select-none overflow-hidden transition-all duration-300 ease-out ${
                isMinimized 
                    ? 'left-[-9999px] top-[-9999px] w-[1px] h-[1px] opacity-0 pointer-events-none' 
                    : isClosing 
                        ? 'opacity-0 scale-95 pointer-events-none'
                        : 'opacity-100 scale-100 inset-0 animate-in fade-in zoom-in-95 duration-300'
            }`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {/* Header / Top Overlay */}
            <div className={`absolute top-0 left-0 right-0 p-4 md:p-6 pt-6 md:pt-8 z-20 flex items-center bg-gradient-to-b from-black/90 via-black/75 to-transparent transition-all duration-300 ${showControls && !isMinimized ? 'translate-y-0 opacity-100 pointer-events-auto' : '-translate-y-4 opacity-0 pointer-events-none'}`}>
                <div className="flex items-center justify-between gap-3 w-full">
                    <div className="flex items-center gap-3 min-w-0">
                        <button 
                            onClick={handleClose} 
                            className="bg-black/50 hover:bg-white/15 p-2.5 rounded-full text-white transition-all duration-200 border border-white/10 active:scale-90 shadow-xl shrink-0"
                            title="Back"
                        >
                            <ArrowLeft size={20}/>
                        </button>
                        <div className="flex items-center gap-3 min-w-0">
                            {/* Logo Container */}
                            <div className="w-11 h-11 md:w-14 md:h-14 bg-black rounded-xl p-1 border border-white/10 flex items-center justify-center shadow-xl relative overflow-hidden shrink-0">
                                 {channel.logo ? (
                                    <img src={channel.logo} className="max-w-[90%] max-h-[90%] object-contain" alt={channel.name} onError={(e) => { e.currentTarget.style.display = 'none'; }}/>
                                 ) : (
                                    <span className="font-bold text-lg text-red-500">{channel.name.charAt(0)}</span>
                                 )}
                            </div>
                            <div className="text-left min-w-0 flex-1">
                                <h2 className="text-sm md:text-lg font-bold text-white tracking-tight truncate leading-snug">{channel.name}</h2>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    {channel.group && (
                                        <span className="inline-block px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-medium text-zinc-300 leading-none">
                                            {channel.group}
                                        </span>
                                    )}
                                    {epg && (
                                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-medium leading-none truncate max-w-[150px] sm:max-w-xs">
                                            Now: {epg.current.title}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Video Area (Double click to Fullscreen, single click to pause) */}
            <div 
                className="flex-1 relative bg-black flex items-center justify-center overflow-hidden" 
                onClick={togglePlay}
                onDoubleClick={toggleFullscreen}
            >
                {loading && !error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10 bg-black/60 backdrop-blur-[2px] pointer-events-none transition-all">
                        <div className="flex flex-col items-center justify-center gap-4">
                            <div className="relative flex items-center justify-center">
                                <div className="absolute w-16 h-16 rounded-full bg-red-600/10 border border-red-500/20 animate-ping duration-1000 pointer-events-none" />
                                <svg className="w-12 h-12 text-red-600 animate-spin will-change-transform relative z-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}>
                                    <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                    <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            </div>
                            <p className="font-medium animate-pulse text-xs text-zinc-300 mt-2">Connecting Live Feed...</p>
                        </div>
                    </div>
                )}
                
                {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-15 bg-black/85 backdrop-blur-md p-6 text-center animate-in fade-in duration-300">
                        <div className="bg-zinc-950/80 border border-white/10 rounded-3xl p-8 max-w-[340px] w-full shadow-2xl relative overflow-hidden text-center backdrop-blur-xl">
                            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-red-600 to-red-400"></div>
                            
                            <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-5 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.15)] animate-[pulse_2s_infinite]">
                                <AlertCircle size={28} className="text-red-500"/>
                            </div>
                            
                            <h2 className="text-base font-bold mb-1 tracking-tight text-white">Signal Lost</h2>
                            <p className="text-zinc-400 text-xs leading-relaxed mb-6 px-1 font-normal">
                                {error}
                            </p>

                            {/* Stream Server Recovery Selector */}
                            {servers.length > 1 && (
                                <div className="mb-6 select-none text-center border-t border-white/5 pt-4">
                                    <span className="text-[10px] font-medium text-zinc-400 block mb-2.5">Switch Stream Server</span>
                                    <div className="flex flex-wrap gap-1.5 justify-center">
                                        {servers.map((s, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    setCurrentServerIndex(idx);
                                                    setError(null);
                                                    setLoading(true);
                                                }}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                    currentServerIndex === idx
                                                        ? 'bg-red-600 text-white shadow-md'
                                                        : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                                                }`}
                                            >
                                                Server {idx + 1}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            <div className="flex items-center gap-3 justify-center border-t border-white/5 pt-5">
                                <button 
                                    onClick={handleRetry} 
                                    className="flex-1 h-10 px-4 bg-white hover:bg-zinc-200 text-black font-semibold text-xs rounded-xl transition-all active:scale-95 shadow-md flex items-center justify-center gap-1.5 whitespace-nowrap"
                                >
                                    <RefreshCw size={12} />
                                    Retry
                                </button>
                                <button 
                                    onClick={onClose} 
                                    className="flex-1 h-10 px-4 bg-white/10 hover:bg-white/20 text-zinc-200 font-semibold text-xs rounded-xl transition-all active:scale-95 whitespace-nowrap"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <video 
                    ref={videoRef} 
                    className="w-full h-full max-h-screen object-contain" 
                    playsInline
                    autoPlay
                    muted={isMuted}
                />

                {isCasting && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-15 bg-black/90 backdrop-blur-md p-6 text-center animate-in fade-in duration-300">
                        <div className="bg-[#0e0e10]/60 border border-white/5 rounded-3xl p-8 max-w-[340px] w-full shadow-2xl relative overflow-hidden text-center animate-in zoom-in-95 duration-200">
                            <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
                            
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-5 border border-red-500/20 animate-pulse">
                                <Cast size={30} className="text-red-500"/>
                            </div>
                            
                            <h2 className="text-base font-bold mb-1 tracking-tight text-white font-sans text-center">Connected to TV</h2>
                            <p className="text-gray-400 text-xs leading-relaxed mb-6 px-1 font-normal text-center">
                                Currently casting <span className="text-white font-medium">{channel.name}</span> to <span className="text-red-400 font-medium">{castingDevice || 'Chromecast Device'}</span>.
                            </p>
                            
                            <button 
                                onClick={stopCasting} 
                                className="w-full h-10 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl transition-all active:scale-95 shadow-lg flex items-center justify-center gap-1.5"
                            >
                                Stop Casting
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Controls Overlay */}
            <div className={`absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-4 md:px-6 pb-4 md:pb-6 pt-12 transition-all duration-300 ${showControls && !isMinimized ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-4 opacity-0 pointer-events-none'}`}>
                <div className="flex flex-col gap-3 w-full">
                    {/* Live Stream timeline bar & current program text */}
                    <div className="flex flex-col gap-1.5 w-full text-left select-none">
                        <div className="w-full h-1 bg-white/15 rounded-full overflow-hidden relative">
                            <div 
                                className={`absolute top-0 left-0 bottom-0 ${accentBg} transition-all duration-1000`}
                                style={{ width: `${epg ? epg.progress : 100}%` }}
                            />
                        </div>
                        {epg && (
                            <div className="flex items-center justify-between text-[11px] text-zinc-300 font-medium px-0.5 flex-wrap gap-x-3 gap-y-1">
                                <div className="flex items-center gap-1.5 truncate max-w-full">
                                    <Clock size={12} className="text-red-400 shrink-0" />
                                    <span className="truncate">
                                        Now: <span className="text-white font-semibold">{epg.current.title}</span>
                                    </span>
                                    <span className="text-zinc-500">•</span>
                                    <span className="text-zinc-400 shrink-0">Ends in {Math.round(epg.current.duration * (1 - epg.progress / 100))} min</span>
                                </div>
                                {epg.next && (
                                    <span className="text-zinc-400 text-[10px] truncate hidden sm:inline-block">
                                        Next: <span className="text-zinc-200 font-medium">{epg.next.title}</span> ({epg.next.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Main Responsive Controls Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 md:gap-4">
                        {/* Left Group: Playback Controls + Volume + Live Indicator */}
                        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                            {/* Playback Controls */}
                            <div className="flex items-center gap-1.5">
                                <button 
                                    onClick={handlePrev}
                                    disabled={!prevChannel}
                                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-90"
                                    title={prevChannel ? `Previous: ${prevChannel.name}` : "No previous channel"}
                                >
                                    <SkipBack size={16}/>
                                </button>

                                <button 
                                    onClick={togglePlay}
                                    className="p-2.5 rounded-full bg-white text-black hover:bg-zinc-200 transition-all active:scale-90"
                                    title={isPlaying ? "Pause" : "Play"}
                                >
                                    {isPlaying ? <Pause size={18} fill="currentColor"/> : <Play size={18} fill="currentColor"/>}
                                </button>

                                <button 
                                    onClick={handleNext}
                                    disabled={!nextChannel}
                                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-90"
                                    title={nextChannel ? `Next: ${nextChannel.name}` : "No next channel"}
                                >
                                    <SkipForward size={16}/>
                                </button>
                            </div>

                            {/* Volume Control */}
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={toggleMute} 
                                    className="text-zinc-300 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-full"
                                    title="Mute"
                                >
                                    {isMuted || volume === 0 ? <VolumeX size={18}/> : <Volume2 size={18}/>}
                                </button>
                                <div className="w-16 sm:w-20 hidden xs:flex items-center">
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="1" 
                                        step="0.05" 
                                        value={isMuted ? 0 : volume}
                                        onChange={handleVolumeChange}
                                        className={`w-full h-1 rounded-lg cursor-pointer bg-white/20 transition-all ${sliderClass}`}
                                    />
                                </div>
                            </div>
                            
                            {/* Live Badge & Watching Count */}
                            <div className="flex items-center gap-2 select-none">
                                <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-red-600 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                    <span className="text-[10px] font-bold text-white uppercase tracking-wider leading-none">LIVE</span>
                                </div>
                                <span className="text-[10px] text-zinc-400 bg-white/5 px-2 py-0.5 rounded-full hidden sm:inline-block">
                                    🔥 {watchCount.toLocaleString()}
                                </span>
                            </div>

                            {/* Server Selector Pills */}
                            {servers.length > 1 && (
                                <div className="flex items-center gap-1 bg-white/5 rounded-full p-0.5 select-none">
                                    {servers.map((s, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                setCurrentServerIndex(idx);
                                                setError(null);
                                                setLoading(true);
                                            }}
                                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-all ${
                                                currentServerIndex === idx
                                                    ? 'bg-red-600 text-white'
                                                    : 'text-zinc-400 hover:text-white'
                                            }`}
                                        >
                                            S{idx + 1}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Right Group: Action Buttons (Cast, EPG, Fullscreen) */}
                        <div className="flex items-center gap-2">
                            {isChromecastAvailable && (
                                <button 
                                    onClick={() => castChannel(servers[currentServerIndex]?.url || channel.url, channel.name, channel.logo)} 
                                    className={`text-zinc-300 hover:text-white transition-all p-2 hover:bg-white/10 rounded-full ${isCasting ? 'bg-red-600 text-white' : ''}`}
                                    title="Cast"
                                >
                                    <Cast size={18}/>
                                </button>
                            )}

                            {isAirPlayAvailable && (
                                <button 
                                    onClick={airPlay} 
                                    className="text-zinc-300 hover:text-white transition-all p-2 hover:bg-white/10 rounded-full"
                                    title="AirPlay"
                                >
                                    <Tv size={18}/>
                                </button>
                            )}

                            {isPipSupported && (
                                <button 
                                    onClick={togglePip} 
                                    className={`text-zinc-300 hover:text-white transition-all p-2 hover:bg-white/10 rounded-full ${isPipActive ? 'text-red-400' : ''}`}
                                    title="Picture in Picture"
                                >
                                    <ExternalLink size={18}/>
                                </button>
                            )}

                            <button 
                                onClick={() => setShowEpgGuide(!showEpgGuide)} 
                                className={`text-zinc-300 hover:text-white transition-all p-2 hover:bg-white/10 rounded-full ${showEpgGuide ? 'text-red-400' : ''}`}
                                title="TV Guide"
                            >
                                <List size={18}/>
                            </button>

                            <button 
                                onClick={toggleFullscreen} 
                                className="text-zinc-300 hover:text-white transition-all p-2 hover:bg-white/10 rounded-full"
                                title="Fullscreen"
                            >
                                {isFullscreen ? <Minimize size={18}/> : <Maximize size={18}/>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* EPG Slide-out TV Guide Panel */}
            <div className={`absolute top-0 right-0 bottom-0 w-80 sm:w-96 bg-[#09090b]/95 backdrop-blur-2xl border-l border-white/10 z-30 flex flex-col p-6 transition-all duration-300 select-none shadow-2xl ${showEpgGuide ? 'translate-x-0' : 'translate-x-full'}`}>
                {/* Panel Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4 text-left">
                    <div>
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                            <Calendar size={14} className="text-red-500" />
                            TV Guide (EPG)
                        </h3>
                        <p className="text-xs text-zinc-400 mt-0.5 font-normal">Today's Programming Schedule</p>
                    </div>
                    <button 
                        onClick={() => setShowEpgGuide(false)}
                        className="text-zinc-400 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg transition-all text-xs font-medium"
                    >
                        Close
                    </button>
                </div>

                {/* Channel Meta Info Card */}
                {channelDetails && (
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-left flex flex-col gap-3 mb-4 select-none">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-black/40 rounded-xl p-1.5 border border-white/5 flex items-center justify-center shadow-inner">
                                {channelDetails.logo ? (
                                    <img src={channelDetails.logo} className="max-w-full max-h-full object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }}/>
                                ) : (
                                    <span className="font-bold text-lg text-gray-300">{channelDetails.name.charAt(0)}</span>
                                )}
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-white leading-tight truncate max-w-[200px]">{channelDetails.name}</h4>
                                {channelDetails.website && (
                                    <a 
                                        href={channelDetails.website} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="text-[9px] text-red-400 hover:text-red-300 underline font-medium truncate max-w-[200px] block mt-0.5"
                                    >
                                        {channelDetails.website.replace(/^https?:\/\/(www\.)?/, '')}
                                    </a>
                                )}
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] border-t border-white/[0.03] pt-3">
                            <div>
                                <span className="text-zinc-400 font-medium block text-[10px]">Country</span>
                                <span className="text-zinc-200 font-semibold">{channelDetails.country || "Global"}</span>
                            </div>
                            <div>
                                <span className="text-zinc-400 font-medium block text-[10px]">Language</span>
                                <span className="text-zinc-200 font-semibold truncate block max-w-[100px]">{channelDetails.languages.join(', ')}</span>
                            </div>
                            <div>
                                <span className="text-zinc-400 font-medium block text-[10px]">Category</span>
                                <span className="text-zinc-200 font-semibold truncate block max-w-[100px] capitalize">{channelDetails.categories.join(', ') || "Entertainment"}</span>
                            </div>
                            <div>
                                <span className="text-zinc-400 font-medium block text-[10px]">Status</span>
                                <span className="text-green-500 font-medium flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    Online
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Visual Program Timeline */}
                {epg && (
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-left select-none mb-4">
                        <h4 className="text-xs font-semibold text-white mb-3 flex items-center gap-1.5">
                            <Clock size={12} className="text-red-500" />
                            Program Timeline
                        </h4>
                        
                        <div className="flex justify-between text-[9px] text-zinc-500 font-bold mb-1.5 px-1 select-none">
                            {(() => {
                                const currentHour = new Date();
                                currentHour.setMinutes(0, 0, 0);
                                const h1 = new Date(currentHour.getTime() - 3600000);
                                const h2 = currentHour;
                                const h3 = new Date(currentHour.getTime() + 3600000);
                                const h4 = new Date(currentHour.getTime() + 7200000);
                                return (
                                    <>
                                        <span>{h1.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                                        <span>{h2.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                                        <span>{h3.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                                        <span>{h4.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                                    </>
                                );
                            })()}
                        </div>
                        
                        <div className="h-10 w-full rounded-lg bg-zinc-950/60 border border-white/5 overflow-hidden flex relative select-none">
                            {(() => {
                                const schedule = generateEPG(channel);
                                const now = new Date();
                                const activeIdx = schedule.findIndex(p => now >= p.startTime && now < p.endTime);
                                if (activeIdx === -1) return null;
                                
                                const list = schedule.slice(Math.max(0, activeIdx - 1), Math.min(schedule.length, activeIdx + 3));
                                const totalDuration = list.reduce((sum, p) => sum + p.duration, 0);
                                
                                return list.map((p, i) => {
                                    const percent = (p.duration / totalDuration) * 100;
                                    const isPlayingNow = now >= p.startTime && now < p.endTime;
                                    const isPast = now > p.endTime;
                                    return (
                                        <div 
                                            key={i}
                                            className={`h-full border-r border-white/5 flex flex-col justify-center px-3 transition-all relative ${
                                                isPlayingNow 
                                                    ? 'bg-gradient-to-r from-red-600/20 to-red-600/5 text-red-400 font-extrabold border-l-2 border-red-500' 
                                                    : isPast 
                                                        ? 'bg-black/40 text-zinc-600 opacity-40' 
                                                        : 'bg-white/[0.01] text-zinc-400 font-semibold'
                                            }`}
                                            style={{ width: `${percent}%` }}
                                            title={`${p.title} (${p.duration}m)`}
                                        >
                                            <span className="text-[10px] truncate block leading-tight">{p.title}</span>
                                            <span className="text-[8px] text-zinc-500 font-normal leading-none mt-0.5">{p.duration}m</span>
                                            {isPlayingNow && (
                                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500" />
                                            )}
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                )}

                {/* Schedule List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1 text-left">
                    {generateEPG(channel).map((program, idx) => {
                        const nowTime = new Date().getTime();
                        const isCurrent = nowTime >= program.startTime.getTime() && nowTime < program.endTime.getTime();
                        
                        return (
                            <div 
                                key={idx} 
                                ref={isCurrent ? activeProgramRef : undefined}
                                className={`p-4 rounded-xl border transition-all duration-300 flex flex-col gap-1.5 relative overflow-hidden ${
                                    isCurrent 
                                        ? 'bg-gradient-to-r from-red-600/10 to-red-600/[0.02] border-red-500/40 shadow-lg shadow-red-600/5' 
                                        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                                }`}
                            >
                                {isCurrent && (
                                    <div className="absolute top-0 bottom-0 left-0 w-1 bg-red-600 animate-[pulse_2s_infinite]"></div>
                                )}
                                <div className="flex items-start justify-between gap-2">
                                    <h4 className={`text-xs font-bold leading-tight ${isCurrent ? 'text-red-500' : 'text-gray-200'}`}>
                                        {program.title}
                                    </h4>
                                    <span className="text-[8px] font-bold uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded border border-white/5 text-gray-400">
                                        {program.genre}
                                    </span>
                                </div>
                                <p className="text-[10px] text-gray-400 leading-relaxed font-medium">
                                    {program.description}
                                </p>
                                <div className="flex items-center justify-between text-[9px] font-semibold text-zinc-500 mt-1 border-t border-white/[0.03] pt-1.5">
                                    <span className="flex items-center gap-1">
                                        <Clock size={10} className="text-zinc-600" />
                                        {program.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {program.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span>
                                        {program.duration} mins
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Recommendations */}
                {recommendations.length > 0 && (
                    <div className="border-t border-white/5 pt-4 mt-4 text-left select-none">
                        <h4 className="text-[10px] font-black text-white tracking-widest uppercase mb-3 flex items-center gap-1.5">
                            <Tv size={12} className="text-red-500" />
                            Recommended for you
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                            {recommendations.map((recChannel) => (
                                <div 
                                    key={recChannel.id}
                                    onClick={() => {
                                        if (onChannelChange) onChannelChange(recChannel);
                                    }}
                                    className="cursor-pointer transition-all duration-300 flex items-center gap-3.5 group/rec select-none active:scale-95 py-2.5 px-2 rounded-xl hover:bg-white/[0.03]"
                                >
                                    <div className="w-12 h-12 bg-zinc-950 rounded-2xl p-1.5 border border-white/5 shrink-0 flex items-center justify-center group-hover/rec:border-red-500/30 group-hover/rec:shadow-[0_0_15px_rgba(220,38,38,0.15)] transition-all duration-300">
                                        {recChannel.logo ? (
                                            <img src={recChannel.logo} className="max-w-[95%] max-h-[95%] object-contain filter drop-shadow" alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }}/>
                                        ) : (
                                            <span className="font-black text-sm text-red-500">{recChannel.name.charAt(0)}</span>
                                        )}
                                    </div>
                                    <div className="text-left min-w-0 flex-1">
                                        <span className="text-[11px] font-bold text-zinc-300 group-hover/rec:text-white transition-colors truncate block">
                                            {recChannel.name}
                                        </span>
                                        {recChannel.group && (
                                            <span className="text-[8px] font-black text-zinc-500 group-hover/rec:text-red-500/80 transition-colors uppercase tracking-wider block mt-0.5">
                                                {recChannel.group}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
