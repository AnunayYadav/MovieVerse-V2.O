import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Clock, Tv, AlertCircle, Loader2, Search, Globe, ChevronDown } from 'lucide-react';
import { LiveChannel } from '../types';
import { generateEPG } from '../utils/epgGenerator';
import { cleanChannelName } from '../utils/channelMetadata';

interface GridEPGProps {
    selectedCountry: string;
    onClose: () => void;
    onChannelSelect: (channel: LiveChannel, playlist: LiveChannel[]) => void;
}

const HOUR_WIDTH = 280; // px per hour
const GRID_HEIGHT_ROW = 52; // px per channel row

const CATEGORIES_LIST = [
    { id: 'ALL', name: 'All Categories', icon: '⚡' },
    { id: 'news', name: 'News & Current Affairs', icon: '📰' },
    { id: 'movies', name: 'Movies & Film', icon: '🎥' },
    { id: 'sports', name: 'Sports & Action', icon: '⚽' },
    { id: 'entertainment', name: 'General Entertainment', icon: '🎬' },
    { id: 'documentary', name: 'Documentaries', icon: '🌍' },
    { id: 'music', name: 'Music & Arts', icon: '🎵' },
    { id: 'kids', name: 'Kids & Animation', icon: '🧸' },
    { id: 'lifestyle', name: 'Lifestyle & Travel', icon: '🧘' }
];

const COUNTRIES_LIST = [
    { id: 'ALL', name: 'All Countries', icon: '🌍' },
    { id: 'IN', name: 'India', icon: '🇮🇳' },
    { id: 'US', name: 'United States', icon: '🇺🇸' },
    { id: 'UK', name: 'United Kingdom', icon: '🇬🇧' },
    { id: 'CA', name: 'Canada', icon: '🇨🇦' },
    { id: 'AU', name: 'Australia', icon: '🇦🇺' },
    { id: 'FR', name: 'France', icon: '🇫🇷' },
    { id: 'DE', name: 'Germany', icon: '🇩🇪' },
    { id: 'IT', name: 'Italy', icon: '🇮🇹' },
    { id: 'ES', name: 'Spain', icon: '🇪🇸' },
    { id: 'JP', name: 'Japan', icon: '🇯🇵' },
    { id: 'KR', name: 'South Korea', icon: '🇰🇷' }
];

// Helper to render flags or icons dynamically in EPG Grid dropdown
const renderDropdownIcon = (id: string, icon?: string) => {
    if (id === 'ALL' || id === 'all') {
        return <Globe className="text-zinc-400 shrink-0" size={14} />;
    }
    if ((id.length === 2 && id === id.toUpperCase()) || id === 'UK') {
        const code = id === 'UK' ? 'gb' : id.toLowerCase();
        return (
            <img 
                src={`https://flagcdn.com/w20/${code}.png`} 
                className="w-4 h-3 object-cover rounded-sm shadow-sm shrink-0" 
                alt="" 
                onError={(e) => {
                    e.currentTarget.style.display = 'none';
                }}
            />
        );
    }
    return icon ? <span className="text-sm shrink-0">{icon}</span> : null;
};

// Reusable custom dropdown styled to match MovieVerse app design aesthetics
interface CustomDropdownProps {
    value: string;
    options: Array<{ id: string; name: string; icon?: string }>;
    onChange: (val: string) => void;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({ value, options, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const activeOption = options.find(o => o.id === value) || options[0];

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative select-none" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="h-10 px-4 rounded-full bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all text-xs font-medium text-zinc-200 outline-none flex items-center gap-2.5 active:scale-95"
            >
                {renderDropdownIcon(activeOption.id, activeOption.icon)}
                <span className="truncate max-w-[130px] sm:max-w-none">{activeOption.name}</span>
                <ChevronDown size={13} className={`text-zinc-500 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-zinc-300' : ''}`} />
            </button>

            {isOpen && (
                <div 
                    style={{ backgroundColor: '#0f0f14' }}
                    className="absolute right-0 mt-2 w-52 bg-[#0f0f14] border border-white/15 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.98)] p-1.5 z-[100] animate-in zoom-in-95 duration-150 max-h-64 overflow-y-auto custom-scrollbar select-none text-left"
                >
                    {options.map(opt => {
                        const isActive = opt.id === value;
                        return (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                    onChange(opt.id);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-3.5 py-2.5 text-xs rounded-xl transition-all flex items-center gap-2.5 outline-none ${
                                    isActive
                                        ? 'bg-red-600 text-white font-medium shadow-sm'
                                        : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                {renderDropdownIcon(opt.id, opt.icon)}
                                <span className="truncate">{opt.name}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export const GridEPG: React.FC<GridEPGProps> = ({ selectedCountry, onClose, onChannelSelect }) => {
    const [channels, setChannels] = useState<LiveChannel[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [now, setNow] = useState(new Date());

    // Search and Dropdown Filter states
    const [searchText, setSearchText] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCat, setSelectedCat] = useState("ALL");
    const [selectedCountryCode, setSelectedCountryCode] = useState(selectedCountry || "ALL");

    const gridScrollContainerRef = useRef<HTMLDivElement>(null);
    const timelineScrollContainerRef = useRef<HTMLDivElement>(null);
    const logoScrollContainerRef = useRef<HTMLDivElement>(null);

    // Calculate EPG Window Time (starts 2 hours ago on the hour, ends 4 hours in the future)
    const [epgStartTime] = useState(() => {
        const t = new Date();
        t.setHours(t.getHours() - 2, 0, 0, 0);
        return t;
    });

    const epgEndTime = new Date(epgStartTime.getTime() + 6 * 3600 * 1000);

    // Debounce search text input changes to eliminate lag
    useEffect(() => {
        const delayTimer = setTimeout(() => {
            setSearchQuery(searchText);
        }, 250);
        return () => clearTimeout(delayTimer);
    }, [searchText]);

    // Realtime time updates for the vertical line
    useEffect(() => {
        const timer = setInterval(() => {
            setNow(new Date());
        }, 15000);
        return () => clearInterval(timer);
    }, []);

    // Load channels dynamically based on filters
    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError(null);

        const fetchChannels = async () => {
            try {
                let url = "";
                if (selectedCat !== "ALL") {
                    url = `https://iptv-org.github.io/iptv/categories/${selectedCat.toLowerCase()}.m3u`;
                } else if (selectedCountryCode !== "ALL") {
                    url = `https://iptv-org.github.io/iptv/countries/${selectedCountryCode.toLowerCase()}.m3u`;
                } else {
                    url = "https://iptv-org.github.io/iptv/categories/news.m3u";
                }

                const response = await fetch(url);
                if (!response.ok) throw new Error("Could not load playlist data");
                const text = await response.text();
                let results = parseM3U(text);

                if (!isMounted) return;

                if (selectedCat !== "ALL" && selectedCountryCode !== "ALL") {
                    results = results.filter(c => c.country?.toUpperCase() === selectedCountryCode.toUpperCase());
                }

                const unique: LiveChannel[] = [];
                const urls = new Set<string>();
                results.forEach(c => {
                    if (!urls.has(c.url)) {
                        urls.add(c.url);
                        unique.push(c);
                    }
                });

                setChannels(unique);
                setLoading(false);
            } catch (e) {
                if (isMounted) {
                    setError("Failed to fetch channels for selected criteria.");
                    setLoading(false);
                }
            }
        };

        fetchChannels();
        return () => { isMounted = false; };
    }, [selectedCountryCode, selectedCat]);

    // Parse M3U helper (replicated for isolation)
    const parseM3U = (text: string): LiveChannel[] => {
        const lines = text.split('\n');
        const result: LiveChannel[] = [];
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('#EXTINF:')) {
                const infoLine = lines[i];
                let nameMatch = "Unknown Channel";
                
                const nameParts = infoLine.split(',');
                if (nameParts.length > 1) {
                    nameMatch = nameParts[nameParts.length - 1].trim();
                }
                
                const logoMatch = infoLine.match(/tvg-logo="([^"]+)"/i);
                const groupMatch = infoLine.match(/group-title="([^"]+)"/i);
                const countryMatch = infoLine.match(/tvg-country="([^"]+)"/i);
                
                let url = "";
                for (let j = i + 1; j < lines.length; j++) {
                    const nextLine = lines[j].trim();
                    if (nextLine && !nextLine.startsWith('#')) {
                        url = nextLine;
                        i = j;
                        break;
                    }
                }

                if (url) {
                    const urlSuffix = url.replace(/[^a-zA-Z0-9]/g, '').slice(-32);
                    result.push({
                        id: `grid-${result.length}-${urlSuffix}`,
                        name: nameMatch,
                        logo: logoMatch ? logoMatch[1] : "",
                        group: groupMatch ? groupMatch[1] : "",
                        country: countryMatch ? countryMatch[1] : undefined,
                        url: url
                    });
                }
            }
        }
        return result;
    };

    // Calculate horizontal offsets
    const getXPosition = useCallback((time: Date) => {
        const diffMs = time.getTime() - epgStartTime.getTime();
        const diffMins = diffMs / (60 * 1000);
        return diffMins * (HOUR_WIDTH / 60);
    }, [epgStartTime]);

    // Keep horizontal and vertical scrolls in sync
    const handleGridScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollTop = e.currentTarget.scrollTop;
        const scrollLeft = e.currentTarget.scrollLeft;

        if (timelineScrollContainerRef.current) {
            timelineScrollContainerRef.current.scrollLeft = scrollLeft;
        }
        if (logoScrollContainerRef.current) {
            logoScrollContainerRef.current.scrollTop = scrollTop;
        }
    };

    // Redirect logo column wheel scroll events to main grid
    const handleLogosWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (gridScrollContainerRef.current) {
            gridScrollContainerRef.current.scrollTop += e.deltaY;
        }
    };

    // Filter channels client-side by search query
    const filteredChannels = channels.filter(c => 
        cleanChannelName(c.name).toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 50);

    // Render timeline hour headers
    const timelineHours: Date[] = [];
    for (let i = 0; i < 6; i++) {
        timelineHours.push(new Date(epgStartTime.getTime() + i * 3600 * 1000));
    }

    const currentIndicatorPos = getXPosition(now);

    return (
        <div className="fixed inset-0 z-[120] bg-[#07070a]/98 backdrop-blur-3xl flex flex-col text-white animate-in fade-in duration-300 select-none">
            {/* EPG Grid Header */}
            <div className="h-16 px-6 border-b border-white/10 flex items-center justify-between bg-black/50">
                <div className="flex items-center gap-3">
                    <span className="w-1.5 h-5 rounded-full bg-red-600 shadow-[0_0_8px_rgba(239,68,68,0.7)]" />
                    <div className="text-left flex items-center gap-3">
                        <h2 className="text-base font-semibold tracking-tight text-white">Interactive TV Guide</h2>
                        <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-600/20 border border-red-500/30 text-[10px] font-semibold text-red-400 uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            Live Broadcasts
                        </span>
                    </div>
                </div>
                
                <button 
                    onClick={onClose}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-all flex items-center justify-center active:scale-95 border border-white/10"
                    title="Close Guide"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Filter and Search Bar Row */}
            <div className="h-16 px-6 border-b border-white/5 bg-[#09090d]/80 backdrop-blur-xl flex items-center justify-between gap-4 select-none relative z-50">
                {/* Search Input Pill */}
                <div className="flex items-center gap-2.5 px-4 h-10 rounded-full bg-white/[0.04] border border-white/10 focus-within:border-red-500/50 focus-within:ring-1 focus-within:ring-red-500/20 transition-all flex-1 max-w-xs md:max-w-sm">
                    <Search size={14} className="text-zinc-500 shrink-0" />
                    <input 
                        type="text"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder="Search channels or shows..."
                        className="bg-transparent border-none outline-none text-xs text-zinc-200 placeholder-zinc-500 w-full font-normal tracking-wide"
                    />
                    {searchText && (
                        <button 
                            onClick={() => setSearchText("")} 
                            className="text-zinc-500 hover:text-zinc-300 text-xs"
                        >
                            ✕
                        </button>
                    )}
                </div>
                
                {/* Category and Country selectors */}
                <div className="flex items-center gap-2.5">
                    <CustomDropdown 
                        value={selectedCat} 
                        options={CATEGORIES_LIST} 
                        onChange={(val) => setSelectedCat(val)} 
                    />

                    <CustomDropdown 
                        value={selectedCountryCode} 
                        options={COUNTRIES_LIST} 
                        onChange={(val) => setSelectedCountryCode(val)} 
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-[#07070a]">
                    <Loader2 size={36} className="text-red-500 animate-spin" />
                    <p className="text-xs font-normal text-zinc-400 tracking-wider">Loading Broadcast Schedule...</p>
                </div>
            ) : error ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-[#07070a]">
                    <AlertCircle size={40} className="text-red-500" />
                    <p className="text-sm text-zinc-400 font-normal">{error}</p>
                </div>
            ) : (
                <div className="flex-1 flex flex-col overflow-hidden relative z-0">
                    {/* Time Header Bar */}
                    <div className="h-12 border-b border-white/5 flex bg-[#0a0a0e] sticky top-0 z-30 select-none">
                        {/* Channel column header spacer */}
                        <div className="w-56 md:w-64 shrink-0 border-r border-white/5 h-full bg-[#0a0a0e] flex items-center px-4 gap-2 text-zinc-400">
                            <Tv size={14} className="text-red-500" />
                            <span className="text-xs font-semibold text-zinc-300">Channels</span>
                            <span className="text-[10px] text-zinc-500 ml-auto font-normal">({filteredChannels.length})</span>
                        </div>
                        {/* Time Grid Timeline ticks */}
                        <div 
                            ref={timelineScrollContainerRef}
                            className="flex-1 overflow-x-hidden flex scrollbar-none"
                        >
                            <div className="flex relative" style={{ width: `${6 * HOUR_WIDTH}px` }}>
                                {timelineHours.map((hour, idx) => (
                                    <div 
                                        key={idx} 
                                        className="h-full border-r border-white/5 flex flex-col justify-end pb-2.5 px-4 relative text-left" 
                                        style={{ width: `${HOUR_WIDTH}px` }}
                                    >
                                        <span className="text-[11px] font-medium text-zinc-400">
                                            {hour.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                        </span>
                                        {/* Half hour tick mark */}
                                        <div className="absolute right-1/2 bottom-0 w-[1px] h-2 bg-white/10" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Main Grid Viewport */}
                    <div className="flex-1 flex overflow-hidden">
                        {/* Sticky Left Column: Channel Logos & Names */}
                        <div 
                            ref={logoScrollContainerRef}
                            onWheel={handleLogosWheel}
                            className="w-56 md:w-64 shrink-0 flex flex-col border-r border-white/5 bg-[#09090d] overflow-y-hidden z-20 shadow-[10px_0_20px_rgba(0,0,0,0.5)]"
                        >
                            {filteredChannels.map((channel) => (
                                <div 
                                    key={channel.id}
                                    onClick={() => onChannelSelect(channel, channels)}
                                    className="h-[52px] border-b border-white/5 flex items-center gap-2.5 px-3 shrink-0 select-none bg-[#09090d] hover:bg-white/[0.04] transition-colors cursor-pointer group text-left"
                                    title={`Play ${cleanChannelName(channel.name)}`}
                                >
                                    <div className="w-8 h-8 rounded-lg bg-black/80 p-0.5 border border-white/10 flex items-center justify-center shadow-sm relative overflow-hidden shrink-0 group-hover:border-red-500/40 transition-colors">
                                        {channel.logo ? (
                                            <img src={channel.logo} className="max-w-[90%] max-h-[90%] object-contain" alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }}/>
                                        ) : (
                                            <span className="font-semibold text-xs text-red-500">{cleanChannelName(channel.name).charAt(0)}</span>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate transition-colors leading-tight">
                                            {cleanChannelName(channel.name)}
                                        </h4>
                                        <p className="text-[9px] text-zinc-500 capitalize truncate font-normal leading-tight mt-0.5">
                                            {channel.group || channel.country || 'Live TV'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Scrolling EPG Program Grid */}
                        <div 
                            ref={gridScrollContainerRef}
                            onScroll={handleGridScroll}
                            className="flex-1 overflow-auto custom-scrollbar relative bg-[#07070a]"
                        >
                            <div className="relative flex flex-col" style={{ width: `${6 * HOUR_WIDTH}px`, height: `${filteredChannels.length * GRID_HEIGHT_ROW}px` }}>
                                
                                {/* Channel Schedule Rows */}
                                {filteredChannels.map((channel) => {
                                    const schedule = generateEPG(channel);
                                    
                                    // Filter programs that overlap our 6 hour EPG window
                                    const visiblePrograms = schedule.filter(p => 
                                        p.endTime.getTime() > epgStartTime.getTime() && 
                                        p.startTime.getTime() < epgEndTime.getTime()
                                    );

                                    return (
                                        <div 
                                            key={channel.id}
                                            className="h-[52px] border-b border-white/5 relative flex items-center overflow-hidden shrink-0"
                                        >
                                            {visiblePrograms.map((program, pIdx) => {
                                                const startLeft = getXPosition(program.startTime);
                                                const endLeft = getXPosition(program.endTime);
                                                const blockWidth = endLeft - startLeft;

                                                const nowTime = now.getTime();
                                                const isPlayingNow = nowTime >= program.startTime.getTime() && nowTime < program.endTime.getTime();
                                                const isPast = nowTime > program.endTime.getTime();
                                                const progressPercent = isPlayingNow 
                                                    ? Math.min(100, Math.max(0, ((nowTime - program.startTime.getTime()) / (program.endTime.getTime() - program.startTime.getTime())) * 100))
                                                    : 0;

                                                return (
                                                    <div 
                                                        key={pIdx}
                                                        onClick={() => onChannelSelect(channel, channels)}
                                                        className={`absolute top-1 bottom-1 rounded-lg border flex flex-col justify-center px-3 cursor-pointer transition-all duration-200 overflow-hidden select-none text-left group ${
                                                            isPlayingNow
                                                                ? 'bg-gradient-to-r from-red-600/20 via-red-950/30 to-[#121217]/95 border-red-500/40 text-white shadow-[0_2px_14px_rgba(239,68,68,0.18)]'
                                                                : isPast
                                                                    ? 'bg-white/[0.015] border-white/[0.03] text-zinc-600/80 hover:text-zinc-500 hover:bg-white/[0.03]'
                                                                    : 'bg-white/[0.035] hover:bg-white/[0.07] border-white/5 hover:border-white/15 text-zinc-300 hover:text-white'
                                                        }`}
                                                        style={{ 
                                                            left: `${Math.max(0, startLeft)}px`, 
                                                            width: `${Math.max(50, blockWidth - 3)}px` 
                                                        }}
                                                        title={`${program.title} (${program.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${program.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`}
                                                    >
                                                        {/* Program Title */}
                                                        <h4 className={`text-[11px] font-medium leading-tight truncate transition-colors ${isPlayingNow ? 'text-white' : 'text-zinc-200 group-hover:text-white'}`}>
                                                            {program.title}
                                                        </h4>

                                                        {/* Program Timing */}
                                                        <p className="text-[9.5px] text-zinc-400/80 font-normal leading-none mt-1 truncate">
                                                            {program.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} – {program.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                        </p>

                                                        {/* Active Live Broadcast Bottom Progress Bar */}
                                                        {isPlayingNow && (
                                                            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10">
                                                                <div 
                                                                    className="h-full bg-red-600 shadow-[0_0_8px_rgba(239,68,68,0.9)]" 
                                                                    style={{ width: `${progressPercent}%` }} 
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}

                                {/* Vertical Current Time Red indicator line (Renders ON TOP of all program boxes, but under dropdown menu) */}
                                {currentIndicatorPos >= 0 && currentIndicatorPos <= 6 * HOUR_WIDTH && (
                                    <div 
                                        className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-20 pointer-events-none shadow-[0_0_12px_rgba(239,68,68,0.95)]"
                                        style={{ left: `${currentIndicatorPos}px` }}
                                    >
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 absolute top-0 -left-[4px] shadow-[0_0_8px_rgba(239,68,68,1)] animate-pulse" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

