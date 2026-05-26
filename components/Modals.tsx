
import React, { useState, useEffect, useRef } from 'react';
import { UserCircle, X, ListPlus, Plus, Check, Loader2, Film, AlertCircle, BrainCircuit, Search, Star, RefreshCcw, Bell, CheckCheck, Inbox, Heart, PaintBucket, Upload, Facebook, Instagram, Twitter, Globe, Scale, DollarSign, Clock, Trophy, ChevronRight, ChevronDown, Calendar, ArrowUp, ArrowDown, TrendingUp, History, ArrowLeft, MoreHorizontal, Dice5, Shield, ExternalLink } from 'lucide-react';
import { UserProfile, Movie, GENRES_LIST, PersonDetails, AppNotification, MovieDetails } from '../types';
import { TMDB_BASE_URL, TMDB_IMAGE_BASE, formatCurrency, MovieSkeleton } from './Shared';
import { generateSmartRecommendations } from '../services/gemini';
import { getNotifications, markNotificationsRead } from '../services/supabase';

// AGE VERIFICATION MODAL (Uncloseable)
interface AgeVerificationModalProps {
    isOpen: boolean;
    onSave: (age: string) => void;
}

export const AgeVerificationModal: React.FC<AgeVerificationModalProps> = ({ isOpen, onSave }) => {
    const [age, setAge] = useState("");
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#121212] p-8 rounded-2xl w-full max-w-md text-center border border-red-600/30 shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                    <UserCircle size={32} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Age Verification Required</h2>
                <p className="text-gray-400 mb-8 text-sm leading-relaxed">
                    To provide personalized recommendations and ensure appropriate content content (18+), please confirm your age to continue.
                </p>
                <div className="relative mb-6">
                    <input 
                        type="number" 
                        value={age} 
                        onChange={(e) => setAge(e.target.value)} 
                        placeholder="Enter your age (e.g. 24)"
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white focus:border-red-600 focus:outline-none text-center text-lg font-bold placeholder-white/20 transition-colors"
                        min="10"
                        max="120"
                        autoFocus
                    />
                </div>
                <button 
                    onClick={() => { if(age && !isNaN(parseInt(age)) && parseInt(age) > 0) onSave(age); }}
                    disabled={!age}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-lg shadow-red-900/20"
                >
                    Continue to MovieVerse
                </button>
            </div>
        </div>
    );
};

// FULL CREDITS MODAL
interface FullCreditsModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    credits: any[];
    onPersonClick: (id: number) => void;
}

export const FullCreditsModal: React.FC<FullCreditsModalProps> = ({ isOpen, onClose, title, credits, onPersonClick }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-xl animate-in fade-in duration-300 flex flex-col">
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ArrowLeft size={20}/></button>
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                </div>
                <span className="text-xs font-bold bg-white/10 px-3 py-1 rounded-full text-gray-300">{credits.length} People</span>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {credits.map((person, idx) => (
                        <div key={`${person.id}-${idx}`} onClick={() => { onClose(); onPersonClick(person.id); }} className="flex flex-col items-center text-center p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                            <div className="w-20 h-20 rounded-full overflow-hidden mb-3 border-2 border-transparent group-hover:border-white/30 transition-all">
                                <img 
                                    src={person.profile_path ? `${TMDB_IMAGE_BASE}${person.profile_path}` : `https://ui-avatars.com/api/?name=${person.name}&background=333&color=fff`} 
                                    alt={person.name} 
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <h4 className="text-sm font-bold text-white mb-1 line-clamp-1">{person.name}</h4>
                            <p className="text-xs text-gray-500 line-clamp-1">{person.character || person.job}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// PERSON PAGE
interface PersonPageProps {
    personId: number;
    onClose: () => void;
    apiKey: string;
    onMovieClick: (m: Movie) => void;
}

export const PersonPage: React.FC<PersonPageProps> = ({ personId, onClose, apiKey, onMovieClick }) => {
    const [details, setDetails] = useState<PersonDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [showFilmography, setShowFilmography] = useState(false);
  
    useEffect(() => {
      if (!personId || !apiKey) return;
      setLoading(true);
      fetch(`${TMDB_BASE_URL}/person/${personId}?api_key=${apiKey}&append_to_response=combined_credits,images,external_ids`)
        .then(res => { if (!res.ok) throw new Error("Fetch failed"); return res.json(); })
        .then(data => { setDetails(data); setLoading(false); })
        .catch(err => { console.error("Person fetch error", err); setLoading(false); setDetails(null); });
    }, [personId, apiKey]);
  
    if (!personId) return null;

    const SocialLink = ({ url, icon: Icon, color }: { url?: string, icon: any, color: string }) => {
        if (!url) return null;
        return (
            <a href={url} target="_blank" rel="noopener noreferrer" className={`p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors ${color} border border-white/5`}>
                <Icon size={16}/>
            </a>
        );
    };
  
    return (
      <div className="fixed inset-0 z-[100] bg-[#0a0a0a] overflow-y-auto custom-scrollbar animate-in slide-in-from-bottom-10 duration-500">
        <button onClick={onClose} className="fixed top-6 left-6 z-[120] bg-black/40 hover:bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-white flex items-center gap-2 border border-white/5 text-sm font-bold active:scale-95 transition-all"><ArrowLeft size={20}/> Back</button>

          {loading ? (
             <div className="h-screen flex items-center justify-center flex-col gap-4">
                 <div className="w-20 h-20 rounded-full border-4 border-white/5 border-t-red-600 animate-spin"></div>
                 <p className="text-gray-500 text-sm animate-pulse">Loading Details...</p>
             </div>
          ) : details ? (
             <div className="flex flex-col lg:flex-row min-h-screen">
                  {/* Left Column: Image & Quick Info */}
                  <div className="w-full lg:w-80 shrink-0 bg-black/40 p-6 lg:h-screen lg:sticky lg:top-0 lg:overflow-y-auto border-r border-white/5 flex flex-col items-center text-center">
                    <img 
                        src={details.profile_path ? `${TMDB_IMAGE_BASE}${details.profile_path}` : "https://placehold.co/300x450/333/FFF?text=No+Image"} 
                        alt={details.name} 
                        className="w-48 rounded-xl shadow-2xl border border-white/10 mb-6 object-cover aspect-[2/3] animate-in fade-in zoom-in duration-500" 
                    />
                    
                    <h2 className="text-2xl font-bold text-white mb-1">{details.name}</h2>
                    <p className="text-red-400 text-xs font-bold tracking-wider uppercase mb-6">{details.known_for_department}</p>

                    {/* Social Links */}
                    <div className="flex justify-center gap-3 mb-6">
                        {details.external_ids?.imdb_id && <SocialLink url={`https://www.imdb.com/name/${details.external_ids.imdb_id}`} icon={Film} color="text-yellow-400"/>}
                        {details.external_ids?.instagram_id && <SocialLink url={`https://instagram.com/${details.external_ids.instagram_id}`} icon={Instagram} color="text-pink-400"/>}
                        {details.external_ids?.twitter_id && <SocialLink url={`https://twitter.com/${details.external_ids.twitter_id}`} icon={Twitter} color="text-blue-400"/>}
                        {details.external_ids?.facebook_id && <SocialLink url={`https://facebook.com/${details.external_ids.facebook_id}`} icon={Facebook} color="text-blue-600"/>}
                        {details.homepage && <SocialLink url={details.homepage} icon={Globe} color="text-green-400"/>}
                    </div>

                    <div className="space-y-3 w-full text-left">
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5"><span className="text-white/40 block text-[10px] uppercase font-bold tracking-wider mb-0.5">Born</span><span className="text-white font-medium text-sm">{details.birthday || 'N/A'}</span></div>
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5"><span className="text-white/40 block text-[10px] uppercase font-bold tracking-wider mb-0.5">Place of Birth</span><span className="text-white font-medium text-sm">{details.place_of_birth || 'N/A'}</span></div>
                    </div>
                  </div>

                  {/* Right Column: Bio & Credits */}
                  <div className="flex-1 p-6 lg:p-10">
                    <h3 className="text-xl font-bold text-white mb-3">Biography</h3>
                    <p className="text-gray-300 text-sm leading-relaxed mb-8 whitespace-pre-line max-w-4xl">{details.biography || "No biography available."}</p>
                    
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2"><Film size={18} className="text-red-500"/> Known For</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                        {details.combined_credits?.cast?.sort((a: any,b: any) => b.popularity - a.popularity).slice(0, 10).map((movie: Movie) => (
                          <div key={movie.id} onClick={() => onMovieClick(movie)} className="cursor-pointer group">
                            <div className="aspect-[2/3] rounded-lg overflow-hidden mb-2 relative border border-white/5 shadow-lg"><img src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : "https://placehold.co/100x150"} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out" alt={movie.title || movie.name} /></div>
                            <p className="text-xs font-bold text-white truncate group-hover:text-red-400 transition-colors">{movie.title || movie.name}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">{movie.release_date?.split('-')[0] || movie.first_air_date?.split('-')[0]}</p>
                          </div>
                        ))}
                     </div>
                  </div>
             </div>
          ) : null}
      </div>
    );
};

// NOTIFICATION MODAL
interface NotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate?: () => void;
    userProfile?: UserProfile;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose, onUpdate, userProfile }) => {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(false);
    const isExclusive = userProfile?.canWatch === true;
    const isGoldTheme = false;

    useEffect(() => {
        if (isOpen) {
            loadNotifications();
        }
    }, [isOpen]);

    const loadNotifications = async () => {
        setLoading(true);
        const data = await getNotifications();
        setNotifications(data);
        setLoading(false);
    };

    const handleMarkAllRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        await markNotificationsRead();
        onUpdate?.();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed top-16 right-4 md:right-20 z-[90] w-80 animate-in slide-in-from-top-2 fade-in zoom-in-95 duration-200">
            <div className="bg-[#0c0c0e]/95 backdrop-blur-3xl border border-white/10 rounded-2xl w-80 shadow-2xl p-4 flex flex-col">
                <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-2">
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="text-zinc-400 hover:text-white p-1 hover:bg-white/5 rounded transition-all"><ArrowLeft size={16}/></button>
                        <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5"><Bell size={13} className="text-red-500"/> Inbox</h3>
                    </div>
                    {notifications.some(n => !n.read) && (
                        <button onClick={handleMarkAllRead} className="text-[10px] text-red-500 hover:text-red-400 font-extrabold uppercase tracking-wider hover:underline transition-all">Mark all read</button>
                    )}
                </div>
                
                <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-2 mt-1">
                    {loading ? (
                         <div className="space-y-3 py-2">
                             {[...Array(3)].map((_,i) => (
                                 <div key={i} className="h-10 bg-white/5 rounded-xl animate-pulse"></div>
                             ))}
                         </div>
                    ) : notifications.length === 0 ? (
                        <div className="py-10 flex flex-col items-center justify-center text-zinc-500 text-center animate-in fade-in">
                            <Inbox size={20} className="mb-1.5 opacity-40"/>
                            <p className="text-[11px] font-semibold">Your inbox is empty</p>
                        </div>
                    ) : (
                        notifications.map(n => (
                            <div key={n.id} className={`p-3 rounded-xl border border-transparent transition-all relative flex flex-col ${!n.read ? 'bg-white/5 border-l-2 border-l-red-600' : 'bg-transparent hover:bg-white/5'}`}>
                                <div className="flex justify-between items-start gap-2 mb-1">
                                    <p className={`text-xs leading-snug ${!n.read ? 'text-white font-bold' : 'text-zinc-300 font-medium'}`}>{n.title}</p>
                                    {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 shrink-0"></div>}
                                </div>
                                <p className="text-[11px] text-zinc-400 leading-normal line-clamp-2">{n.message}</p>
                                <p className="text-[9px] text-zinc-600 mt-1.5 font-medium">{n.time}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>
            <div className="fixed inset-0 -z-10" onClick={onClose}></div>
        </div>
    );
};

// COMPARISON MODAL
interface ComparisonModalProps {
    isOpen: boolean;
    onClose: () => void;
    baseMovie: Movie | null;
    apiKey: string;
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({ isOpen, onClose, baseMovie, apiKey }) => {
    const [movie1, setMovie1] = useState<MovieDetails | null>(null);
    const [movie2, setMovie2] = useState<MovieDetails | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Movie[]>([]);
    const [loading1, setLoading1] = useState(false);
    const [loading2, setLoading2] = useState(false);

    useEffect(() => {
        if (isOpen && baseMovie && apiKey) {
            setLoading1(true);
            fetch(`${TMDB_BASE_URL}/movie/${baseMovie.id}?api_key=${apiKey}`)
                .then(r => r.json())
                .then(d => { setMovie1(d); setLoading1(false); })
                .catch(() => setLoading1(false));
            setMovie2(null);
            setSearchQuery("");
            setSearchResults([]);
        }
    }, [isOpen, baseMovie, apiKey]);

    useEffect(() => {
        if (searchQuery.length > 2 && apiKey) {
            const timeout = setTimeout(() => {
                fetch(`${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(searchQuery)}`)
                    .then(r => r.json())
                    .then(d => setSearchResults((d.results || []).slice(0, 5)));
            }, 300);
            return () => clearTimeout(timeout);
        } else {
            setSearchResults([]);
        }
    }, [searchQuery, apiKey]);

    const selectMovie2 = (m: Movie) => {
        setLoading2(true);
        fetch(`${TMDB_BASE_URL}/movie/${m.id}?api_key=${apiKey}`)
            .then(r => r.json())
            .then(d => { setMovie2(d); setLoading2(false); setSearchQuery(""); setSearchResults([]); })
            .catch(() => setLoading2(false));
    };

    if (!isOpen || !baseMovie) return null;

    const ComparisonBar = ({ val1, val2, max, format, inverse = false }: { val1: number, val2: number, max: number, format: (v: number) => string, inverse?: boolean }) => {
        const p1 = Math.min((val1 / max) * 100, 100) || 0;
        const p2 = Math.min((val2 / max) * 100, 100) || 0;
        const win1 = inverse ? val1 < val2 : val1 > val2;
        const win2 = inverse ? val2 < val1 : val2 > val1;

        return (
            <div className="flex items-center gap-4 w-full">
                <div className={`w-24 text-right text-xs font-bold ${win1 ? 'text-green-400' : 'text-gray-400'}`}>{format(val1)}</div>
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden flex">
                    <div className="bg-red-500 h-full transition-all duration-1000" style={{ width: `${p1}%` }}/>
                </div>
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden flex justify-end">
                    <div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: `${p2}%` }}/>
                </div>
                <div className={`w-24 text-left text-xs font-bold ${win2 ? 'text-green-400' : 'text-gray-400'}`}>{format(val2)}</div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="glass-panel w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/40">
                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ArrowLeft size={20}/></button>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Scale className="text-red-500"/> Movie Face-Off</h2>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Movie 1 */}
                        <div className="flex-1 flex flex-col items-center text-center">
                            {movie1 && (
                                <>
                                    <img src={movie1.poster_path ? `${TMDB_IMAGE_BASE}${movie1.poster_path}` : "https://placehold.co/200x300"} className="w-48 rounded-xl shadow-lg border-2 border-red-500/50 mb-4 object-cover" alt={movie1.title}/>
                                    <h3 className="text-xl font-bold text-white mb-1">{movie1.title}</h3>
                                    <p className="text-sm text-gray-400 mb-2">{movie1.release_date?.split('-')[0]}</p>
                                    <div className="flex items-center gap-1 text-yellow-500 font-bold"><Star size={14} fill="currentColor"/> {movie1.vote_average.toFixed(1)}</div>
                                </>
                            )}
                        </div>

                        {/* VS Divider / Search */}
                        <div className="w-full md:w-80 shrink-0 flex flex-col items-center">
                            {!movie2 ? (
                                <div className="w-full space-y-4">
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-2 text-2xl font-black text-gray-500 italic">VS</div>
                                        <p className="text-sm text-gray-400">Select an opponent</p>
                                    </div>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16}/>
                                        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search movie..." className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"/>
                                        {searchResults.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-white/10 rounded-xl overflow-hidden shadow-xl z-50">
                                                {searchResults.map(m => (
                                                    <button key={m.id} onClick={() => selectMovie2(m)} className="w-full text-left p-3 hover:bg-white/10 flex items-center gap-3 transition-colors">
                                                        <img src={m.poster_path ? `${TMDB_IMAGE_BASE}${m.poster_path}` : "https://placehold.co/50x75"} className="w-8 h-12 object-cover rounded" alt=""/>
                                                        <div>
                                                            <p className="text-sm font-bold text-white line-clamp-1">{m.title}</p>
                                                            <p className="text-xs text-gray-500">{m.release_date?.split('-')[0]}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full">
                                    <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-blue-500 italic">VS</div>
                                    <button onClick={() => setMovie2(null)} className="mt-4 text-xs text-gray-400 hover:text-white underline">Change Opponent</button>
                                </div>
                            )}
                        </div>

                        {/* Movie 2 */}
                        <div className="flex-1 flex flex-col items-center text-center">
                            {movie2 ? (
                                <>
                                    <img src={movie2.poster_path ? `${TMDB_IMAGE_BASE}${movie2.poster_path}` : "https://placehold.co/200x300"} className="w-48 rounded-xl shadow-lg border-2 border-red-500/50 mb-4 object-cover" alt={movie2.title}/>
                                    <h3 className="text-xl font-bold text-white mb-1">{movie2.title}</h3>
                                    <p className="text-sm text-gray-400 mb-2">{movie2.release_date?.split('-')[0]}</p>
                                    <div className="flex items-center gap-1 text-yellow-500 font-bold"><Star size={14} fill="currentColor"/> {movie2.vote_average.toFixed(1)}</div>
                                </>
                            ) : (
                                <div className="w-48 h-72 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center text-gray-600">
                                    <Film size={48}/>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stats Comparison */}
                    {movie1 && movie2 && (
                        <div className="mt-12 space-y-8 max-w-3xl mx-auto animate-in slide-in-from-bottom-4">
                            <div className="space-y-2">
                                <p className="text-center text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center justify-center gap-2"><DollarSign size={14}/> Budget</p>
                                <ComparisonBar val1={movie1.budget} val2={movie2.budget} max={Math.max(movie1.budget, movie2.budget) * 1.2} format={(v) => formatCurrency(v, 'US')} />
                            </div>
                            <div className="space-y-2">
                                <p className="text-center text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center justify-center gap-2"><Trophy size={14}/> Box Office</p>
                                <ComparisonBar val1={movie1.revenue} val2={movie2.revenue} max={Math.max(movie1.revenue, movie2.revenue) * 1.2} format={(v) => formatCurrency(v, 'US')} />
                            </div>
                            <div className="space-y-2">
                                <p className="text-center text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center justify-center gap-2"><Star size={14}/> User Rating</p>
                                <ComparisonBar val1={movie1.vote_average} val2={movie2.vote_average} max={10} format={(v) => v.toFixed(1)} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
