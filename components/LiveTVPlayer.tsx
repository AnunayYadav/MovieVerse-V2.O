import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AlertCircle, Loader2, Play, Pause, Volume2, VolumeX, Maximize, Minimize, Radio, ArrowLeft, RefreshCw } from 'lucide-react';
import { LiveChannel } from '../types';

interface LiveTVPlayerProps {
    channel: LiveChannel;
    onClose: () => void;
    isGoldTheme?: boolean;
}

export const LiveTVPlayer: React.FC<LiveTVPlayerProps> = ({ channel, onClose, isGoldTheme = false }) => {
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

    // Dynamic Colors
    const accentColor = isGoldTheme ? 'text-amber-500' : 'text-red-500';
    const accentBg = isGoldTheme ? 'bg-amber-500' : 'bg-red-600';
    const sliderClass = isGoldTheme ? 'accent-amber-500' : 'accent-red-500';

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

    // HLS stream loader logic
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        setLoading(true);
        setError(null);

        const hlsUrl = channel.url;
        const Hls = (window as any).Hls;
        let hls: any;

        const handleCanPlay = () => {
            setLoading(false);
            setError(null);
        };

        const handleStreamError = (e: Event | string, data?: any) => {
            console.error("Stream Error", e, data);
            if (data && data.fatal) {
                setLoading(false);
                setError("Stream is currently offline, geo-blocked, or uses an unsupported protocol.");
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
            video.addEventListener('error', () => {
                setLoading(false);
                setError("Failed to resolve host. Stream may be inactive.");
            });

        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = hlsUrl;
            video.addEventListener('loadedmetadata', () => {
                video.play().catch(e => {
                    console.log("Autoplay prevented", e);
                    setIsPlaying(false);
                });
            });
            video.addEventListener('loadeddata', handleCanPlay);
            video.addEventListener('error', () => {
                setLoading(false);
                setError("Failed to resolve stream link.");
            });
        } else {
            setLoading(false);
            setError("Your browser does not support HLS playback formats.");
        }

        return () => {
            if (hls) hls.destroy();
            if (video) {
                video.removeEventListener('loadeddata', handleCanPlay);
                video.removeEventListener('error', handleStreamError);
            }
        };
    }, [channel, retryKey]);

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
            } else if (e.key === 'Escape' && !document.fullscreenElement) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isMuted, volume, isFullscreen, isPlaying]);

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
            className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-300 group select-none overflow-hidden"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {/* Header / Top Overlay (Cinematic Glassmorphism) */}
            <div className={`absolute top-0 left-0 right-0 p-6 z-20 flex items-center bg-gradient-to-b from-black/95 via-black/40 to-transparent transition-all duration-300 ${showControls ? 'translate-y-0 opacity-100 pointer-events-auto' : '-translate-y-4 opacity-0 pointer-events-none'}`}>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onClose} 
                        className="bg-white/5 hover:bg-white/10 p-2.5 rounded-full text-white transition-all duration-300 border border-white/5 hover:border-white/20 active:scale-90 shadow-lg"
                        title="Back"
                    >
                        <ArrowLeft size={20}/>
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-white/5 rounded-xl p-1.5 border border-white/5 flex items-center justify-center shadow-md bg-gradient-to-b from-white/[0.02] to-transparent">
                             {channel.logo ? (
                                <img src={channel.logo} className="max-w-full max-h-full object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" alt={channel.name} onError={(e) => (e.currentTarget.style.display = 'none')}/>
                             ) : (
                                <span className="font-bold text-base text-gray-300">{channel.name.charAt(0)}</span>
                             )}
                        </div>
                        <div className="text-left">
                            <h2 className="text-base font-bold text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{channel.name}</h2>
                            {channel.group && (
                                <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-white/5 text-[9px] font-bold text-gray-400 border border-white/5 uppercase tracking-widest">
                                    {channel.group}
                                </span>
                            )}
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
                        <div className="relative flex items-center justify-center mb-6">
                            <Loader2 size={56} className={`animate-spin ${accentColor}`}/>
                            <Radio size={20} className="absolute text-white animate-pulse" />
                        </div>
                        <p className="font-semibold animate-pulse text-xs tracking-widest text-white/90 uppercase">Connecting Live Feed...</p>
                    </div>
                )}
                
                {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-15 bg-black/85 backdrop-blur-md p-6 text-center animate-in fade-in duration-300">
                        <div className="bg-[#0e0e10]/60 border border-white/5 rounded-3xl p-6 max-w-[340px] w-full shadow-2xl relative overflow-hidden text-center">
                            <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
                            
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20 animate-[pulse_2s_infinite]">
                                <AlertCircle size={32} className="text-red-500"/>
                            </div>
                            
                            <h2 className="text-lg font-extrabold mb-1 tracking-tight text-white">Signal Lost</h2>
                            <p className="text-gray-400 text-[11px] leading-relaxed mb-6 px-1">
                                {error}
                            </p>
                            
                            <div className="flex items-center gap-3 justify-center">
                                <button 
                                    onClick={handleRetry} 
                                    className="flex-1 h-10 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-red-600/20 flex items-center justify-center gap-1.5 whitespace-nowrap animate-in"
                                >
                                    <RefreshCw size={12} className="animate-spin-slow" />
                                    Retry
                                </button>
                                <button 
                                    onClick={onClose} 
                                    className="flex-1 h-10 px-4 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/5 hover:border-white/10 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all active:scale-95 whitespace-nowrap"
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
            </div>

            {/* Bottom Controls Overlay (Cinematic Glassmorphism) */}
            <div className={`absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-6 pb-6 pt-16 transition-all duration-300 ${showControls ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-4 opacity-0 pointer-events-none'}`}>
                <div className="flex flex-col gap-4 w-full">
                    {/* Live Stream visual timeline tracker */}
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden relative group/timeline cursor-pointer">
                        <div className={`absolute top-0 left-0 bottom-0 w-full ${accentBg} opacity-30`}></div>
                        <div className={`absolute top-0 right-0 bottom-0 w-full ${accentBg} opacity-10 group-hover/timeline:opacity-20 transition-opacity`}></div>
                        <div className={`absolute top-0 right-0 bottom-0 w-1.5 ${accentBg} shadow-[0_0_8px_#dc2626]`}></div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            {/* Play / Pause button */}
                            <button 
                                onClick={togglePlay}
                                className={`p-2.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/5 transition-all active:scale-90 ${isPlaying ? 'text-white' : accentColor}`}
                                title={isPlaying ? "Pause (Space)" : "Play (Space)"}
                            >
                                {isPlaying ? <Pause size={22} fill="currentColor"/> : <Play size={22} fill="currentColor"/>}
                            </button>

                            {/* Volume bar always visible */}
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={toggleMute} 
                                    className="text-white hover:text-red-500 transition-colors p-2 hover:bg-white/5 rounded-full"
                                    title="Mute (M)"
                                >
                                    {isMuted || volume === 0 ? <VolumeX size={20}/> : <Volume2 size={20}/>}
                                </button>
                                <div className="w-20 sm:w-24 flex items-center">
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
                            
                            {/* Live Badge */}
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-red-600 rounded-md shadow-[0_0_10px_#dc2626]/40 select-none">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                <span className="text-[9px] font-black text-white uppercase tracking-widest leading-none">LIVE</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Fullscreen button */}
                            <button 
                                onClick={toggleFullscreen} 
                                className="text-white hover:text-red-500 transition-all duration-300 p-2.5 hover:bg-white/10 rounded-full border border-white/5"
                                title="Fullscreen (F)"
                            >
                                {isFullscreen ? <Minimize size={20}/> : <Maximize size={20}/>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
