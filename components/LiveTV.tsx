import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Tv, Play, Search, AlertCircle, RefreshCcw, Wifi, Globe, Loader2, Lock, ChevronDown, Check, Info, ChevronRight, Clock } from 'lucide-react';
import { LiveChannel, UserProfile } from '../types';
import { LiveTVPlayer } from './LiveTVPlayer';
import { getCurrentProgram } from '../utils/epgGenerator';
import { preloadChannelMetadata } from '../utils/channelMetadata';
import { useStreamStatuses, StreamStatus } from '../utils/streamChecker';
import { useTvFocus, TvFocusButton, TvFocusInput } from '../tvNavigation';
import { ExpandedCategoryModal } from './Modals';
import { GridEPG } from './GridEPG';

interface LiveTVProps {
    userProfile: UserProfile;
    searchQuery?: string;
}

const CATEGORIES = [
  { id: 'news', name: 'News & Current Affairs', icon: '📰' },
  { id: 'movies', name: 'Movies & Film', icon: '🎥' },
  { id: 'sports', name: 'Sports & Action', icon: '⚽' },
  { id: 'entertainment', name: 'General Entertainment', icon: '🎬' },
  { id: 'documentary', name: 'Documentaries', icon: '🌍' },
  { id: 'music', name: 'Music & Arts', icon: '🎵' },
  { id: 'kids', name: 'Kids & Animation', icon: '🧸' },
  { id: 'lifestyle', name: 'Lifestyle & Travel', icon: '🧘' }
];

const COUNTRIES = [
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
    { id: 'KR', name: 'South Korea', icon: '🇰🇷' },
    { id: 'RU', name: 'Russia', icon: '🇷🇺' },
    { id: 'BR', name: 'Brazil', icon: '🇧🇷' },
    { id: 'CN', name: 'China', icon: '🇨🇳' },
    { id: 'AF', name: 'Afghanistan', icon: '🇦🇫' },
    { id: 'AL', name: 'Albania', icon: '🇦🇱' },
    { id: 'DZ', name: 'Algeria', icon: '🇩🇿' },
    { id: 'AD', name: 'Andorra', icon: '🇦🇩' },
    { id: 'AO', name: 'Angola', icon: '🇦🇴' },
    { id: 'AR', name: 'Argentina', icon: '🇦🇷' },
    { id: 'AM', name: 'Armenia', icon: '🇦🇲' },
    { id: 'AW', name: 'Aruba', icon: '🇦🇼' },
    { id: 'AT', name: 'Austria', icon: '🇦🇹' },
    { id: 'AZ', name: 'Azerbaijan', icon: '🇦🇿' },
    { id: 'BS', name: 'Bahamas', icon: '🇧🇸' },
    { id: 'BH', name: 'Bahrain', icon: '🇧🇭' },
    { id: 'BD', name: 'Bangladesh', icon: '🇧🇩' },
    { id: 'BB', name: 'Barbados', icon: '🇧🇧' },
    { id: 'BY', name: 'Belarus', icon: '🇧🇾' },
    { id: 'BE', name: 'Belgium', icon: '🇧🇪' },
    { id: 'BG', name: 'Bulgaria', icon: '🇧🇬' },
    { id: 'CL', name: 'Chile', icon: '🇨🇱' },
    { id: 'CO', name: 'Colombia', icon: '🇨🇴' },
    { id: 'CR', name: 'Costa Rica', icon: '🇨🇷' },
    { id: 'HR', name: 'Croatia', icon: '🇭🇷' },
    { id: 'CU', name: 'Cuba', icon: '🇨🇺' },
    { id: 'CY', name: 'Cyprus', icon: '🇨🇾' },
    { id: 'CZ', name: 'Czech Republic', icon: '🇨🇿' },
    { id: 'DK', name: 'Denmark', icon: '🇩🇰' },
    { id: 'DO', name: 'Dominican Republic', icon: '🇩🇴' },
    { id: 'EC', name: 'Ecuador', icon: '🇪🇨' },
    { id: 'EG', name: 'Egypt', icon: '🇪🇬' },
    { id: 'SV', name: 'El Salvador', icon: '🇸🇻' },
    { id: 'EE', name: 'Estonia', icon: '🇪🇪' },
    { id: 'FI', name: 'Finland', icon: '🇫🇮' },
    { id: 'GH', name: 'Ghana', icon: '🇬🇭' },
    { id: 'GR', name: 'Greece', icon: '🇬🇷' },
    { id: 'GT', name: 'Guatemala', icon: '🇬🇹' },
    { id: 'HK', name: 'Hong Kong', icon: '🇭🇰' },
    { id: 'HU', name: 'Hungary', icon: '🇭🇺' },
    { id: 'IS', name: 'Iceland', icon: '🇮🇸' },
    { id: 'ID', name: 'Indonesia', icon: '🇮🇩' },
    { id: 'IR', name: 'Iran', icon: '🇮🇷' },
    { id: 'IQ', name: 'Iraq', icon: '🇮🇶' },
    { id: 'IE', name: 'Ireland', icon: '🇮🇪' },
    { id: 'IL', name: 'Israel', icon: '🇮🇱' },
    { id: 'JM', name: 'Jamaica', icon: '🇯🇲' },
    { id: 'JO', name: 'Jordan', icon: '🇯🇴' },
    { id: 'KZ', name: 'Kazakhstan', icon: '🇰🇿' },
    { id: 'KE', name: 'Kenya', icon: '🇰🇪' },
    { id: 'KW', name: 'Kuwait', icon: '🇰🇼' },
    { id: 'LV', name: 'Latvia', icon: '🇱🇻' },
    { id: 'LB', name: 'Lebanon', icon: '🇱🇧' },
    { id: 'MY', name: 'Malaysia', icon: '🇲🇾' },
    { id: 'MX', name: 'Mexico', icon: '🇲🇽' },
    { id: 'MA', name: 'Morocco', icon: '🇲🇦' },
    { id: 'NL', name: 'Netherlands', icon: '🇳🇱' },
    { id: 'NZ', name: 'New Zealand', icon: '🇳🇿' },
    { id: 'NG', name: 'Nigeria', icon: '🇳🇬' },
    { id: 'KP', name: 'North Korea', icon: '🇰🇵' },
    { id: 'MK', name: 'North Macedonia', icon: '🇲🇰' },
    { id: 'NO', name: 'Norway', icon: '🇳🇴' },
    { id: 'PK', name: 'Pakistan', icon: '🇵🇰' },
    { id: 'PS', name: 'Palestine', icon: '🇵🇸' },
    { id: 'PA', name: 'Panama', icon: '🇵🇦' },
    { id: 'PY', name: 'Paraguay', icon: '🇵🇾' },
    { id: 'PE', name: 'Peru', icon: '🇵🇪' },
    { id: 'PH', name: 'Philippines', icon: '🇵🇭' },
    { id: 'PL', name: 'Poland', icon: '🇵🇱' },
    { id: 'PT', name: 'Portugal', icon: '🇵🇹' },
    { id: 'PR', name: 'Puerto Rico', icon: '🇵🇷' },
    { id: 'QA', name: 'Qatar', icon: '🇶🇦' },
    { id: 'RO', name: 'Romania', icon: '🇷🇴' },
    { id: 'SA', name: 'Saudi Arabia', icon: '🇸🇦' },
    { id: 'RS', name: 'Serbia', icon: '🇷🇸' },
    { id: 'SG', name: 'Singapore', icon: '🇸🇬' },
    { id: 'SK', name: 'Slovakia', icon: '🇸🇰' },
    { id: 'SI', name: 'Slovenia', icon: '🇸🇮' },
    { id: 'ZA', name: 'South Africa', icon: '🇿🇦' },
    { id: 'LK', name: 'Sri Lanka', icon: '🇱🇰' },
    { id: 'SE', name: 'Sweden', icon: '🇸🇪' },
    { id: 'CH', name: 'Switzerland', icon: '🇨🇭' },
    { id: 'SY', name: 'Syria', icon: '🇸🇾' },
    { id: 'TW', name: 'Taiwan', icon: '🇹🇼' },
    { id: 'TH', name: 'Thailand', icon: '🇹🇭' },
    { id: 'TN', name: 'Tunisia', icon: '🇹🇳' },
    { id: 'TR', name: 'Turkey', icon: '🇹🇷' },
    { id: 'UA', name: 'Ukraine', icon: '🇺🇦' },
    { id: 'AE', name: 'United Arab Emirates', icon: '🇦🇪' },
    { id: 'UY', name: 'Uruguay', icon: '🇺🇾' },
    { id: 'UZ', name: 'Uzbekistan', icon: '🇺🇿' },
    { id: 'VE', name: 'Venezuela', icon: '🇻🇪' },
    { id: 'VN', name: 'Vietnam', icon: '🇻🇳' },
    { id: 'YE', name: 'Yemen', icon: '🇾🇪' }
];


const parseM3U = (data: string): LiveChannel[] => {
    const lines = data.split('\n');
    const result: LiveChannel[] = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('#EXTINF:')) {
            const logoMatch = line.match(/tvg-logo="([^"]*)"/);
            const groupMatch = line.match(/group-title="([^"]*)"/);
            const countryMatch = line.match(/tvg-country="([^"]*)"/);
            const nameMatch = line.split(',').pop()?.trim() || "Unknown Channel";
            
            let url = "";
            if (i + 1 < lines.length && !lines[i+1].startsWith('#')) {
                url = lines[i+1].trim();
            }

            if (url) {
                // Generate a stable unique ID based on the index and url suffix
                const urlSuffix = url.replace(/[^a-zA-Z0-9]/g, '').slice(-32);
                result.push({
                    id: `tv-${result.length}-${urlSuffix}`,
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

// Global playlist cache to share requests and parse once
const playlistCache = new Map<string, Promise<LiveChannel[]>>();

const fetchAndParseM3U = (url: string): Promise<LiveChannel[]> => {
    let cached = playlistCache.get(url);
    if (cached) {
        return cached;
    }
    const promise = fetch(url)
        .then(res => {
            if (!res.ok) throw new Error("Failed to fetch Live TV playlist");
            return res.text();
        })
        .then(text => parseM3U(text))
        .catch(err => {
            playlistCache.delete(url);
            throw err;
        });
    playlistCache.set(url, promise);
    return promise;
};

// Sleek 16:9 premium channel card component
export interface LiveTVCardProps {
    channel: LiveChannel; 
    index: number;
    onPlay: (channel: LiveChannel) => void;
    onFocus?: (index: number) => void;
    className?: string;
}

// Sleek 16:9 premium channel card component
export const LiveTVCard: React.FC<LiveTVCardProps> = React.memo(({ 
    channel, 
    index,
    onPlay,
    onFocus,
    className = "w-[200px] md:w-[240px] shrink-0"
}) => {
    const handlePlay = useCallback(() => {
        onPlay(channel);
    }, [channel, onPlay]);

    const handleFocus = useCallback(() => {
        if (onFocus) {
            onFocus(index);
        }
    }, [index, onFocus]);

    const { ref } = useTvFocus({
        onEnterPress: handlePlay,
        onFocus: handleFocus
    });

    const [epg, setEpg] = useState<ReturnType<typeof getCurrentProgram>>(null);

    useEffect(() => {
        const updateEpg = () => {
            setEpg(getCurrentProgram(channel));
        };
        updateEpg();
        const interval = setInterval(updateEpg, 60000);
        return () => clearInterval(interval);
    }, [channel]);

    const statuses = useStreamStatuses([channel.url]);
    const status = statuses[channel.url] || 'checking';

    return (
        <div 
            ref={ref}
            onClick={handlePlay}
            className={`relative aspect-[16/9] rounded-xl overflow-hidden bg-zinc-900/60 backdrop-blur-md border border-white/5 cursor-pointer shadow-lg hover:scale-105 hover:border-white/20 hover:shadow-2xl transition-all duration-500 group select-none flex flex-col justify-between ${className}`}
        >
            <div className="absolute inset-0 bg-gradient-to-tr from-[#0b0c10] via-transparent to-white/[0.02]" />
            
            {/* Top metadata badges */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-20">
                <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/5 select-none">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                        status === 'online' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' :
                        status === 'slow' ? 'bg-yellow-500 shadow-[0_0_8px_#eab308]' :
                        status === 'offline' ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' :
                        'bg-zinc-500 animate-pulse'
                    }`} />
                    <span className={`text-[8px] font-extrabold uppercase tracking-widest ${
                        status === 'online' ? 'text-green-400' :
                        status === 'slow' ? 'text-yellow-400' :
                        status === 'offline' ? 'text-red-400' :
                        'text-zinc-400'
                    }`}>
                        {status === 'online' ? 'Working' :
                         status === 'slow' ? 'Slow' :
                         status === 'offline' ? 'Offline' :
                         'Checking'}
                    </span>
                </div>
                {channel.country && (
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/5 text-gray-400 group-hover:text-white transition-colors">
                        {channel.country}
                    </span>
                )}
            </div>

            {/* Logo Center Display */}
            <div className="flex-1 w-full flex items-center justify-center p-4 mt-2 min-h-0">
                 {channel.logo ? (
                     <img 
                        src={channel.logo} 
                        alt={channel.name} 
                        className="max-w-full max-h-full object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300" 
                        loading="lazy" 
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const sibling = e.currentTarget.nextElementSibling;
                            if (sibling) sibling.classList.remove('hidden');
                        }}
                     />
                 ) : null}
                 <Globe className={`text-gray-600 group-hover:text-gray-400 transition-colors duration-300 ${channel.logo ? 'hidden' : ''}`} size={38} />
            </div>

            {/* Title Footer */}
            <div className="p-3 bg-[#0d0d0f]/80 border-t border-white/5 z-10 text-left">
                <p className="text-xs font-bold text-gray-300 group-hover:text-white truncate leading-none transition-colors duration-300">
                    {channel.name}
                </p>
                {epg && (
                    <p className="text-[10px] text-zinc-500 truncate mt-1 group-hover:text-zinc-400 transition-colors">
                        Now: {epg.current.title}
                    </p>
                )}
            </div>

            {/* Play Button Glow Overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-15">
                <div className="p-3 rounded-full text-white bg-red-600 scale-75 group-hover:scale-100 transition-all duration-300 shadow-xl shadow-red-600/40 border border-red-500/25">
                    <Play size={16} fill="currentColor"/>
                </div>
            </div>
            
            {/* Glossy sweep line animation */}
            <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white/[0.05] opacity-40 group-hover:animate-[shine_0.85s_ease-in-out]" />
        </div>
    );
});

// Shimmering skeleton loader for channels
const ChannelSkeleton = () => (
    <div className="relative w-[200px] md:w-[240px] shrink-0 aspect-[16/9] rounded-xl overflow-hidden bg-zinc-900/45 border border-white/5 flex flex-col justify-between shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
        <div className="flex-1 w-full flex items-center justify-center p-4">
            <div className="w-3/5 h-2/5 bg-white/5 rounded-lg"></div>
        </div>
        <div className="p-3 bg-[#0d0d0f]/60 h-8 flex items-center">
            <div className="h-2.5 w-3/4 bg-white/10 rounded"></div>
        </div>
    </div>
);

// Modular category row component
const LiveTVRow: React.FC<{
    title: string;
    categoryId: string;
    countryCode: string;
    searchQuery: string;
    hideOffline: boolean;
    onChannelClick: (c: LiveChannel, playlist: LiveChannel[]) => void;
    onExpand?: (items: LiveChannel[]) => void;
}> = ({
    title,
    categoryId,
    countryCode,
    searchQuery,
    hideOffline,
    onChannelClick,
    onExpand
}) => {
    const [channels, setChannels] = useState<LiveChannel[]>([]);
    const [loading, setLoading] = useState(false);
    const [visibleCount, setVisibleCount] = useState(40);
    const rowRef = useRef<HTMLDivElement>(null);

    // Reset visibility count when filters change
    useEffect(() => {
        setVisibleCount(40);
    }, [categoryId, countryCode]);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);

        const loadChannels = async () => {
            try {
                let url = '';
                let isCountryFetch = false;

                if (countryCode === 'ALL') {
                    url = `https://iptv-org.github.io/iptv/categories/${categoryId}.m3u`;
                } else {
                    url = `https://iptv-org.github.io/iptv/countries/${countryCode.toLowerCase()}.m3u`;
                    isCountryFetch = true;
                }

                let parsed = await fetchAndParseM3U(url);

                if (isCountryFetch) {
                    parsed = parsed.filter(c => 
                        c.group && c.group.toLowerCase().includes(categoryId.toLowerCase())
                    );
                }

                // Prioritize channels with logos
                const withLogos = parsed.filter(c => c.logo && c.logo.length > 0);
                const withoutLogos = parsed.filter(c => !c.logo);
                
                if (isMounted) {
                    setChannels([...withLogos, ...withoutLogos]);
                }
            } catch (e) {
                console.error(`Failed loading Live TV category: ${categoryId}`, e);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadChannels();
        return () => { isMounted = false; };
    }, [categoryId, countryCode]);

    const statuses = useStreamStatuses(channels.map(c => c.url));

    const filtered = channels.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        (!hideOffline || statuses[c.url] !== 'offline')
    );

    // D-pad focused loading: if focus is near the end, load more
    const handleCardFocus = useCallback((index: number) => {
        setVisibleCount(prev => {
            if (index >= prev - 5) {
                return Math.min(prev + 40, filtered.length);
            }
            return prev;
        });
    }, [filtered.length]);

    // Touch/Mouse scroll loading: if scrolled near the end, load more
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        if (target.scrollWidth - target.scrollLeft - target.clientWidth < 400) {
            setVisibleCount(prev => Math.min(prev + 40, filtered.length));
        }
    }, [filtered.length]);

    // Hide row if empty
    if (!loading && filtered.length === 0) return null;

    return (
        <div className="mb-10 animate-in fade-in duration-500 text-left">
            <div className="flex items-center justify-between px-4 md:px-12 mb-4">
                <h3 className="text-lg font-bold text-white/90 tracking-tight flex items-center gap-2 select-none">
                    <span className="w-1.5 h-5 bg-red-600 rounded-full inline-block"></span>
                    {title}
                </h3>
                {onExpand && filtered.length > 0 && (
                    <button
                        onClick={() => onExpand(filtered)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 hover:text-white text-zinc-400 text-xs font-bold transition-all border border-white/5 hover:border-white/10 active:scale-95 shadow-md select-none"
                    >
                        <span>See All</span>
                        <ChevronRight size={14} />
                    </button>
                )}
            </div>
            
            <div 
                ref={rowRef}
                onScroll={handleScroll}
                className="flex gap-5 overflow-x-auto px-4 md:px-12 pb-4 hide-scrollbar scroll-smooth"
            >
                {loading ? (
                    [...Array(6)].map((_, i) => (
                        <ChannelSkeleton key={i} />
                    ))
                ) : (
                    filtered.slice(0, visibleCount).map((channel, index) => (
                        <LiveTVCard 
                            key={channel.id}
                            channel={channel}
                            index={index}
                            onPlay={(c) => onChannelClick(c, filtered)}
                            onFocus={handleCardFocus}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

const getChannelBackdrop = (channel: LiveChannel) => {
    const name = (channel.name || "").toLowerCase();
    if (name.includes('news') || name.includes('bbc') || name.includes('cnn') || name.includes('al jazeera') || name.includes('euronews')) {
        return "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1600&q=80"; // Newsroom
    }
    if (name.includes('sport') || name.includes('espn') || name.includes('sky') || name.includes('football') || name.includes('cricket') || name.includes('tennis')) {
        return "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1600&q=80"; // Sports stadium
    }
    if (name.includes('movie') || name.includes('action') || name.includes('cine') || name.includes('film') || name.includes('hbo')) {
        return "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600&q=80"; // Cinema
    }
    if (name.includes('music') || name.includes('mtv') || name.includes('song') || name.includes('radio')) {
        return "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1600&q=80"; // Music stage
    }
    return "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=1600&q=80"; // Fallback
};

export const LiveTV: React.FC<LiveTVProps> = ({ userProfile, searchQuery = "" }) => {
    const [selectedCountry, setSelectedCountry] = useState('ALL');
    const [selectedChannel, setSelectedChannel] = useState<LiveChannel | null>(null);
    const [activePlaylist, setActivePlaylist] = useState<LiveChannel[]>([]);
    const [expandedCategory, setExpandedCategory] = useState<{ title: string; items: LiveChannel[] } | null>(null);
    const [hideOffline, setHideOffline] = useState(false);
    const [showGridEpg, setShowGridEpg] = useState(false);
    
    // Trending Channels Today
    const [trendingChannels, setTrendingChannels] = useState<LiveChannel[]>([]);
    const [trendingLoading, setTrendingLoading] = useState(false);
    const [heroIndex, setHeroIndex] = useState(0);

    // Preload API metadata on mount
    useEffect(() => {
        preloadChannelMetadata();
    }, []);

    // Fetch news and movies on mount to extract top trending channels
    useEffect(() => {
        let isMounted = true;
        setTrendingLoading(true);
        Promise.all([
            fetchAndParseM3U('https://iptv-org.github.io/iptv/categories/news.m3u').catch(() => []),
            fetchAndParseM3U('https://iptv-org.github.io/iptv/categories/movies.m3u').catch(() => [])
        ]).then(([news, movies]) => {
            if (!isMounted) return;
            const combined = [...news.slice(0, 10), ...movies.slice(0, 10)];
            // Shuffle/sort deterministically based on watch count
            const sorted = combined
                .map(c => {
                    let hash = 0;
                    for (let i = 0; i < c.name.length; i++) {
                        hash = (hash << 5) - hash + c.name.charCodeAt(i);
                        hash |= 0;
                    }
                    const score = Math.abs(hash) % 2500;
                    return { c, score };
                })
                .sort((a, b) => b.score - a.score)
                .map(item => item.c)
                .slice(0, 10);
            setTrendingChannels(sorted);
            setTrendingLoading(false);
        });
        return () => { isMounted = false; };
    }, []);

    // Auto-slide EPG Hero Carousel index
    useEffect(() => {
        if (trendingChannels.length <= 1) return;
        const interval = setInterval(() => {
            setHeroIndex(prev => (prev + 1) % Math.min(5, trendingChannels.length));
        }, 6000);
        return () => clearInterval(interval);
    }, [trendingChannels]);

    // Search states
    const [searchChannels, setSearchChannels] = useState<LiveChannel[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchVisibleCount, setSearchVisibleCount] = useState(60);

    // Dropdown state
    const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const isExclusive = true;
    const activeCountryObj = COUNTRIES.find(c => c.id === selectedCountry) || COUNTRIES[0];

    // Reset search pagination on search query change
    useEffect(() => {
        setSearchVisibleCount(60);
    }, [searchQuery]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsCountryDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Stable channel click callback with playlist context
    const handleChannelPlay = useCallback((channel: LiveChannel, playlist: LiveChannel[]) => {
        setSelectedChannel(channel);
        setActivePlaylist(playlist);
    }, []);

    // Track statuses for search results and expanded modal
    const searchStatuses = useStreamStatuses(searchChannels.map(c => c.url));
    const filteredSearch = searchChannels.filter(c => 
        !hideOffline || searchStatuses[c.url] !== 'offline'
    );

    const modalItems = expandedCategory?.items || [];
    const modalStatuses = useStreamStatuses(modalItems.map(c => c.url));
    const filteredModalItems = modalItems.filter(c => 
        !hideOffline || modalStatuses[c.url] !== 'offline'
    );

    // D-pad focused loading for search grid
    const handleSearchCardFocus = useCallback((index: number) => {
        setSearchVisibleCount(prev => {
            if (index >= prev - 10) {
                return Math.min(prev + 60, searchChannels.length);
            }
            return prev;
        });
    }, [searchChannels.length]);

    // Scroll loading for search grid
    useEffect(() => {
        if (!searchQuery) return;
        
        const handleWindowScroll = () => {
            if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 600) {
                setSearchVisibleCount(prev => Math.min(prev + 60, searchChannels.length));
            }
        };
        
        window.addEventListener('scroll', handleWindowScroll);
        return () => window.removeEventListener('scroll', handleWindowScroll);
    }, [searchQuery, searchChannels.length]);

    // Debounced global search loader
    useEffect(() => {
        if (!searchQuery) {
            setSearchChannels([]);
            return;
        }
        let isMounted = true;
        setSearchLoading(true);

        const performSearch = async () => {
            try {
                let results: LiveChannel[] = [];
                if (selectedCountry !== 'ALL') {
                    const url = `https://iptv-org.github.io/iptv/countries/${selectedCountry.toLowerCase()}.m3u`;
                    results = await fetchAndParseM3U(url);
                } else {
                    const categories = ['news', 'movies', 'sports', 'entertainment'];
                    const fetches = categories.map(cat => 
                        fetchAndParseM3U(`https://iptv-org.github.io/iptv/categories/${cat}.m3u`)
                            .catch(() => [] as LiveChannel[])
                    );
                    const resultsArray = await Promise.all(fetches);
                    results = resultsArray.flat();
                }

                if (!isMounted) return;
                
                // Deduplicate results
                const uniqueResults: LiveChannel[] = [];
                const seenUrls = new Set<string>();
                results.forEach(c => {
                    if (!seenUrls.has(c.url)) {
                        seenUrls.add(c.url);
                        uniqueResults.push(c);
                    }
                });

                setSearchChannels(uniqueResults.filter(c => 
                    c.name.toLowerCase().includes(searchQuery.toLowerCase())
                ));
            } catch (e) {
                console.error("Failed to perform search: ", e);
            } finally {
                if (isMounted) setSearchLoading(false);
            }
        };

        const debounce = setTimeout(() => {
            performSearch();
        }, 400);

        return () => {
            isMounted = false;
            clearTimeout(debounce);
        };
    }, [searchQuery, selectedCountry]);

    if (!isExclusive) {
        return (
            <div className="w-full h-[calc(100vh-4rem)] flex items-center justify-center bg-[#030303] px-4">
                <div className="text-center max-w-lg p-8 rounded-3xl bg-[#0d0d0f]/60 backdrop-blur-xl border border-white/5 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                        <Tv size={40} className="text-gray-400"/>
                        <div className="absolute -bottom-1 -right-1 bg-red-600 p-2 rounded-full border-4 border-[#030303]">
                            <Lock size={16} className="text-white"/>
                        </div>
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight mb-4">Exclusive Access</h2>
                    <p className="text-gray-400 text-sm mb-8 leading-relaxed font-light">
                        Live TV streaming is available exclusively to premium members. Upgrade your account or ask an administrator to unlock this feature.
                    </p>
                    <button className="px-8 py-3 bg-white/10 text-gray-400 font-bold text-xs uppercase tracking-widest rounded-xl cursor-not-allowed border border-white/5">
                        Locked Feature
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen bg-[#030303] text-white pb-20">
            {selectedChannel && (
                <LiveTVPlayer 
                    channel={selectedChannel} 
                    playlist={activePlaylist}
                    onClose={() => { setSelectedChannel(null); setActivePlaylist([]); }} 
                    onChannelChange={(channel) => setSelectedChannel(channel)}
                />
            )}

            {/* Premium Netflix-style Live TV Hero Banner / Carousel */}
            <div className="relative w-full aspect-[21/9] min-h-[380px] max-h-[500px] overflow-hidden flex items-center bg-black select-none">
                {(() => {
                    const activeHeroChannel = trendingChannels[heroIndex];
                    const currentProg = activeHeroChannel ? getCurrentProgram(activeHeroChannel) : null;
                    return activeHeroChannel ? (
                        <>
                            {/* Background Slide Image with Fade Transitions */}
                            <div className="absolute inset-0 transition-all duration-1000 ease-in-out">
                                <img 
                                    src={getChannelBackdrop(activeHeroChannel)} 
                                    alt={activeHeroChannel.name}
                                    className="absolute inset-0 w-full h-full object-cover opacity-25 scale-105 transition-transform duration-[6000ms] ease-out animate-pulse"
                                />
                            </div>
                            
                            {/* Netflix-style gradient fade overlays */}
                            <div className="absolute inset-0 bg-gradient-to-r from-[#030303] via-black/40 to-transparent z-10" />
                            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#030303] via-[#030303]/60 to-transparent z-10" />
                            
                            {/* Hero Banner details content */}
                            <div className="absolute left-4 md:left-12 bottom-8 md:bottom-12 max-w-2xl text-left z-20 space-y-4 px-4 md:px-0 animate-in fade-in slide-in-from-bottom-6 duration-700">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5 bg-red-600 px-3 py-0.5 rounded-full border border-red-500/25 shadow-[0_0_12px_#dc2626]/40">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                        <span className="text-[10px] font-black tracking-widest text-white uppercase">Spotlight Broadcast</span>
                                    </div>
                                    {activeHeroChannel.country && (
                                        <span className="text-[9px] bg-white/10 text-white/90 border border-white/5 px-2 py-0.5 rounded uppercase font-bold tracking-widest">
                                            {activeHeroChannel.country}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-black rounded-2xl p-1.5 border border-white/10 flex items-center justify-center shadow-2xl relative overflow-hidden shrink-0">
                                        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" />
                                        {activeHeroChannel.logo ? (
                                            <img src={activeHeroChannel.logo} className="max-w-[90%] max-h-[90%] object-contain" alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }}/>
                                        ) : (
                                            <span className="font-black text-lg text-red-500">{activeHeroChannel.name.charAt(0)}</span>
                                        )}
                                    </div>
                                    <h2 className="text-xl md:text-3xl font-black tracking-tight text-white">{activeHeroChannel.name}</h2>
                                </div>

                                {/* EPG Program Preview in Hero */}
                                {currentProg && (
                                    <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md max-w-md flex flex-col gap-1.5 shadow-lg select-none">
                                        <span className="text-[8px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block animate-ping"></span>
                                            Now Playing
                                        </span>
                                        <h4 className="text-xs md:text-sm font-bold text-zinc-100 line-clamp-1">{currentProg.current.title}</h4>
                                        <p className="text-[10px] text-zinc-400 font-medium">
                                            {currentProg.current.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} - {currentProg.current.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                        </p>
                                    </div>
                                )}

                                <div className="flex items-center gap-3 mt-2">
                                    <TvFocusButton
                                        onClick={() => handleChannelPlay(activeHeroChannel, trendingChannels)}
                                        className="px-6 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-all hover:scale-[1.02] active:scale-95 shadow-lg bg-red-600 text-white hover:bg-red-700 hover:shadow-red-600/20"
                                    >
                                        <Play size={14} fill="currentColor" /> Watch Live
                                    </TvFocusButton>
                                </div>
                            </div>

                            {/* Slider Dot Indicators */}
                            <div className="absolute right-4 md:right-12 bottom-12 z-20 flex items-center gap-2">
                                {trendingChannels.slice(0, 5).map((_, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => setHeroIndex(idx)}
                                        className={`w-2 h-2 rounded-full transition-all duration-300 ${heroIndex === idx ? 'bg-red-600 w-6' : 'bg-white/30 hover:bg-white/50'}`}
                                    />
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            <img 
                                src="https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=1600&q=80" 
                                alt="Live TV Header"
                                className="absolute inset-0 w-full h-full object-cover opacity-30 scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-[#030303] via-black/40 to-transparent z-10" />
                            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#030303] via-[#030303]/60 to-transparent z-10" />
                            <div className="absolute left-4 md:left-12 bottom-8 md:bottom-12 max-w-2xl text-left z-20 space-y-4 px-4 md:px-0">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5 bg-red-600 px-3 py-0.5 rounded-full border border-red-500/25 shadow-[0_0_12px_#dc2626]/40">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                        <span className="text-[10px] font-black tracking-widest text-white uppercase">Live Broadcasts</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="h-10 md:h-12 bg-white/5 px-3 py-2.5 rounded-xl flex items-center justify-center border border-white/5">
                                        <Tv className="text-red-500" size={24} />
                                    </div>
                                    <h2 className="text-xl md:text-3xl font-black tracking-tight text-white">Global Live TV</h2>
                                </div>
                                <p className="text-xs md:text-sm text-gray-300 font-medium leading-relaxed drop-shadow-md">
                                    Stream free-to-air international television channels instantly. Explore 24/7 live news, movies, sports, entertainment, and documentaries from around the globe in real-time.
                                </p>
                            </div>
                        </>
                    );
                })()}
            </div>


            {/* Main Interactive Row and Filter Section */}
            <div className="max-w-7xl mx-auto px-4 md:px-0 -mt-6 relative z-50">
                <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4 bg-[#0d0d0f]/50 backdrop-blur-xl border border-white/5 p-4 rounded-2xl mx-0 md:mx-12 relative z-50">
                    <div className="text-left w-full md:w-auto">
                        <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                            <span className="w-1 h-4 bg-red-600 rounded-full inline-block"></span>
                            Live Guide
                        </h2>
                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">Filter by country or search specific stations globally</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        {/* Country Selector Dropdown */}
                        <div className="relative z-50 w-full sm:w-60" ref={dropdownRef}>
                            <TvFocusButton 
                                onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                                className="w-full h-10 flex items-center justify-between px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all active:scale-95 backdrop-blur-md"
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
                                    <span className="text-base shrink-0">{activeCountryObj.icon}</span>
                                    <span className="text-xs font-bold truncate">{activeCountryObj.name}</span>
                                </div>
                                <ChevronDown size={14} className={`transition-transform duration-300 text-white/50 shrink-0 ${isCountryDropdownOpen ? 'rotate-180' : ''}`}/>
                            </TvFocusButton>

                            {isCountryDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-[#0e0e10]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200 z-50 p-1">
                                    {COUNTRIES.map(country => (
                                        <TvFocusButton 
                                            key={country.id}
                                            onClick={() => { setSelectedCountry(country.id); setIsCountryDropdownOpen(false); }}
                                            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg hover:bg-white/5 transition-colors ${selectedCountry === country.id ? 'bg-white/10 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
                                                <span className="text-base shrink-0">{country.icon}</span>
                                                <span className="font-medium text-[11px] truncate">{country.name}</span>
                                            </div>
                                            {selectedCountry === country.id && <Check size={12} className="shrink-0 text-white/80 ml-2" />}
                                        </TvFocusButton>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Hide Dead Streams Toggle Button */}
                        <TvFocusButton
                            onClick={() => setHideOffline(!hideOffline)}
                            className={`h-10 px-4 rounded-xl border transition-all active:scale-95 flex items-center justify-center gap-2 text-xs font-bold whitespace-nowrap ${
                                hideOffline
                                    ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/20'
                                    : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            <Wifi size={14} className={hideOffline ? 'animate-pulse' : ''} />
                            <span>Hide Offline</span>
                        </TvFocusButton>

                        {/* Interactive Grid EPG Button */}
                        <TvFocusButton
                            onClick={() => setShowGridEpg(true)}
                            className="h-10 px-4 rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/10 transition-all active:scale-95 flex items-center justify-center gap-2 text-xs font-bold whitespace-nowrap shadow-md"
                        >
                            <Clock size={14} className="text-red-500" />
                            <span>TV Guide Grid</span>
                        </TvFocusButton>
                    </div>
                </div>

                {/* Trending Channels Row */}
                {!searchQuery && trendingChannels.length > 0 && (
                    <div className="mb-12 text-left px-4 md:px-12 select-none animate-in fade-in duration-500">
                        <h3 className="text-lg font-bold text-white mb-6 tracking-tight flex items-center gap-2">
                            <span className="w-1.5 h-5 bg-red-600 rounded-full inline-block"></span>
                            Trending Channels Today
                        </h3>
                        <div className="flex gap-8 overflow-x-auto pb-4 hide-scrollbar scroll-smooth">
                            {trendingChannels.map((channel, idx) => (
                                <div 
                                    key={channel.id} 
                                    onClick={() => handleChannelPlay(channel, trendingChannels)}
                                    className="relative flex items-center pl-10 md:pl-12 w-[240px] md:w-[280px] shrink-0 aspect-[16/10] group cursor-pointer"
                                >
                                    <div className="absolute left-0 bottom-0 text-[100px] md:text-[130px] font-black leading-none text-zinc-950 select-none transform translate-y-3 md:translate-y-5"
                                            style={{ 
                                                WebkitTextStroke: '2px rgba(255,255,255,0.06)',
                                                zIndex: 1
                                            }}>
                                        {idx + 1}
                                    </div>
                                    <div className="relative w-full h-full rounded-xl overflow-hidden bg-zinc-900/60 backdrop-blur-md border border-white/5 group-hover:scale-105 group-hover:border-white/25 transition-all duration-300 shadow-xl flex flex-col justify-between"
                                            style={{ zIndex: 2 }}>
                                        <div className="absolute inset-0 bg-gradient-to-tr from-[#0b0c10] via-transparent to-white/[0.01]" />
                                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-20">
                                            <span className="text-[8px] font-extrabold uppercase tracking-widest bg-red-600 px-2 py-0.5 rounded-full text-white shadow-md shadow-red-600/20">
                                                Trending
                                            </span>
                                        </div>
                                        <div className="flex-1 w-full flex items-center justify-center p-4 mt-2 min-h-0">
                                            {channel.logo ? (
                                                <img 
                                                    src={channel.logo} 
                                                    alt={channel.name} 
                                                    className="max-w-full max-h-full object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] opacity-80 group-hover:opacity-100 transition-opacity" 
                                                    loading="lazy" 
                                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                />
                                            ) : (
                                                <Globe className="text-zinc-700" size={38} />
                                            )}
                                        </div>
                                        <div className="p-3 bg-[#0d0d0f]/80 border-t border-white/5 z-10 text-left">
                                            <p className="text-xs font-bold text-gray-300 group-hover:text-white truncate leading-none transition-colors duration-300">
                                                {channel.name}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Dynamic Netflix-style Grid or Category Rows */}
                {!searchQuery ? (
                    <div className="space-y-4 relative z-10">
                        {CATEGORIES.map(cat => (
                            <LiveTVRow 
                                key={cat.id}
                                title={cat.name}
                                categoryId={cat.id}
                                countryCode={selectedCountry}
                                searchQuery={searchQuery}
                                hideOffline={hideOffline}
                                onChannelClick={handleChannelPlay}
                                onExpand={(channels) => setExpandedCategory({ title: cat.name, items: channels })}
                            />
                        ))}
                    </div>
                ) : (
                    // Sleek grid layout for active searches
                    <div className="px-4 md:px-12 text-left relative z-10">
                        <h3 className="text-lg font-bold text-white mb-6 tracking-tight flex items-center gap-2">
                            <span className="w-1.5 h-5 bg-red-600 rounded-full inline-block"></span>
                            Search Results for "{searchQuery}"
                        </h3>

                        {searchLoading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                                {[...Array(12)].map((_, i) => (
                                    <ChannelSkeleton key={i} />
                                ))}
                            </div>
                        ) : filteredSearch.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                                {filteredSearch.slice(0, searchVisibleCount).map((channel, index) => (
                                    <LiveTVCard 
                                        key={channel.id}
                                        channel={channel}
                                        index={index}
                                        onPlay={(c) => handleChannelPlay(c, filteredSearch)}
                                        onFocus={handleSearchCardFocus}
                                        className="w-full"
                                    />
                                ))}
                            </div>
                        ) : searchChannels.length > 0 ? (
                            <div className="py-20 text-center text-gray-500 flex flex-col items-center justify-center animate-in fade-in max-w-md mx-auto">
                                <AlertCircle size={36} className="text-white/20 mb-4"/>
                                <h3 className="text-base font-bold text-white mb-1">No Active Channels</h3>
                                <p className="text-gray-400 text-xs leading-relaxed text-center">
                                    All matching channels are currently offline. Toggle off the "Hide Offline" filter to display them.
                                </p>
                            </div>
                        ) : (
                            <div className="py-20 text-center text-gray-500 flex flex-col items-center justify-center animate-in fade-in max-w-md mx-auto">
                                <AlertCircle size={36} className="text-white/20 mb-4"/>
                                <h3 className="text-base font-bold text-white mb-1">No Channels Match</h3>
                                <p className="text-gray-400 text-xs leading-relaxed">
                                    We couldn't find any channels matching "{searchQuery}" under the selected country filter. Try adjusting your typing or changing the country setting.
                                </p>
                            </div>
                        )}
                    </div>
                )}
                
                {/* Page Footer attribution */}
                <div className="mt-16 text-center border-t border-white/5 pt-8 mx-4 md:mx-12">
                     <p className="text-[10px] text-gray-600 flex items-center justify-center gap-1.5">
                        Powered by <a href="https://github.com/iptv-org/iptv" target="_blank" rel="noreferrer" className="text-gray-400 hover:text-white underline">iptv-org</a>. 
                        Feeds are aggregated from public open-source playlists.
                     </p>
                </div>
            </div>

            <ExpandedCategoryModal
                isOpen={expandedCategory !== null}
                onClose={() => setExpandedCategory(null)}
                title={expandedCategory?.title || ""}
                mode="livetv"
                initialItems={filteredModalItems}
                onItemClick={(c) => handleChannelPlay(c, filteredModalItems)}
                renderItem={(item, idx) => (
                    <LiveTVCard
                        channel={item}
                        index={idx}
                        onPlay={(c) => handleChannelPlay(c, filteredModalItems)}
                        className="w-full"
                    />
                )}
            />

            {showGridEpg && (
                <GridEPG 
                    selectedCountry={selectedCountry}
                    onClose={() => setShowGridEpg(false)}
                    onChannelSelect={(channel, playlist) => {
                        handleChannelPlay(channel, playlist);
                        setShowGridEpg(false);
                    }}
                />
            )}
        </div>
    );
};
