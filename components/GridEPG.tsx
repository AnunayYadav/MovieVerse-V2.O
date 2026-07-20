import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Clock, Tv, AlertCircle, Loader2, Search, Globe } from 'lucide-react';
import { LiveChannel } from '../types';
import { generateEPG } from '../utils/epgGenerator';

interface GridEPGProps {
    selectedCountry: string;
    onClose: () => void;
    onChannelSelect: (channel: LiveChannel, playlist: LiveChannel[]) => void;
}

const HOUR_WIDTH = 280; // px per hour
const GRID_HEIGHT_ROW = 76; // px per channel row

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
                className="w-5 h-3.5 object-cover rounded-sm shadow-sm shrink-0" 
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
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all text-xs font-normal text-zinc-300 hover:text-zinc-100 outline-none tracking-wide"
            >
                {renderDropdownIcon(activeOption.id, activeOption.icon)}
                <span className="truncate">{activeOption.name}</span>
                <span className="text-zinc-600 text-[8px] ml-1 shrink-0">▼</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-[#0c0c0e]/95 backdrop-blur-2xl border border-white/10 rounded-xl shadow-[0_15px_35px_rgba(0,0,0,0.7)] p-1 z-50 animate-in zoom-in-95 duration-150 max-h-64 overflow-y-auto custom-scrollbar select-none text-left">
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
                                className={`w-full text-left px-3.5 py-2 text-xs rounded-lg transition-all flex items-center gap-2 outline-none ${
                                    isActive
                                        ? 'bg-red-600 text-white font-medium'
                                        : 'text-zinc-300 hover:bg-red-600 hover:text-white hover:font-medium'
                                }`}
                            >
                                {renderDropdownIcon(opt.id, opt.icon)}
                                <span className="font-normal truncate">{opt.name}</span>
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
        }, 300);
        return () => clearTimeout(delayTimer);
    }, [searchText]);

    // Realtime time updates for the vertical line
    useEffect(() => {
        const timer = setInterval(() => {
            setNow(new Date());
        }, 30000);
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
                // Decide which URL playlist to fetch
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

                // Post-filter by country if category was loaded first
                if (selectedCat !== "ALL" && selectedCountryCode !== "ALL") {
                    results = results.filter(c => c.country?.toUpperCase() === selectedCountryCode.toUpperCase());
                }

                // Deduplicate channels
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

    // Seed program images dynamically based on title hash
    const getProgramImage = (title: string) => {
        let hash = 0;
        for (let i = 0; i < title.length; i++) {
            hash = title.charCodeAt(i) + ((hash << 5) - hash);
        }
        const id = Math.abs(hash) % 5;
        const images = [
            "https://images.unsplash.com/photo-1574375927938-d5a98e8fed85?w=150&q=80",
            "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=150&q=80",
            "https://images.unsplash.com/photo-1508847154043-be12a62861c1?w=150&q=80",
            "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=150&q=80",
            "https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=150&q=80"
        ];
        return images[id];
    };

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
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 45); // Limit rendering list size for high performance

    // Render timeline hour headers
    const timelineHours: Date[] = [];
    for (let i = 0; i < 6; i++) {
        timelineHours.push(new Date(epgStartTime.getTime() + i * 3600 * 1000));
    }

    const currentIndicatorPos = getXPosition(now);

    return (
        <div className="fixed inset-0 z-[120] bg-zinc-950/98 backdrop-blur-2xl flex flex-col text-white animate-in fade-in duration-300 select-none">
            {/* EPG Grid Header */}
            <div className="h-16 px-6 border-b border-white/10 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-3">
                    <div className="bg-red-600/10 p-2 rounded-xl border border-red-500/20">
                        <Tv className="text-red-500" size={20} />
                    </div>
                    <div className="text-left">
                        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-200">Interactive TV Guide</h2>
                        <p className="text-[10px] text-zinc-500 mt-0.5">Explore channels and play programs directly from the schedule</p>
                    </div>
                </div>
                
                <button 
                    onClick={onClose}
                    className="text-zinc-400 hover:text-white transition-all active:scale-90 p-1.5 bg-transparent border-none outline-none"
                    title="Close Guide"
                >
                    <X size={24} />
                </button>
            </div>

            {/* Filter and Search Bar Row (Clean & Minimalist Selectors) */}
            <div className="h-14 px-6 border-b border-white/5 bg-zinc-950/60 flex items-center justify-between gap-4 select-none">
                {/* Clean Search Input */}
                <div className="flex items-center gap-2.5 flex-1 max-w-xs md:max-w-sm">
                    <Search size={14} className="text-zinc-500 shrink-0" />
                    <input 
                        type="text"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder="Search guide channels..."
                        className="bg-transparent border-none outline-none text-sm text-zinc-200 placeholder-zinc-500 w-full font-normal tracking-wide"
                    />
                </div>
                
                {/* Thin Category and Country selectors */}
                <div className="flex items-center gap-3">
                    {/* Category Selector Custom Dropdown */}
                    <CustomDropdown 
                        value={selectedCat} 
                        options={CATEGORIES_LIST} 
                        onChange={(val) => setSelectedCat(val)} 
                    />

                    <span className="text-zinc-800 text-xs">|</span>

                    {/* Country Selector Custom Dropdown */}
                    <CustomDropdown 
                        value={selectedCountryCode} 
                        options={COUNTRIES_LIST} 
                        onChange={(val) => setSelectedCountryCode(val)} 
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-zinc-950">
                    <Loader2 size={36} className="text-red-500 animate-spin" />
                    <p className="text-xs font-light text-zinc-500 uppercase tracking-widest animate-pulse">Loading TV Schedule Grid...</p>
                </div>
            ) : error ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-zinc-950">
                    <AlertCircle size={40} className="text-red-500" />
                    <p className="text-sm text-zinc-400 font-light">{error}</p>
                </div>
            ) : (
                <div className="flex-1 flex flex-col overflow-hidden relative">
                    {/* Time Header Bar */}
                    <div className="h-12 border-b border-white/5 flex bg-black/60 sticky top-0 z-30 select-none">
                        {/* Empty spacing box over channels column */}
                        <div className="w-24 md:w-32 shrink-0 border-r border-white/5 h-full bg-zinc-950 flex items-center justify-center">
                            <Clock size={14} className="text-zinc-500" />
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
                                        className="h-full border-r border-white/5 flex flex-col justify-end pb-2 px-4 relative text-left" 
                                        style={{ width: `${HOUR_WIDTH}px` }}
                                    >
                                        <span className="text-[10px] font-light text-zinc-400">
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
                        {/* Sticky Left Column: Channel Logos (Scrolled programmatically) */}
                        <div 
                            ref={logoScrollContainerRef}
                            onWheel={handleLogosWheel}
                            className="w-24 md:w-32 shrink-0 flex flex-col border-r border-white/5 bg-zinc-950 overflow-y-hidden z-20 shadow-[8px_0_15px_rgba(0,0,0,0.4)]"
                        >
                            {filteredChannels.map((channel) => (
                                <div 
                                    key={channel.id}
                                    className="h-[76px] border-b border-white/5 flex items-center justify-center p-3 shrink-0 select-none bg-zinc-950"
                                >
                                    <div className="w-12 h-12 bg-black rounded-xl p-1 border border-white/10 flex items-center justify-center shadow-lg relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" />
                                        {channel.logo ? (
                                            <img src={channel.logo} className="max-w-[90%] max-h-[90%] object-contain" alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }}/>
                                        ) : (
                                            <span className="font-light text-sm text-red-500">{channel.name.charAt(0)}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Scrolling EPG Program Grid */}
                        <div 
                            ref={gridScrollContainerRef}
                            onScroll={handleGridScroll}
                            className="flex-1 overflow-auto custom-scrollbar relative bg-zinc-950"
                        >
                            <div className="relative flex flex-col" style={{ width: `${6 * HOUR_WIDTH}px`, height: `${filteredChannels.length * GRID_HEIGHT_ROW}px` }}>
                                
                                {/* Vertical Current Time Red pulsing indicator line */}
                                {currentIndicatorPos >= 0 && currentIndicatorPos <= 6 * HOUR_WIDTH && (
                                    <div 
                                        className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-10 pointer-events-none shadow-[0_0_10px_#ef4444]/80"
                                        style={{ left: `${currentIndicatorPos}px` }}
                                    >
                                        <div className="w-2 h-2 rounded-full bg-red-500 absolute top-0 -left-[3px] shadow-[0_0_8px_#ef4444] animate-pulse" />
                                    </div>
                                )}

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
                                            className="h-[76px] border-b border-white/5 relative flex items-center overflow-hidden shrink-0 group/row"
                                        >
                                            {visiblePrograms.map((program, pIdx) => {
                                                const startLeft = getXPosition(program.startTime);
                                                const endLeft = getXPosition(program.endTime);
                                                const blockWidth = endLeft - startLeft;

                                                const isPlayingNow = now >= program.startTime && now < program.endTime;
                                                const isPast = now > program.endTime;

                                                return (
                                                    <div 
                                                        key={pIdx}
                                                        onClick={() => onChannelSelect(channel, channels)}
                                                        className={`absolute top-1.5 bottom-1.5 rounded-xl border flex items-center gap-3 px-3.5 cursor-pointer transition-all duration-300 overflow-hidden select-none text-left ${
                                                            isPlayingNow
                                                                ? 'bg-gradient-to-r from-red-700/95 to-rose-600/90 border-red-500/30 text-white z-10 shadow-lg shadow-red-950/40 scale-[1.01]'
                                                                : isPast
                                                                    ? 'bg-black/40 border-white/5 text-zinc-500 opacity-40 hover:opacity-60'
                                                                    : 'bg-[#18181b]/50 border-white/5 text-zinc-400 hover:bg-[#1f1f23]/70 hover:text-zinc-200'
                                                        }`}
                                                        style={{ 
                                                            left: `${Math.max(0, startLeft)}px`, 
                                                            width: `${blockWidth}px` 
                                                        }}
                                                        title={`${program.title} (${program.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${program.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`}
                                                    >
                                                        {/* Thumbnail for Currently Playing Show */}
                                                        {isPlayingNow && blockWidth > 140 && (
                                                            <div className="w-12 h-8 rounded-lg overflow-hidden shrink-0 border border-white/10 shadow-md">
                                                                <img 
                                                                    src={getProgramImage(program.title)} 
                                                                    className="w-full h-full object-cover" 
                                                                    alt="" 
                                                                />
                                                            </div>
                                                        )}

                                                        <div className="min-w-0 flex-1">
                                                            <h4 className="text-[11px] font-medium leading-tight truncate">
                                                                {program.title}
                                                            </h4>
                                                            <p className="text-[8px] font-light mt-0.5 opacity-60 leading-none truncate">
                                                                {program.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} - {program.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
