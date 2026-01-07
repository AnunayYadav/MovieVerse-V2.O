
import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, Radio, Play, Shield, Loader2, RefreshCcw, X, Tv, MonitorPlay, WifiOff, ExternalLink, Search } from 'lucide-react';
import { Sport, APIMatch, MatchDetail, Stream, UserProfile } from '../types';

const API_BASE = "https://livesport.su/api";

const DEFAULT_SPORTS: Sport[] = [
    { id: 'football', name: 'Football' },
    { id: 'basketball', name: 'Basketball' },
    { id: 'tennis', name: 'Tennis' },
    { id: 'hockey', name: 'Hockey' },
    { id: 'baseball', name: 'Baseball' },
    { id: 'cricket', name: 'Cricket' },
    { id: 'volleyball', name: 'Volleyball' }
];

interface LiveSportsProps {
    userProfile: UserProfile;
}

export const LiveSports: React.FC<LiveSportsProps> = ({ userProfile }) => {
    const [sports, setSports] = useState<Sport[]>([]);
    const [matches, setMatches] = useState<APIMatch[]>([]);
    const [activeTab, setActiveTab] = useState("today"); // Default to 'today' for more content
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMatch, setSelectedMatch] = useState<APIMatch | null>(null);

    const isExclusive = userProfile.canWatch === true;
    const isGoldTheme = isExclusive && userProfile.theme !== 'default';
    const accentColor = isGoldTheme ? "text-amber-500" : "text-red-500";
    const accentBg = isGoldTheme ? "bg-amber-500" : "bg-red-600";
    const accentBorder = isGoldTheme ? "border-amber-500/50" : "border-red-500/50";

    // Fetch Sports Categories
    useEffect(() => {
        const fetchSports = async () => {
            try {
                const res = await fetch(`${API_BASE}/sports`);
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        setSports(data);
                    } else {
                        // Fallback if API returns weird structure
                        setSports(DEFAULT_SPORTS);
                    }
                } else {
                    setSports(DEFAULT_SPORTS);
                }
            } catch (e) {
                console.warn("Failed to fetch sports, using defaults", e);
                setSports(DEFAULT_SPORTS);
            }
        };
        fetchSports();
    }, []);

    // Fetch Matches based on Active Tab
    useEffect(() => {
        const fetchMatches = async () => {
            setLoading(true);
            setError(null);
            setMatches([]);
            try {
                let endpoint = "";
                if (activeTab === 'live') endpoint = `${API_BASE}/matches/live`;
                else if (activeTab === 'today') endpoint = `${API_BASE}/matches/all-today`;
                else endpoint = `${API_BASE}/matches/${activeTab}`;

                const res = await fetch(endpoint);
                if (!res.ok) {
                    throw new Error(`Service Unavailable (Status: ${res.status})`);
                }

                const rawData = await res.json();
                let data: APIMatch[] = [];

                // Robust data parsing
                if (Array.isArray(rawData)) {
                    data = rawData;
                } else if (rawData && typeof rawData === 'object') {
                    // Check specific properties where data might be hidden
                    if (Array.isArray(rawData.matches)) data = rawData.matches;
                    else if (Array.isArray(rawData.data)) data = rawData.data;
                    else if (Array.isArray(rawData.events)) data = rawData.events;
                    else {
                        // If it's an object but not a known error, treat as empty list rather than crashing
                        // This handles cases where API returns {} for "no matches"
                        if (rawData.error) {
                            throw new Error(rawData.error);
                        }
                        console.warn("Received object instead of array, treating as empty:", rawData);
                        data = [];
                    }
                }

                // Deduplicate and Sort
                const uniqueMatches = Array.from(new Map(data.map(m => [m.id, m])).values());
                const sorted = uniqueMatches.sort((a: APIMatch, b: APIMatch) => {
                    // Prioritize LIVE/Popular
                    if (a.popular && !b.popular) return -1;
                    if (!a.popular && b.popular) return 1;
                    return (a.date || 0) - (b.date || 0);
                });
                
                setMatches(sorted);

            } catch (e: any) {
                console.error("Match fetch error:", e);
                setError(e.message || "Failed to load match data.");
            } finally {
                setLoading(false);
            }
        };

        fetchMatches();
        const interval = setInterval(fetchMatches, 60000); // Auto-refresh every minute
        return () => clearInterval(interval);
    }, [activeTab]);

    const formatMatchTime = (timestamp: number) => {
        if (!timestamp) return "LIVE";
        try {
            const date = new Date(timestamp);
            const now = new Date();
            const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth();
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + (isToday ? '' : ` (${date.getDate()}/${date.getMonth() + 1})`);
        } catch (e) {
            return "TBA";
        }
    };

    const isLiveNow = (timestamp: number) => {
        if (!timestamp) return false;
        const now = Date.now();
        // Heuristic: Match started within last 3 hours and hasn't finished (assuming 3h max)
        return timestamp < now && timestamp > (now - 3 * 60 * 60 * 1000);
    };

    return (
        <div className="min-h-screen bg-[#030303] text-white pt-6 pb-20 animate-in fade-in">
            {/* Header */}
            <div className="px-4 md:px-12 mb-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-white flex items-center gap-3">
                            <Trophy size={32} className={accentColor}/> Live Sports
                        </h1>
                        <p className="text-white/50 text-sm mt-1">Real-time scores and streams from around the world.</p>
                    </div>
                    
                    {/* Primary Filter Tabs */}
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                        <button 
                            onClick={() => setActiveTab('live')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'live' ? `${accentBg} text-white shadow-lg` : 'text-gray-400 hover:text-white'}`}
                        >
                            <Radio size={16} className={activeTab === 'live' ? 'animate-pulse' : ''}/> Live Now
                        </button>
                        <button 
                            onClick={() => setActiveTab('today')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'today' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Calendar size={16}/> Today
                        </button>
                    </div>
                </div>

                {/* Sports Category Scroller */}
                <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar">
                    {sports.map(sport => (
                        <button
                            key={sport.id}
                            onClick={() => setActiveTab(sport.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${activeTab === sport.id ? `${accentBorder} bg-white/10 text-white` : 'border-transparent bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                        >
                            {sport.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Matches Grid */}
            <div className="px-4 md:px-12">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(9)].map((_, i) => (
                            <div key={i} className="h-32 bg-white/5 rounded-2xl animate-pulse"></div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                        <Shield size={48} className="mb-4 opacity-20"/>
                        <p className="mb-2">{error}</p>
                        <p className="text-xs opacity-50 max-w-md text-center">We couldn't connect to the sports server. It might be blocked or temporarily offline.</p>
                        <button onClick={() => setActiveTab('today')} className="mt-6 flex items-center gap-2 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors font-bold text-sm"><RefreshCcw size={14}/> Retry Connection</button>
                    </div>
                ) : matches.length === 0 ? (
                    <div className="text-center py-24 text-gray-500">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            <WifiOff size={32} className="opacity-40"/>
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">No Live Matches Found</h3>
                        <p className="text-sm opacity-60">There are no matches currently listed in this category.</p>
                        <p className="text-xs opacity-40 mt-1">Try switching to "Today" or selecting a different sport.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {matches.map(match => {
                            const isLive = activeTab === 'live' || isLiveNow(match.date);
                            // Safety checks for missing team objects
                            const homeTeam = match.teams?.home || { name: "Home", badge: "" };
                            const awayTeam = match.teams?.away || { name: "Away", badge: "" };

                            return (
                                <div 
                                    key={match.id}
                                    onClick={() => setSelectedMatch(match)}
                                    className={`group bg-[#0a0a0a] border border-white/10 hover:border-white/20 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:bg-white/5 hover:scale-[1.01] hover:shadow-xl relative overflow-hidden`}
                                >
                                    {/* Status Badge */}
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-gray-500">
                                            <span className="bg-white/10 px-2 py-0.5 rounded">{match.category || 'Event'}</span>
                                        </div>
                                        {isLive ? (
                                            <div className="flex items-center gap-1.5 text-red-500 text-[10px] font-bold bg-red-500/10 px-2 py-0.5 rounded-full animate-pulse border border-red-500/20">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> LIVE
                                            </div>
                                        ) : (
                                            <div className="text-gray-400 text-xs font-medium bg-white/5 px-2 py-0.5 rounded flex items-center gap-1">
                                                <Calendar size={10}/> {formatMatchTime(match.date)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Teams */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {homeTeam.badge ? (
                                                    <img src={homeTeam.badge} alt="Home" className="w-8 h-8 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')}/>
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[10px] text-gray-500 border border-white/5">H</div>
                                                )}
                                                <span className="font-bold text-sm text-gray-200 line-clamp-1">{homeTeam.name}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {awayTeam.badge ? (
                                                    <img src={awayTeam.badge} alt="Away" className="w-8 h-8 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')}/>
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[10px] text-gray-500 border border-white/5">A</div>
                                                )}
                                                <span className="font-bold text-sm text-gray-200 line-clamp-1">{awayTeam.name}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={`mt-4 pt-4 border-t border-white/5 flex items-center justify-between opacity-50 group-hover:opacity-100 transition-opacity`}>
                                        <span className="text-[10px] text-gray-500">{match.popular ? '🔥 Popular Match' : 'Watch Stream'}</span>
                                        <div className={`p-1.5 rounded-full ${accentBg} text-white`}>
                                            <Play size={12} fill="currentColor"/>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {selectedMatch && (
                <LiveSportsPlayer 
                    match={selectedMatch} 
                    onClose={() => setSelectedMatch(null)}
                    isGoldTheme={isGoldTheme}
                />
            )}
        </div>
    );
};

// Internal Player Component
const LiveSportsPlayer = ({ match, onClose, isGoldTheme }: { match: APIMatch, onClose: () => void, isGoldTheme: boolean }) => {
    const [details, setDetails] = useState<MatchDetail | null>(null);
    const [activeStream, setActiveStream] = useState<Stream | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`${API_BASE}/matches/${match.id}/detail`);
                if (res.ok) {
                    const data = await res.json();
                    
                    // Improved Parsing: Look for 'sources', 'streams', or 'links'
                    let streams: Stream[] = [];
                    if (Array.isArray(data)) {
                        streams = data;
                    } else if (data && typeof data === 'object') {
                        if (Array.isArray(data.sources)) streams = data.sources;
                        else if (Array.isArray(data.streams)) streams = data.streams;
                        else if (Array.isArray(data.links)) streams = data.links;
                    }

                    // Format check for stream objects
                    const validStreams = streams.map((s, idx) => ({
                        ...s,
                        id: s.id || `stream-${idx}`,
                        streamNo: s.streamNo || (idx + 1),
                        source: s.source || `Source ${idx + 1}`,
                        language: s.language || "Multi"
                    }));

                    setDetails({ sources: validStreams });
                    
                    if (validStreams.length > 0) {
                        setActiveStream(validStreams[0]);
                    }
                } else {
                    console.warn("Details fetch failed", res.status);
                    setDetails({ sources: [] });
                }
            } catch (e) {
                console.error(e);
                setDetails({ sources: [] });
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [match.id]);

    const homeName = match.teams?.home?.name || "Home Team";
    const awayName = match.teams?.away?.name || "Away Team";

    const handleGoogleSearch = () => {
        const query = `${homeName} vs ${awayName} ${match.category || 'live stream'}`;
        window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
    };

    return (
        <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-xl animate-in fade-in duration-300 flex flex-col md:flex-row">
            {/* Header / Sidebar */}
            <div className="w-full md:w-80 bg-[#0f0f0f] border-b md:border-b-0 md:border-r border-white/10 flex flex-col h-[40vh] md:h-full shrink-0">
                <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-black/20">
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20}/></button>
                    <span className="font-bold text-white flex items-center gap-2"><Tv size={18} className={isGoldTheme ? "text-amber-500" : "text-red-500"}/> Match Center</span>
                </div>
                
                <div className="p-6 text-center border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">{match.category || 'Live Event'}</div>
                    <div className="flex justify-center items-center gap-4 mb-4">
                        <div className="flex flex-col items-center gap-2 w-20">
                            {match.teams?.home?.badge ? <img src={match.teams.home.badge} className="w-12 h-12 object-contain" alt="H" onError={(e) => (e.currentTarget.style.display = 'none')}/> : <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">H</div>}
                            <span className="text-xs font-bold leading-tight line-clamp-2">{homeName}</span>
                        </div>
                        <div className="text-xl font-black text-gray-600">VS</div>
                        <div className="flex flex-col items-center gap-2 w-20">
                            {match.teams?.away?.badge ? <img src={match.teams.away.badge} className="w-12 h-12 object-contain" alt="A" onError={(e) => (e.currentTarget.style.display = 'none')}/> : <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">A</div>}
                            <span className="text-xs font-bold leading-tight line-clamp-2">{awayName}</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">Select Stream</h3>
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-500"/></div>
                    ) : error ? (
                        <div className="text-center text-red-500 text-xs py-4">{error}</div>
                    ) : (details?.sources && details.sources.length > 0) ? (
                        <div className="space-y-2">
                            {details.sources.map((stream, idx) => (
                                <button
                                    key={stream.id || idx}
                                    onClick={() => setActiveStream(stream)}
                                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group ${activeStream?.id === stream.id ? (isGoldTheme ? 'bg-amber-500/10 border-amber-500/50 text-white' : 'bg-red-500/10 border-red-500/50 text-white') : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10 hover:text-white'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-black/40 font-bold text-xs ${activeStream?.id === stream.id ? (isGoldTheme ? 'text-amber-500' : 'text-red-500') : 'text-gray-500'}`}>
                                            #{stream.streamNo}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-bold truncate">{stream.source}</div>
                                            <div className="text-[10px] opacity-70">{stream.language || "Unknown Language"}</div>
                                        </div>
                                    </div>
                                    {stream.hd && <span className="text-[9px] font-black bg-white/10 px-1.5 py-0.5 rounded text-white border border-white/10">HD</span>}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-500 text-sm flex flex-col items-center">
                            <WifiOff size={24} className="mb-2 opacity-50"/>
                            <p>No streams found.</p>
                            <button 
                                onClick={handleGoogleSearch}
                                className={`mt-4 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all active:scale-95 ${isGoldTheme ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-white text-black hover:bg-gray-200'}`}
                            >
                                <Search size={14}/> Find on Web
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Player Area */}
            <div className="flex-1 bg-black relative flex items-center justify-center">
                {activeStream ? (
                    <iframe
                        src={activeStream.embedUrl}
                        className="w-full h-full absolute inset-0 border-0"
                        allowFullScreen
                        allow="autoplay; encrypted-media"
                        title={match.title}
                        sandbox="allow-forms allow-pointer-lock allow-same-origin allow-scripts allow-top-navigation"
                    />
                ) : (
                    <div className="text-center text-gray-500 p-6">
                        <MonitorPlay size={48} className="mx-auto mb-4 opacity-20"/>
                        <p>Select a stream from the sidebar to start watching.</p>
                        <p className="text-xs opacity-50 mt-2">If no streams are listed, try the "Find on Web" button.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
