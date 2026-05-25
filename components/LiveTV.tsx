
import React, { useState, useEffect, useRef } from 'react';
import { Tv, Play, Search, AlertCircle, RefreshCcw, Wifi, Globe, Loader2, Lock, ChevronDown, Check } from 'lucide-react';
import { LiveChannel, UserProfile } from '../types';
import { LiveTVPlayer } from './LiveTVPlayer';

interface LiveTVProps {
    userProfile: UserProfile;
}

const CATEGORIES = [
  { id: 'animation', name: 'Animation', icon: '🎨' },
  { id: 'auto', name: 'Auto', icon: '🚗' },
  { id: 'business', name: 'Business', icon: '💼' },
  { id: 'classic', name: 'Classic', icon: '🏛️' },
  { id: 'comedy', name: 'Comedy', icon: '🤣' },
  { id: 'cooking', name: 'Cooking', icon: '🍳' },
  { id: 'culture', name: 'Culture', icon: '🎭' },
  { id: 'documentary', name: 'Documentary', icon: '🌍' },
  { id: 'education', name: 'Education', icon: '📚' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬' },
  { id: 'family', name: 'Family', icon: '👨‍👩‍👧‍👦' },
  { id: 'general', name: 'General', icon: '📺' },
  { id: 'kids', name: 'Kids', icon: '🧸' },
  { id: 'lifestyle', name: 'Lifestyle', icon: '🧘' },
  { id: 'movies', name: 'Movies', icon: '🎥' },
  { id: 'music', name: 'Music', icon: '🎵' },
  { id: 'news', name: 'News', icon: '📰' },
  { id: 'outdoor', name: 'Outdoor', icon: '🌲' },
  { id: 'relax', name: 'Relax', icon: '💆' },
  { id: 'religious', name: 'Religious', icon: '🙏' },
  { id: 'science', name: 'Science', icon: '🔬' },
  { id: 'series', name: 'Series', icon: '📺' },
  { id: 'shop', name: 'Shop', icon: '🛒' },
  { id: 'sports', name: 'Sports', icon: '⚽' },
  { id: 'travel', name: 'Travel', icon: '✈️' },
  { id: 'weather', name: 'Weather', icon: '☀️' }
];

const COUNTRIES = [
    { id: 'ALL', name: 'All Countries', icon: '🌍' },
    { id: 'AF', name: 'Afghanistan', icon: '🇦🇫' },
    { id: 'AL', name: 'Albania', icon: '🇦🇱' },
    { id: 'DZ', name: 'Algeria', icon: '🇩🇿' },
    { id: 'AD', name: 'Andorra', icon: '🇦🇩' },
    { id: 'AO', name: 'Angola', icon: '🇦🇴' },
    { id: 'AR', name: 'Argentina', icon: '🇦🇷' },
    { id: 'AM', name: 'Armenia', icon: '🇦🇲' },
    { id: 'AW', name: 'Aruba', icon: '🇦🇼' },
    { id: 'AU', name: 'Australia', icon: '🇦🇺' },
    { id: 'AT', name: 'Austria', icon: '🇦🇹' },
    { id: 'AZ', name: 'Azerbaijan', icon: '🇦🇿' },
    { id: 'BS', name: 'Bahamas', icon: '🇧🇸' },
    { id: 'BH', name: 'Bahrain', icon: '🇧🇭' },
    { id: 'BD', name: 'Bangladesh', icon: '🇧🇩' },
    { id: 'BB', name: 'Barbados', icon: '🇧🇧' },
    { id: 'BY', name: 'Belarus', icon: '🇧🇾' },
    { id: 'BE', name: 'Belgium', icon: '🇧🇪' },
    { id: 'BR', name: 'Brazil', icon: '🇧🇷' },
    { id: 'BG', name: 'Bulgaria', icon: '🇧🇬' },
    { id: 'CA', name: 'Canada', icon: '🇨🇦' },
    { id: 'CL', name: 'Chile', icon: '🇨🇱' },
    { id: 'CN', name: 'China', icon: '🇨🇳' },
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
    { id: 'FR', name: 'France', icon: '🇫🇷' },
    { id: 'DE', name: 'Germany', icon: '🇩🇪' },
    { id: 'GH', name: 'Ghana', icon: '🇬🇭' },
    { id: 'GR', name: 'Greece', icon: '🇬🇷' },
    { id: 'GT', name: 'Guatemala', icon: '🇬🇹' },
    { id: 'HK', name: 'Hong Kong', icon: '🇭🇰' },
    { id: 'HU', name: 'Hungary', icon: '🇭🇺' },
    { id: 'IS', name: 'Iceland', icon: '🇮🇸' },
    { id: 'IN', name: 'India', icon: '🇮🇳' },
    { id: 'ID', name: 'Indonesia', icon: '🇮🇩' },
    { id: 'IR', name: 'Iran', icon: '🇮🇷' },
    { id: 'IQ', name: 'Iraq', icon: '🇮🇶' },
    { id: 'IE', name: 'Ireland', icon: '🇮🇪' },
    { id: 'IL', name: 'Israel', icon: '🇮🇱' },
    { id: 'IT', name: 'Italy', icon: '🇮🇹' },
    { id: 'JM', name: 'Jamaica', icon: '🇯🇲' },
    { id: 'JP', name: 'Japan', icon: '🇯🇵' },
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
    { id: 'RU', name: 'Russia', icon: '🇷🇺' },
    { id: 'SA', name: 'Saudi Arabia', icon: '🇸🇦' },
    { id: 'RS', name: 'Serbia', icon: '🇷🇸' },
    { id: 'SG', name: 'Singapore', icon: '🇸🇬' },
    { id: 'SK', name: 'Slovakia', icon: '🇸🇰' },
    { id: 'SI', name: 'Slovenia', icon: '🇸🇮' },
    { id: 'ZA', name: 'South Africa', icon: '🇿🇦' },
    { id: 'KR', name: 'South Korea', icon: '🇰🇷' },
    { id: 'ES', name: 'Spain', icon: '🇪🇸' },
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
    { id: 'UK', name: 'United Kingdom', icon: '🇬🇧' },
    { id: 'US', name: 'United States', icon: '🇺🇸' },
    { id: 'UY', name: 'Uruguay', icon: '🇺🇾' },
    { id: 'UZ', name: 'Uzbekistan', icon: '🇺🇿' },
    { id: 'VE', name: 'Venezuela', icon: '🇻🇪' },
    { id: 'VN', name: 'Vietnam', icon: '🇻🇳' },
    { id: 'YE', name: 'Yemen', icon: '🇾🇪' }
];

const ChannelSkeleton = () => (
    <div className="relative bg-[#0d0d0f]/60 rounded-xl overflow-hidden border border-white/5 flex flex-col shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
        <div className="aspect-video w-full bg-black/20 flex items-center justify-center p-4 border-b border-white/5">
            <div className="w-14 h-14 rounded-2xl bg-white/5"></div>
        </div>
        <div className="p-4 w-full space-y-2">
            <div className="h-3 w-3/4 bg-white/10 rounded"></div>
        </div>
    </div>
);

export const LiveTV: React.FC<LiveTVProps> = ({ userProfile }) => {
    const [activeCategory, setActiveCategory] = useState('news');
    const [selectedCountry, setSelectedCountry] = useState('ALL');
    const [channels, setChannels] = useState<LiveChannel[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedChannel, setSelectedChannel] = useState<LiveChannel | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [error, setError] = useState(false);
    
    // Dropdown state
    const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const isExclusive = userProfile.canWatch === true;
    const isGoldTheme = false;
    
    const accentText = "text-red-600";
    const accentBg = "bg-red-600";
    const accentBorder = "border-red-600";

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

    useEffect(() => {
        if (isExclusive) {
            fetchChannels();
        }
    }, [activeCategory, selectedCountry, isExclusive]);

    const fetchChannels = async () => {
        setLoading(true);
        setError(false);
        setChannels([]);
        
        try {
            let url = '';
            let isCountryFetch = false;

            if (selectedCountry === 'ALL') {
                // Fetch by Category
                url = `https://iptv-org.github.io/iptv/categories/${activeCategory}.m3u`;
            } else {
                // Fetch by Country
                url = `https://iptv-org.github.io/iptv/countries/${selectedCountry.toLowerCase()}.m3u`;
                isCountryFetch = true;
            }

            const response = await fetch(url);
            if (!response.ok) throw new Error("Failed to fetch playlist");
            
            const text = await response.text();
            let parsedChannels = parseM3U(text);
            
            // If fetching by country, we must filter by the selected category to keep the UI consistent.
            if (isCountryFetch) {
                // Map category IDs to likely group titles in the M3U
                // e.g. 'news' matches 'News', 'movies' matches 'Movies'
                parsedChannels = parsedChannels.filter(c => 
                    c.group && c.group.toLowerCase().includes(activeCategory.toLowerCase())
                );
            }
            
            // Prioritize channels with logos for better UI
            const channelsWithLogos = parsedChannels.filter(c => c.logo && c.logo.length > 0);
            const channelsWithoutLogos = parsedChannels.filter(c => !c.logo);
            
            setChannels([...channelsWithLogos, ...channelsWithoutLogos]);
        } catch (err) {
            console.error(err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

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
                    result.push({
                        id: `tv-${result.length}-${Date.now()}-${Math.random()}`,
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

    const filteredChannels = channels.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeCountryObj = COUNTRIES.find(c => c.id === selectedCountry) || COUNTRIES[0];

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
        <div className="w-full min-h-screen bg-[#030303] text-white pt-6 pb-12 px-4 md:px-8">
            {selectedChannel && (
                <LiveTVPlayer 
                    channel={selectedChannel} 
                    onClose={() => setSelectedChannel(null)} 
                    isGoldTheme={isGoldTheme}
                />
            )}

            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between mb-10 gap-6 border-b border-white/5 pb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black flex items-center gap-3 tracking-tight text-white">
                            <span className="w-1.5 h-7 bg-red-600 rounded-full inline-block"></span>
                            Live TV
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded bg-red-600 text-white tracking-widest uppercase shadow-lg shadow-red-600/20">
                                Premium
                            </span>
                        </h1>
                        <p className="text-gray-400 mt-2 text-xs md:text-sm font-normal">Stream thousands of international television channels live in high fidelity.</p>
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
                        {/* Country Dropdown */}
                        <div className="relative z-50" ref={dropdownRef}>
                            <button 
                                onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                                className="w-full md:w-56 flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all active:scale-95 backdrop-blur-md"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-lg">{activeCountryObj.icon}</span>
                                    <span className="text-sm font-bold truncate">{activeCountryObj.name}</span>
                                </div>
                                <ChevronDown size={16} className={`transition-transform duration-300 text-white/50 ${isCountryDropdownOpen ? 'rotate-180' : ''}`}/>
                            </button>

                            {isCountryDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-[#0e0e10]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200 z-50 p-1">
                                    {COUNTRIES.map(country => (
                                        <button 
                                            key={country.id}
                                            onClick={() => { setSelectedCountry(country.id); setIsCountryDropdownOpen(false); }}
                                            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg hover:bg-white/5 transition-colors ${selectedCountry === country.id ? 'bg-white/10 text-white font-bold' : 'text-gray-400 hover:text-white'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-lg">{country.icon}</span>
                                                <span className="font-medium">{country.name}</span>
                                            </div>
                                            {selectedCountry === country.id && <Check size={14}/>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full md:w-64 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors" size={16} />
                            <input 
                                type="text" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Find a channel..." 
                                className="w-full bg-white/5 border border-white/5 hover:border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:bg-white/10 focus:border-white/20 transition-all placeholder-gray-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Categories - Outlined Premium Pills */}
                <div className="flex gap-2 overflow-x-auto pb-4 mb-8 hide-scrollbar">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 active:scale-95 border ${
                                activeCategory === cat.id 
                                ? 'bg-white text-black border-white shadow-md shadow-white/5' 
                                : 'bg-transparent text-gray-300 border-white/15 hover:border-white/30 hover:bg-white/5'
                            }`}
                        >
                            <span>{cat.icon}</span> {cat.name}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5 md:gap-6">
                        {[...Array(18)].map((_, i) => (
                            <ChannelSkeleton key={i} />
                        ))}
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto animate-in fade-in">
                         <Wifi size={48} className="text-red-500 mb-4 opacity-80 animate-pulse"/>
                         <h3 className="text-xl font-bold text-white mb-2">Connection Issue</h3>
                         <p className="text-gray-400 text-xs md:text-sm mb-6 leading-relaxed">We could not load the live channel feeds from the server. Check your network or try again.</p>
                         <button onClick={() => fetchChannels()} className="flex items-center gap-2 px-6 py-2.5 bg-white/10 hover:bg-white/20 border border-white/5 hover:border-white/10 rounded-full font-bold text-xs text-white transition-all active:scale-95">
                             <RefreshCcw size={14}/> Retry Feed
                         </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5 md:gap-6">
                        {filteredChannels.length > 0 ? filteredChannels.map((channel) => (
                            <div 
                                key={channel.id} 
                                onClick={() => setSelectedChannel(channel)}
                                className="group bg-[#0d0d0f]/60 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:shadow-xl transition-all duration-500 hover:scale-[1.03] active:scale-98 flex flex-col relative"
                            >
                                {/* Upper Channel Logo/Preview Box */}
                                <div className="w-full aspect-video relative flex items-center justify-center bg-black/30 border-b border-white/5 overflow-hidden">
                                    {/* Live Indicator */}
                                    <div className="absolute top-3 left-3 flex items-center gap-1.5 z-20 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]" />
                                        <span className="text-[8px] font-black tracking-widest text-red-500 uppercase">Live</span>
                                    </div>
                                    
                                    {/* Country Badge */}
                                    {channel.country && (
                                        <span className="absolute top-3 right-3 text-[9px] font-black uppercase tracking-wider bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/5 text-gray-400 group-hover:text-white transition-colors z-20">
                                            {channel.country}
                                        </span>
                                    )}

                                    {/* Logo */}
                                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center p-2 border border-white/5 shadow-inner group-hover:scale-105 transition-transform duration-500">
                                         {channel.logo ? (
                                             <img src={channel.logo} alt={channel.name} className="max-w-full max-h-full object-contain drop-shadow-md opacity-85 group-hover:opacity-100 transition-opacity" loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')}/>
                                         ) : (
                                             <Globe size={24} className="text-gray-500 group-hover:text-gray-400 transition-colors"/>
                                         )}
                                    </div>

                                    {/* Center Play Button Overlay on Hover */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                        <div className={`p-2.5 rounded-full text-white scale-75 group-hover:scale-100 transition-all duration-300 shadow-lg shadow-red-600/40 ${accentBg}`}>
                                            <Play size={14} fill="currentColor"/>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Lower Metadata Footer */}
                                <div className="p-3.5 bg-[#0d0d0f]/20 flex flex-col justify-center min-w-0">
                                    <p className="text-xs font-bold text-gray-300 group-hover:text-white truncate leading-none transition-colors duration-300">{channel.name}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="col-span-full py-20 text-center text-gray-500 flex flex-col items-center justify-center animate-in fade-in">
                                <AlertCircle size={40} className="text-white/25 mb-4"/>
                                <h3 className="text-lg font-bold text-white mb-1">No Channels Found</h3>
                                <p className="text-gray-400 text-xs max-w-md px-4">
                                    Could not find "{searchQuery}" in the {CATEGORIES.find(c => c.id === activeCategory)?.name || ""} category {selectedCountry !== 'ALL' ? `for ${activeCountryObj.name}` : ''}. Try adjusting your search query.
                                </p>
                            </div>
                        )}
                    </div>
                )}
                
                <div className="mt-12 text-center border-t border-white/5 pt-8">
                     <p className="text-xs text-gray-600 flex items-center justify-center gap-2">
                        Powered by <a href="https://github.com/iptv-org/iptv" target="_blank" rel="noreferrer" className="text-gray-400 hover:text-white underline">iptv-org</a>. 
                        Feeds are provided by third parties.
                     </p>
                </div>
            </div>
        </div>
    );
};
