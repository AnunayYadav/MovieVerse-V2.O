import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Tv, Play, Search, AlertCircle, RefreshCcw, Wifi, Globe, Loader2, Lock, ChevronDown, Check, Info, ChevronRight, Clock, Calendar } from 'lucide-react';
import { LiveChannel, UserProfile } from '../types';
import { LiveTVPlayer } from './LiveTVPlayer';
import { getCurrentProgram } from '../utils/epgGenerator';
import { preloadChannelMetadata } from '../utils/channelMetadata';
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

const LANGUAGES = [
    { id: 'ALL', name: 'All Languages', icon: '🌐' },
    { id: 'hin', name: 'Hindi', icon: '🇮🇳' },
    { id: 'eng', name: 'English', icon: '🇬🇧' },
    { id: 'spa', name: 'Spanish', icon: '🇪🇸' },
    { id: 'fra', name: 'French', icon: '🇫🇷' },
    { id: 'deu', name: 'German', icon: '🇩🇪' },
    { id: 'ita', name: 'Italian', icon: '🇮🇹' },
    { id: 'jpn', name: 'Japanese', icon: '🇯🇵' },
    { id: 'kor', name: 'Korean', icon: '🇰🇷' },
    { id: 'zho', name: 'Chinese', icon: '🇨🇳' },
    { id: 'rus', name: 'Russian', icon: '🇷🇺' },
    { id: 'por', name: 'Portuguese', icon: '🇧🇷' },
    { id: 'ara', name: 'Arabic', icon: '🇸🇦' },
    { id: 'tam', name: 'Tamil', icon: '🇮🇳' },
    { id: 'tel', name: 'Telugu', icon: '🇮🇳' },
    { id: 'mal', name: 'Malayalam', icon: '🇮🇳' },
    { id: 'kan', name: 'Kannada', icon: '🇮🇳' },
    { id: 'ben', name: 'Bengali', icon: '🇧🇩' },
    { id: 'mar', name: 'Marathi', icon: '🇮🇳' },
    { id: 'pan', name: 'Punjabi', icon: '🇮🇳' },
    { id: 'urd', name: 'Urdu', icon: '🇵🇰' },
    { id: 'tur', name: 'Turkish', icon: '🇹🇷' },
    { id: 'vie', name: 'Vietnamese', icon: '🇻🇳' },
    { id: 'ind', name: 'Indonesian', icon: '🇮🇩' },
    { id: 'tha', name: 'Thai', icon: '🇹🇭' },
    { id: 'pol', name: 'Polish', icon: '🇵🇱' },
    { id: 'ukr', name: 'Ukrainian', icon: '🇺🇦' },
    { id: 'swe', name: 'Swedish', icon: '🇸🇪' },
    { id: 'nld', name: 'Dutch', icon: '🇳🇱' }
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
            const langMatch = line.match(/tvg-language="([^"]*)"/) || line.match(/tvg-lang="([^"]*)"/);
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
                    language: langMatch ? langMatch[1] : undefined,
                    url: url
                } as any);
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

// Clean IPTV channel names by stripping resolution & geo-block tags
export const cleanChannelName = (name: string): string => {
    if (!name) return "";
    return name
        .replace(/\s*\((?:\d{3,4}p|HD|FHD|UHD|SD|4K|1080p|720p|576p|480p|360p)\)/gi, '')
        .replace(/\s*\[(?:Geo-blocked|Not 24\/7|Offline|Geo|Blocked|24\/7)\]/gi, '')
        .replace(/\s*\[.*?\]/g, '')
        .replace(/\s*\(\d+p\)/gi, '')
        .trim();
};

// Sleek 16:9 premium channel card component
export interface LiveTVCardProps {
    channel: LiveChannel; 
    index: number;
    onPlay: (channel: LiveChannel) => void;
    onFocus?: (index: number) => void;
    className?: string;
}

// Apple TV-style clean minimal channel card
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

    const displayName = cleanChannelName(channel.name);

    return (
        <div 
            ref={ref}
            onClick={handlePlay}
            className={`relative aspect-[16/9] rounded-2xl overflow-hidden bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] hover:border-white/20 cursor-pointer shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group select-none flex flex-col justify-between ${className}`}
        >
            <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-transparent to-white/[0.02] pointer-events-none" />
            
            {/* Top metadata - clean, minimal live indicator and country pill */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-20 pointer-events-none">
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                    <span className="text-[10px] font-normal tracking-wide text-zinc-300">Live</span>
                </div>
                {channel.country && (
                    <span className="text-[10px] font-normal tracking-wider bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/5 text-zinc-400 group-hover:text-zinc-200 transition-colors ml-auto">
                        {channel.country}
                    </span>
                )}
            </div>

            {/* Logo Center Display */}
            <div className="flex-1 w-full flex items-center justify-center px-4 pt-6 pb-2 min-h-0">
                 {channel.logo ? (
                     <img 
                        src={channel.logo} 
                        alt={displayName} 
                        className="w-auto h-full max-h-14 md:max-h-16 max-w-[85%] object-contain filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] group-hover:scale-105 transition-transform duration-300" 
                        loading="lazy" 
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const sibling = e.currentTarget.nextElementSibling;
                            if (sibling) sibling.classList.remove('hidden');
                        }}
                     />
                 ) : null}
                 <Globe className={`text-zinc-600 group-hover:text-zinc-400 transition-colors duration-300 ${channel.logo ? 'hidden' : ''}`} size={32} />
            </div>

            {/* Title Footer */}
            <div className="p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent border-t border-white/[0.04] z-10 text-left">
                <p className="text-xs md:text-[13px] font-medium text-white/90 group-hover:text-white truncate leading-tight transition-colors duration-200">
                    {displayName}
                </p>
                {epg && (
                    <p className="text-[11px] text-zinc-400 font-normal truncate mt-0.5 group-hover:text-zinc-300 transition-colors">
                        Now: {epg.current.title}
                    </p>
                )}
            </div>

            {/* Subtle Frosted Apple TV Play Button on Hover */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-15 backdrop-blur-[2px]">
                <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 text-white flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform duration-300">
                    <Play size={16} fill="currentColor" className="ml-0.5" />
                </div>
            </div>
        </div>
    );
});

// Shimmering skeleton loader for channels
const ChannelSkeleton = () => (
    <div className="relative w-[200px] md:w-[240px] shrink-0 aspect-[16/9] rounded-2xl overflow-hidden bg-white/[0.02] border border-white/[0.05] flex flex-col justify-between shadow-md">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
        <div className="flex-1 w-full flex items-center justify-center p-4">
            <div className="w-2/5 h-1/3 bg-white/[0.05] rounded-lg"></div>
        </div>
        <div className="p-3 bg-black/40 h-10 flex flex-col justify-center gap-1">
            <div className="h-3 w-3/4 bg-white/[0.08] rounded-full"></div>
            <div className="h-2 w-1/2 bg-white/[0.04] rounded-full"></div>
        </div>
    </div>
);

// Modular category row component
const LiveTVRow: React.FC<{
    title: string;
    categoryId: string;
    countryCode: string;
    languageCode?: string;
    searchQuery: string;
    hideOffline: boolean;
    onChannelClick: (c: LiveChannel, playlist: LiveChannel[]) => void;
    onExpand?: (items: LiveChannel[]) => void;
}> = React.memo(({
    title,
    categoryId,
    countryCode,
    languageCode = 'ALL',
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
    }, [categoryId, countryCode, languageCode]);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);

        const loadChannels = async () => {
            try {
                let url = '';
                let isCountryFetch = false;
                let isLangFetch = false;

                if (countryCode !== 'ALL') {
                    url = `https://iptv-org.github.io/iptv/countries/${countryCode.toLowerCase()}.m3u`;
                    isCountryFetch = true;
                } else if (languageCode !== 'ALL') {
                    url = `https://iptv-org.github.io/iptv/languages/${languageCode.toLowerCase()}.m3u`;
                    isLangFetch = true;
                } else {
                    url = `https://iptv-org.github.io/iptv/categories/${categoryId}.m3u`;
                }

                let parsed = await fetchAndParseM3U(url);

                if (isCountryFetch) {
                    parsed = parsed.filter(c => 
                        c.group && c.group.toLowerCase().includes(categoryId.toLowerCase())
                    );

                    if (languageCode !== 'ALL') {
                        const targetLangObj = LANGUAGES.find(l => l.id === languageCode);
                        const targetLangName = targetLangObj ? targetLangObj.name.toLowerCase() : '';
                        parsed = parsed.filter(c => {
                            const chanLang = (c as any).language?.toLowerCase() || '';
                            const chanName = c.name.toLowerCase();
                            return chanLang.includes(targetLangName) || 
                                   chanLang.includes(languageCode) || 
                                   chanName.includes(targetLangName) ||
                                   (languageCode === 'hin' && (chanName.includes('hindi') || chanLang.includes('hindi'))) ||
                                   (languageCode === 'tel' && (chanName.includes('telugu') || chanLang.includes('telugu'))) ||
                                   (languageCode === 'tam' && (chanName.includes('tamil') || chanLang.includes('tamil'))) ||
                                   (languageCode === 'kan' && (chanName.includes('kannada') || chanLang.includes('kannada'))) ||
                                   (languageCode === 'mal' && (chanName.includes('malayalam') || chanLang.includes('malayalam'))) ||
                                   (languageCode === 'ben' && (chanName.includes('bengali') || chanLang.includes('bengali'))) ||
                                   (languageCode === 'mar' && (chanName.includes('marathi') || chanLang.includes('marathi'))) ||
                                   (languageCode === 'pan' && (chanName.includes('punjabi') || chanLang.includes('punjabi'))) ||
                                   (languageCode === 'eng' && (chanName.includes('english') || chanLang.includes('english'))) ||
                                   (languageCode === 'spa' && (chanName.includes('spanish') || chanLang.includes('spanish'))) ||
                                   (languageCode === 'fra' && (chanName.includes('french') || chanLang.includes('french'))) ||
                                   (languageCode === 'deu' && (chanName.includes('german') || chanLang.includes('german')));
                        });
                    }
                } else if (isLangFetch) {
                    parsed = parsed.filter(c => 
                        c.group && c.group.toLowerCase().includes(categoryId.toLowerCase())
                    );
                }

                // Sort by deterministic viewer count/popularity (matching LiveTVPlayer formula)
                const getViewerCount = (id: string) => {
                    const timeIndex = Math.floor(new Date().getTime() / 600000);
                    let hash = 0;
                    for (let i = 0; i < id.length; i++) {
                        hash = (hash << 5) - hash + id.charCodeAt(i);
                        hash |= 0;
                    }
                    const seedVal = Math.abs(hash + timeIndex) % 2500;
                    return 100 + seedVal;
                };

                parsed.sort((a, b) => getViewerCount(b.id) - getViewerCount(a.id));

                // Prioritize channels with logos within sorted list
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
    }, [categoryId, countryCode, languageCode]);

    const filtered = useMemo(() => {
        return channels.filter(c => 
            c.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [channels, searchQuery]);

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
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                    <span className="w-1.5 h-4.5 rounded-full bg-red-600 shadow-[0_0_8px_rgba(239,68,68,0.7)] shrink-0" />
                    <h3 className="text-lg md:text-xl font-semibold text-white tracking-tight select-none">
                        {title}
                    </h3>
                </div>
                {onExpand && filtered.length > 0 && (
                    <button
                        onClick={() => onExpand(filtered)}
                        className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-red-600/10 hover:text-red-400 text-zinc-400 text-xs font-normal transition-all border border-white/[0.06] hover:border-red-500/20 active:scale-95 select-none"
                    >
                        <span>See All</span>
                        <ChevronRight size={13} className="text-zinc-500" />
                    </button>
                )}
            </div>
            
            <div 
                ref={rowRef}
                onScroll={handleScroll}
                className="flex gap-5 overflow-x-auto pb-4 hide-scrollbar scroll-smooth"
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
});

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
    return "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=1600&q=80"; // Clean dark moody broadcast atmosphere
};

const renderCountryFlag = (countryId: string, className = "w-5 h-3.5 object-cover rounded-sm shadow-sm shrink-0") => {
    if (countryId === 'ALL') {
        return <Globe className="text-zinc-400 shrink-0" size={14} />;
    }
    const code = countryId.toLowerCase() === 'uk' ? 'gb' : countryId.toLowerCase();
    return (
        <img 
            src={`https://flagcdn.com/w20/${code}.png`} 
            className={className} 
            alt="" 
            onError={(e) => {
                e.currentTarget.style.display = 'none';
            }}
        />
    );
};

export const LiveTV: React.FC<LiveTVProps> = React.memo(({ userProfile, searchQuery = "" }) => {
    const [selectedCountry, setSelectedCountry] = useState<string>(() => {
        return localStorage.getItem('livetv_selected_country') || 'ALL';
    });
    const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
        return localStorage.getItem('livetv_selected_language') || 'ALL';
    });

    const handleCountryChange = (countryId: string) => {
        setSelectedCountry(countryId);
        localStorage.setItem('livetv_selected_country', countryId);
    };

    const handleLanguageChange = (langId: string) => {
        setSelectedLanguage(langId);
        localStorage.setItem('livetv_selected_language', langId);
    };

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

    const trendingRowRef = useRef<HTMLDivElement>(null);

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
            const getViewerCount = (id: string) => {
                const timeIndex = Math.floor(new Date().getTime() / 600000);
                let hash = 0;
                for (let i = 0; i < id.length; i++) {
                    hash = (hash << 5) - hash + id.charCodeAt(i);
                    hash |= 0;
                }
                const seedVal = Math.abs(hash + timeIndex) % 2500;
                return 100 + seedVal;
            };

            const sorted = combined
                .map(c => ({ c, score: getViewerCount(c.id) }))
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
    const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const langDropdownRef = useRef<HTMLDivElement>(null);

    const isExclusive = true;
    const activeCountryObj = COUNTRIES.find(c => c.id === selectedCountry) || COUNTRIES[0];
    const activeLanguageObj = LANGUAGES.find(l => l.id === selectedLanguage) || LANGUAGES[0];

    // Reset search pagination on search query change
    useEffect(() => {
        setSearchVisibleCount(60);
    }, [searchQuery]);

    // Close dropdowns on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsCountryDropdownOpen(false);
            }
            if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
                setIsLanguageDropdownOpen(false);
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
    const filteredSearch = searchChannels;
    const modalItems = expandedCategory?.items || [];
    const filteredModalItems = modalItems;

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
                    
                    if (selectedLanguage !== 'ALL') {
                        const targetLangObj = LANGUAGES.find(l => l.id === selectedLanguage);
                        const targetLangName = targetLangObj ? targetLangObj.name.toLowerCase() : '';
                        results = results.filter(c => {
                            const chanLang = (c as any).language?.toLowerCase() || '';
                            const chanName = c.name.toLowerCase();
                            return chanLang.includes(targetLangName) || 
                                   chanLang.includes(selectedLanguage) || 
                                   chanName.includes(targetLangName) ||
                                   (selectedLanguage === 'hin' && (chanName.includes('hindi') || chanLang.includes('hindi'))) ||
                                   (selectedLanguage === 'tel' && (chanName.includes('telugu') || chanLang.includes('telugu'))) ||
                                   (selectedLanguage === 'tam' && (chanName.includes('tamil') || chanLang.includes('tamil'))) ||
                                   (selectedLanguage === 'kan' && (chanName.includes('kannada') || chanLang.includes('kannada'))) ||
                                   (selectedLanguage === 'mal' && (chanName.includes('malayalam') || chanLang.includes('malayalam'))) ||
                                   (selectedLanguage === 'ben' && (chanName.includes('bengali') || chanLang.includes('bengali'))) ||
                                   (selectedLanguage === 'mar' && (chanName.includes('marathi') || chanLang.includes('marathi'))) ||
                                   (selectedLanguage === 'pan' && (chanName.includes('punjabi') || chanLang.includes('punjabi'))) ||
                                   (selectedLanguage === 'eng' && (chanName.includes('english') || chanLang.includes('english'))) ||
                                   (selectedLanguage === 'spa' && (chanName.includes('spanish') || chanLang.includes('spanish'))) ||
                                   (selectedLanguage === 'fra' && (chanName.includes('french') || chanLang.includes('french'))) ||
                                   (selectedLanguage === 'deu' && (chanName.includes('german') || chanLang.includes('german')));
                        });
                    }
                } else if (selectedLanguage !== 'ALL') {
                    const url = `https://iptv-org.github.io/iptv/languages/${selectedLanguage.toLowerCase()}.m3u`;
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

                const getViewerCount = (name: string) => {
                    let hash = 0;
                    for (let i = 0; i < name.length; i++) {
                        hash = (hash << 5) - hash + name.charCodeAt(i);
                        hash |= 0;
                    }
                    return Math.abs(hash) % 5000;
                };

                const filteredAndSorted = uniqueResults
                    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .sort((a, b) => getViewerCount(b.name) - getViewerCount(a.name));

                setSearchChannels(filteredAndSorted);
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
    }, [searchQuery, selectedCountry, selectedLanguage]);

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

            {/* Compact Apple TV-style Live TV Hero Spotlight */}
            <div className="relative w-full overflow-hidden flex items-center bg-[#070709] py-7 md:py-9 px-4 md:px-12 select-none border-b border-white/[0.06]">
                {(() => {
                    const activeHeroChannel = trendingChannels[heroIndex];
                    const currentProg = activeHeroChannel ? getCurrentProgram(activeHeroChannel) : null;
                    const heroName = activeHeroChannel ? cleanChannelName(activeHeroChannel.name) : "";
                    return activeHeroChannel ? (
                        <div className="max-w-7xl mx-auto w-full relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6 z-20">
                            {/* Subtle Ambient Backdrop Blend */}
                            <div className="absolute -inset-x-12 -inset-y-10 pointer-events-none overflow-hidden -z-10">
                                <img 
                                    src={getChannelBackdrop(activeHeroChannel)} 
                                    alt=""
                                    className="w-full h-full object-cover opacity-15 scale-105 blur-[1px] transition-all duration-1000"
                                />
                                <div className="absolute inset-0 bg-gradient-to-r from-[#070709] via-[#070709]/90 to-transparent" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#070709] via-transparent to-transparent" />
                                <div className="absolute -top-24 left-1/4 w-96 h-96 bg-red-600/5 blur-[100px] rounded-full" />
                            </div>
                            
                            {/* Channel Info & Actions */}
                            <div className="max-w-2xl text-left space-y-3 animate-in fade-in duration-500">
                                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-red-600/10 backdrop-blur-xl border border-red-500/20 text-white/90 text-[11px] font-normal">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                                    <span className="text-red-400 font-medium">Live Broadcast</span>
                                    {activeHeroChannel.country && (
                                        <>
                                            <span className="text-white/30">•</span>
                                            <span className="uppercase text-[10px] text-zinc-300 font-medium">{activeHeroChannel.country}</span>
                                        </>
                                    )}
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 md:w-12 md:h-12 bg-white/[0.06] backdrop-blur-2xl rounded-xl p-1.5 border border-white/10 flex items-center justify-center shadow-xl relative overflow-hidden shrink-0">
                                        {activeHeroChannel.logo ? (
                                            <img src={activeHeroChannel.logo} className="max-w-[90%] max-h-[90%] object-contain" alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }}/>
                                        ) : (
                                            <Globe className="text-zinc-400" size={20} />
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-white leading-tight">{heroName}</h2>
                                        {currentProg && (
                                            <div className="flex items-center gap-2 text-xs text-zinc-300 font-normal mt-0.5">
                                                <span className="text-white font-medium">{currentProg.current.title}</span>
                                                <span className="text-zinc-500">•</span>
                                                <span className="text-zinc-400 text-[11px]">
                                                    {currentProg.current.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} – {currentProg.current.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2.5 pt-0.5">
                                    <TvFocusButton
                                        onClick={() => handleChannelPlay(activeHeroChannel, trendingChannels)}
                                        className="px-5 py-2 text-xs font-medium rounded-full flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95 shadow-md bg-white text-black hover:bg-white/90"
                                    >
                                        <Play size={13} fill="currentColor" /> Watch Live
                                    </TvFocusButton>
                                    <TvFocusButton
                                        onClick={() => setShowGridEpg(true)}
                                        className="px-4 py-2 text-xs font-normal rounded-full flex items-center gap-1.5 transition-all active:scale-95 bg-white/10 hover:bg-white/15 backdrop-blur-xl text-white border border-white/10"
                                    >
                                        <Calendar size={13} className="text-zinc-300" /> Schedule
                                    </TvFocusButton>
                                </div>
                            </div>

                            {/* Minimal Slider Dot Indicators with Red Active Pill */}
                            <div className="flex md:flex-col items-center gap-1.5 self-center md:self-end">
                                {trendingChannels.slice(0, 5).map((_, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => setHeroIndex(idx)}
                                        className={`transition-all duration-300 ${heroIndex === idx ? 'bg-red-600 shadow-[0_0_8px_rgba(239,68,68,0.7)] h-1.5 w-6 rounded-full' : 'bg-white/20 hover:bg-white/40 h-1.5 w-1.5 rounded-full'}`}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-7xl mx-auto w-full text-left py-4">
                            <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-white">Global Live TV</h2>
                            <p className="text-xs text-zinc-400 font-normal mt-1">
                                Stream free-to-air international television channels in real-time.
                            </p>
                        </div>
                    );
                })()}
            </div>

            {/* Main Interactive Row and Filter Section */}
            <div className="max-w-7xl mx-auto px-4 md:px-12 pt-6 relative z-30">
                {/* Clean Section Header & Filter Toolbar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div className="text-left">
                        <h3 className="text-lg md:text-xl font-semibold text-white tracking-tight">
                            {!searchQuery ? 'Live Channels' : `Search Results for "${searchQuery}"`}
                        </h3>
                        <p className="text-xs text-zinc-400 font-normal mt-0.5">
                            {!searchQuery ? 'Explore live broadcasts by category, region, and language' : 'Channels matching your search query'}
                        </p>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Country Selector Dropdown */}
                        <div className="relative z-50" ref={dropdownRef}>
                            <TvFocusButton 
                                onClick={() => { setIsCountryDropdownOpen(!isCountryDropdownOpen); setIsLanguageDropdownOpen(false); }}
                                className="h-10 md:h-10.5 flex items-center gap-2.5 px-4 md:px-5 rounded-full bg-white/[0.07] hover:bg-white/[0.12] border border-white/10 hover:border-white/20 transition-all active:scale-95 text-white shadow-sm"
                            >
                                {renderCountryFlag(activeCountryObj.id, "w-4.5 h-3 object-cover rounded-sm shrink-0")}
                                <span className="text-[13px] font-normal text-zinc-100 truncate max-w-[150px]">{activeCountryObj.name}</span>
                                <ChevronDown size={14} className={`transition-transform duration-200 text-zinc-400 shrink-0 ${isCountryDropdownOpen ? 'rotate-180' : ''}`}/>
                            </TvFocusButton>

                            {isCountryDropdownOpen && (
                                <div className="absolute top-full right-0 sm:left-0 sm:right-auto mt-2 bg-[#0c0d12]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden w-56 max-h-80 overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200 z-50 p-2">
                                    {COUNTRIES.map(country => (
                                        <TvFocusButton 
                                            key={country.id}
                                            onClick={() => { handleCountryChange(country.id); setIsCountryDropdownOpen(false); }}
                                            className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-white/5 transition-colors ${selectedCountry === country.id ? 'bg-white/10 text-white font-medium' : 'text-zinc-400 hover:text-white font-normal'}`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
                                                {renderCountryFlag(country.id, "w-4 h-3 object-cover rounded-sm shrink-0")}
                                                <span className="text-xs truncate">{country.name}</span>
                                            </div>
                                            {selectedCountry === country.id && <Check size={13} className="shrink-0 text-white ml-2" />}
                                        </TvFocusButton>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Language Selector Dropdown */}
                        <div className="relative z-50" ref={langDropdownRef}>
                            <TvFocusButton 
                                onClick={() => { setIsLanguageDropdownOpen(!isLanguageDropdownOpen); setIsCountryDropdownOpen(false); }}
                                className="h-10 md:h-10.5 flex items-center gap-2.5 px-4 md:px-5 rounded-full bg-white/[0.07] hover:bg-white/[0.12] border border-white/10 hover:border-white/20 transition-all active:scale-95 text-white shadow-sm"
                            >
                                <span className="text-sm shrink-0">{activeLanguageObj.icon}</span>
                                <span className="text-[13px] font-normal text-zinc-100 truncate max-w-[140px]">{activeLanguageObj.name}</span>
                                <ChevronDown size={14} className={`transition-transform duration-200 text-zinc-400 shrink-0 ${isLanguageDropdownOpen ? 'rotate-180' : ''}`}/>
                            </TvFocusButton>

                            {isLanguageDropdownOpen && (
                                <div className="absolute top-full right-0 sm:left-0 sm:right-auto mt-2 bg-[#0c0d12]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden w-52 max-h-80 overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200 z-50 p-2">
                                    {LANGUAGES.map(lang => (
                                        <TvFocusButton 
                                            key={lang.id}
                                            onClick={() => { handleLanguageChange(lang.id); setIsLanguageDropdownOpen(false); }}
                                            className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-white/5 transition-colors ${selectedLanguage === lang.id ? 'bg-white/10 text-white font-medium' : 'text-zinc-400 hover:text-white font-normal'}`}
                                        >
                                            <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
                                                <span className="text-xs shrink-0">{lang.icon}</span>
                                                <span className="text-xs truncate">{lang.name}</span>
                                            </div>
                                            {selectedLanguage === lang.id && <Check size={13} className="shrink-0 text-white ml-2" />}
                                        </TvFocusButton>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Interactive Grid EPG Button */}
                        <TvFocusButton
                            onClick={() => setShowGridEpg(true)}
                            className="h-10 md:h-10.5 px-4 md:px-5 rounded-full bg-white/[0.07] hover:bg-white/[0.12] border border-white/10 hover:border-white/20 text-zinc-200 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2 text-[13px] font-normal whitespace-nowrap shadow-sm"
                        >
                            <Calendar size={14} className="text-zinc-400" />
                            <span>Schedule</span>
                        </TvFocusButton>
                    </div>
                </div>

                {/* Dynamic Netflix-style Grid or Category Rows */}
                {!searchQuery ? (
                    <div className="space-y-4 relative z-10">
                        {CATEGORIES.map(cat => (
                            <LiveTVRow 
                                key={cat.id}
                                title={cat.name}
                                categoryId={cat.id}
                                countryCode={selectedCountry}
                                languageCode={selectedLanguage}
                                searchQuery={searchQuery}
                                hideOffline={hideOffline}
                                onChannelClick={handleChannelPlay}
                                onExpand={(channels) => setExpandedCategory({ title: cat.name, items: channels })}
                            />
                        ))}
                    </div>
                ) : (
                    // Sleek grid layout for active searches
                    <div className="text-left relative z-10">
                        <div className="flex items-center gap-2.5 mb-6">
                            <span className="w-1.5 h-4.5 rounded-full bg-red-600 shadow-[0_0_8px_rgba(239,68,68,0.7)] shrink-0" />
                            <h3 className="text-lg md:text-xl font-semibold text-white tracking-tight">
                                Search Results for "{searchQuery}"
                            </h3>
                        </div>

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
});
