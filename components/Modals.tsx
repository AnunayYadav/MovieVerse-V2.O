
import React, { useState, useEffect, useRef } from 'react';
import { UserCircle, X, ListPlus, Plus, Check, Loader2, Film, AlertCircle, BrainCircuit, Search, Star, RefreshCcw, Bell, CheckCheck, Inbox, Heart, PaintBucket, Upload, Facebook, Instagram, Twitter, Globe, Scale, DollarSign, Clock, Trophy, Crown, Sparkles, ShieldCheck, CreditCard, Zap } from 'lucide-react';
import { UserProfile, Movie, GENRES_LIST, PersonDetails, AppNotification, MovieDetails } from '../types';
import { TMDB_BASE_URL, TMDB_IMAGE_BASE, formatCurrency } from './Shared';
import { generateSmartRecommendations } from '../services/gemini';
import { getNotifications, markNotificationsRead } from '../services/supabase';

// PROFILE MODAL
interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile: UserProfile;
    onSave: (p: UserProfile) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, profile, onSave }) => {
    const [name, setName] = useState(profile.name || "");
    const [age, setAge] = useState(profile.age || "");
    const [selectedGenres, setSelectedGenres] = useState<string[]>(profile.genres || []);
    const [avatar, setAvatar] = useState(profile.avatar || "");
    const [avatarBg, setAvatarBg] = useState(profile.avatarBackground || "bg-gradient-to-br from-red-600 to-red-900");
    const [error, setError] = useState("");
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isExclusive = profile.canWatch === true;
    const isGoldTheme = isExclusive && profile.theme !== 'default';
  
    useEffect(() => {
        if (isOpen) {
            setName(profile.name || "");
            setAge(profile.age || "");
            setSelectedGenres(profile.genres || []);
            setAvatar(profile.avatar || "");
            setAvatarBg(profile.avatarBackground || (isGoldTheme ? "bg-gradient-to-br from-amber-500 to-yellow-900" : "bg-gradient-to-br from-red-600 to-red-900"));
            setError("");
        }
    }, [isOpen, profile, isGoldTheme]);
    
    const BACKGROUNDS = [
        { id: "default", class: isGoldTheme ? "bg-gradient-to-br from-amber-500 to-yellow-900" : "bg-gradient-to-br from-red-600 to-red-900", name: "Default" },
        { id: "dark", class: "bg-gradient-to-br from-gray-900 to-black", name: "Dark Void" },
        { id: "crimson", class: "bg-gradient-to-br from-red-950 to-black", name: "Blood Moon" },
        { id: "steel", class: "bg-gradient-to-br from-zinc-700 to-zinc-900", name: "Dark Metal" },
        { id: "abyss", class: "bg-black", name: "Abyss" },
        ...(isExclusive ? [{ id: "gold", class: "bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-700", name: "Pure Gold" }] : [])
    ];
  
    const toggleGenre = (genre: string) => {
        setSelectedGenres(prev => 
            prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
        );
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { 
                setError("Image too large. Max 5MB.");
                return;
            }
            if (!file.type.startsWith('image/')) {
                setError("Please upload a valid image file.");
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target?.result) {
                    setAvatar(e.target.result as string);
                    setError("");
                }
            };
            reader.readAsDataURL(file);
        }
    };
  
    const handleSave = () => {
        const ageNum = parseInt(age);
        if (!name.trim()) {
            setError("Display name is required.");
            return;
        }
        if (!age || isNaN(ageNum) || ageNum < 10 || ageNum > 120) {
            setError("Age must be between 10 and 120.");
            return;
        }
        if (selectedGenres.length < 3) {
             setError("Please select at least 3 genres to personalize your feed.");
             return;
        }
        onSave({ ...profile, name, age, genres: selectedGenres, avatar, avatarBackground: avatarBg });
        onClose();
    };

    if (!isOpen) return null;
  
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
         <div className="glass-panel w-full max-w-3xl rounded-3xl p-0 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 slide-in-from-bottom-5 duration-300 ease-out">
             <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                 <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">Edit Profile</h2>
                    <p className="text-xs text-gray-400">Update your persona and viewing preferences.</p>
                 </div>
                 <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10 hover:scale-105 active:scale-95"><X size={20}/></button>
             </div>
             
             <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-200 text-sm font-medium animate-in slide-in-from-top-2 duration-300">
                        <div className="bg-red-500/20 p-1.5 rounded-full"><AlertCircle size={16}/></div>
                        {error}
                    </div>
                )}
                <div className="flex flex-col md:flex-row gap-8">
                    <div className="w-full md:w-1/3 space-y-6">
                        <div className="space-y-4">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Avatar & Style</label>
                            <div className="flex justify-center md:justify-start">
                                <div className="relative group">
                                    <div className={`w-28 h-28 rounded-full flex items-center justify-center text-4xl font-bold text-white shadow-2xl overflow-hidden border-2 transition-colors duration-500 ${avatarBg} ${isGoldTheme ? 'border-amber-500/50 shadow-amber-900/30' : 'border-white/10 shadow-black/50'}`}>
                                        {avatar ? <img src={avatar} className="w-full h-full object-cover animate-in fade-in duration-500" alt="avatar"/> : name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-2 border-white/30 duration-300" onClick={() => setAvatar("")}>
                                        <RefreshCcw size={24} className="text-white"/>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-500 font-bold mb-2 uppercase flex items-center gap-1"><PaintBucket size={10}/> Backdrop</p>
                                <div className="flex gap-2">
                                    {BACKGROUNDS.map(bg => (
                                        <button 
                                            key={bg.id}
                                            onClick={() => setAvatarBg(bg.class)}
                                            className={`w-6 h-6 rounded-full ${bg.class} border-2 transition-all duration-300 ${avatarBg === bg.class ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:border-white/50 hover:scale-105'}`}
                                            title={bg.name}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="pt-2">
                                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="absolute opacity-0 w-0 h-0 pointer-events-none" />
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-2 group active:scale-95 shadow-lg"><Upload size={16}/> Upload Custom Photo</button>
                            </div>
                        </div>
                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Display Name</label>
                                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none transition-all text-sm" placeholder="Your Name" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Age</label>
                                <input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none transition-all text-sm" placeholder="10-120" />
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 space-y-6">
                        <div className="bg-white/5 rounded-2xl p-6 border border-white/5 h-full">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4"><Heart size={16} className={isGoldTheme ? "text-amber-500" : "text-red-500"}/> Content Interests</h3>
                            <div className="flex flex-wrap gap-2 max-h-[350px] overflow-y-auto custom-scrollbar p-1">
                                {GENRES_LIST.map(genre => (
                                    <button 
                                    key={genre}
                                    onClick={() => toggleGenre(genre)}
                                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all duration-300 border flex items-center gap-2 active:scale-95 ${selectedGenres.includes(genre) ? (isGoldTheme ? 'bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/30' : 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-900/30') : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/30 hover:text-white hover:bg-white/5'}`}
                                    >
                                        {genre}
                                        {selectedGenres.includes(genre) && <Check size={12}/>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
             </div>
             <div className="p-6 border-t border-white/5 bg-black/20 flex justify-end gap-3">
                 <button onClick={onClose} className="px-6 py-3 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all">Cancel</button>
                 <button onClick={handleSave} className="px-8 py-3 bg-white text-black font-bold rounded-xl transition-all hover:bg-gray-200">Save Changes</button>
             </div>
         </div>
      </div>
    );
};

// LIST SELECTION MODAL
interface ListModalProps {
    isOpen: boolean;
    onClose: () => void;
    movie: Movie | null;
    customLists: Record<string, Movie[]>;
    onCreateList: (name: string, m: Movie) => void;
    onAddToList: (name: string, m: Movie) => void;
}

export const ListSelectionModal: React.FC<ListModalProps> = ({ isOpen, onClose, movie, customLists, onCreateList, onAddToList }) => {
    const [newListName, setNewListName] = useState("");
    if (!isOpen || !movie) return null;
    const handleCreate = () => { if (newListName.trim()) { onCreateList(newListName, movie); setNewListName(""); onClose(); }};
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
        <div className="glass-panel w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-white flex items-center gap-2"><ListPlus size={20} className="text-red-500"/> Add to List</h3><button onClick={onClose} className="text-gray-400 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-colors active:scale-95"><X size={20}/></button></div>
          <div className="space-y-4">
            <div className="flex gap-2"><input type="text" value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="New List Name..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-red-500 focus:outline-none transition-all"/><button onClick={handleCreate} className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-xl transition-all active:scale-95"><Plus size={18}/></button></div>
            <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
               {Object.keys(customLists).length === 0 ? <p className="text-xs text-gray-500 text-center py-6 border border-dashed border-white/10 rounded-xl">No custom lists yet.</p> : Object.keys(customLists).map(listName => { const isPresent = customLists[listName].some(m => m.id === movie.id); return (<button key={listName} onClick={() => { onAddToList(listName, movie); onClose(); }} className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 p-3 rounded-xl text-sm transition-all border border-transparent hover:border-white/10 active:scale-[0.98]"><span className="text-gray-200 font-medium">{listName}</span>{isPresent ? <Check size={16} className="text-green-500"/> : <Plus size={16} className="text-gray-500"/>}</button>) })}
            </div>
          </div>
        </div>
      </div>
    );
};

// PERSON MODAL
interface PersonModalProps {
    personId: number;
    onClose: () => void;
    apiKey: string;
    onMovieClick: (m: Movie) => void;
}

export const PersonModal: React.FC<PersonModalProps> = ({ personId, onClose, apiKey, onMovieClick }) => {
    const [person, setPerson] = useState<PersonDetails | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (personId && apiKey) {
            setLoading(true);
            fetch(`${TMDB_BASE_URL}/person/${personId}?api_key=${apiKey}&append_to_response=combined_credits,external_ids`)
                .then(res => res.json())
                .then(data => {
                    setPerson(data);
                    setLoading(false);
                })
                .catch(() => setLoading(false));
        }
    }, [personId, apiKey]);

    if (!personId) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="glass-panel w-full max-w-4xl rounded-3xl p-0 overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                <button onClick={onClose} className="absolute top-6 right-6 z-20 text-white/50 hover:text-white bg-white/5 p-2 rounded-full"><X size={20}/></button>
                {loading || !person ? (
                    <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin text-red-600" size={48}/></div>
                ) : (
                    <div className="flex flex-col md:flex-row h-full overflow-hidden">
                        <div className="w-full md:w-1/3 shrink-0 relative">
                             <img src={person.profile_path ? `${TMDB_IMAGE_BASE}${person.profile_path}` : "https://placehold.co/400x600"} className="w-full h-full object-cover" alt={person.name}/>
                             <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                             <div className="absolute bottom-6 left-6">
                                 <h2 className="text-3xl font-black text-white">{person.name}</h2>
                                 <p className="text-red-500 font-bold text-sm uppercase tracking-widest">{person.known_for_department}</p>
                             </div>
                        </div>
                        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-[#050505]">
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-white font-bold mb-2">Biography</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">{person.biography || "No biography available."}</p>
                                </div>
                                <div>
                                    <h3 className="text-white font-bold mb-4">Known For</h3>
                                    <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                                        {person.combined_credits?.cast?.slice(0, 12).sort((a,b) => b.popularity - a.popularity).map(m => (
                                            <div key={m.id} className="cursor-pointer group aspect-[2/3] rounded-lg overflow-hidden relative" onClick={() => onMovieClick(m)}>
                                                <img src={m.poster_path ? `${TMDB_IMAGE_BASE}${m.poster_path}` : "https://placehold.co/100x150"} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2"><p className="text-[10px] font-bold text-white text-center">{m.title || m.name}</p></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// AI RECOMMENDATION MODAL
interface AIRecommendationModalProps {
    isOpen: boolean;
    onClose: () => void;
    apiKey: string;
}

export const AIRecommendationModal: React.FC<AIRecommendationModalProps> = ({ isOpen, onClose, apiKey }) => {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ movies: Movie[], reason: string } | null>(null);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setLoading(true);
        try {
            const data = await generateSmartRecommendations(query);
            const moviePromises = data.movies.slice(0, 10).map(title => 
                fetch(`${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(title)}`)
                .then(r => r.json())
                .then(d => d.results?.[0])
            );
            const movies = await Promise.all(moviePromises);
            setResult({ movies: movies.filter(Boolean), reason: data.reason });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="glass-panel w-full max-w-2xl rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"><X size={20}/></button>
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-red-600 rounded-lg text-white"><BrainCircuit size={24}/></div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Smart AI Recommendations</h2>
                        <p className="text-xs text-gray-500">Ask for movies by mood, plot, or specific vibes.</p>
                    </div>
                </div>
                <div className="flex gap-2 mb-8">
                    <input 
                        type="text" 
                        value={query} 
                        onChange={(e) => setQuery(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="e.g., 'Mind-bending sci-fi like Inception' or 'Sorrowful 90s dramas'" 
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-all"
                    />
                    <button onClick={handleSearch} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50">
                        {loading ? <Loader2 className="animate-spin" size={20}/> : "Ask AI"}
                    </button>
                </div>
                {result && (
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
                        <div className="p-4 bg-red-900/10 border border-red-500/20 rounded-xl">
                            <p className="text-sm text-gray-200 italic">"{result.reason}"</p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {result.movies.map(m => (
                                <div key={m.id} className="space-y-2">
                                    <div className="aspect-[2/3] rounded-lg overflow-hidden border border-white/5">
                                        <img src={m.poster_path ? `${TMDB_IMAGE_BASE}${m.poster_path}` : "https://placehold.co/200x300"} className="w-full h-full object-cover"/>
                                    </div>
                                    <p className="text-xs font-bold text-white truncate">{m.title}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// NOTIFICATION MODAL
interface NotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    userProfile: UserProfile;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose, userProfile }) => {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            getNotifications().then(data => {
                setNotifications(data);
                setLoading(false);
                markNotificationsRead();
            }).catch(() => setLoading(false));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="glass-panel w-full max-w-md rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-300">
                <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"><X size={20}/></button>
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-amber-500 rounded-lg text-black"><Bell size={24}/></div>
                    <h2 className="text-xl font-bold text-white">Notifications</h2>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-amber-500"/></div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-12 opacity-40">
                            <Inbox size={48} className="mx-auto mb-4"/>
                            <p className="text-sm font-medium">All caught up!</p>
                        </div>
                    ) : (
                        notifications.map(n => (
                            <div key={n.id} className={`p-4 rounded-2xl border transition-all ${n.read ? 'bg-white/5 border-white/5' : 'bg-amber-500/10 border-amber-500/20 shadow-lg'}`}>
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="text-sm font-bold text-white">{n.title}</h3>
                                    <span className="text-[10px] text-gray-500">{n.time}</span>
                                </div>
                                <p className="text-xs text-gray-400 leading-relaxed">{n.message}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>
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
    const [compareMovie, setCompareMovie] = useState<Movie | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Movie[]>([]);

    useEffect(() => {
        if (searchQuery.length > 2) {
            fetch(`${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(searchQuery)}`)
                .then(r => r.json())
                .then(d => setSearchResults(d.results || []));
        }
    }, [searchQuery, apiKey]);

    if (!isOpen || !baseMovie) return null;

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="glass-panel w-full max-w-5xl rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"><X size={20}/></button>
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-blue-600 rounded-lg text-white"><Scale size={24}/></div>
                    <h2 className="text-xl font-bold text-white">Compare Movies</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-8 flex-1 overflow-hidden">
                    {/* Base Movie */}
                    <div className="space-y-4">
                        <div className="aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl">
                            <img src={`${TMDB_IMAGE_BASE}${baseMovie.poster_path}`} className="w-full h-full object-cover"/>
                        </div>
                        <h3 className="text-lg font-black text-center">{baseMovie.title}</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between py-2 border-b border-white/5"><span className="text-gray-500">Rating</span><span className="text-yellow-500 font-bold">{baseMovie.vote_average.toFixed(1)}</span></div>
                            <div className="flex justify-between py-2 border-b border-white/5"><span className="text-gray-500">Popularity</span><span className="text-white font-bold">{Math.round(baseMovie.popularity)}</span></div>
                            <div className="flex justify-between py-2 border-b border-white/5"><span className="text-gray-500">Year</span><span className="text-white font-bold">{baseMovie.release_date?.split('-')[0]}</span></div>
                        </div>
                    </div>
                    {/* VS Center */}
                    <div className="hidden md:flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center text-xl font-black italic shadow-2xl shadow-red-900/40">VS</div>
                    </div>
                    {/* Comparison Movie */}
                    <div className="space-y-4">
                        {!compareMovie ? (
                            <div className="space-y-4 h-full flex flex-col">
                                <div className="relative">
                                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"/>
                                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search to compare..." className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-red-600"/>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                                    {searchResults.map(m => (
                                        <button key={m.id} onClick={() => setCompareMovie(m)} className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl transition-colors">
                                            <img src={`${TMDB_IMAGE_BASE}${m.poster_path}`} className="w-10 h-14 object-cover rounded-md"/>
                                            <span className="text-xs font-bold text-left">{m.title}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="relative group">
                                    <div className="aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl">
                                        <img src={`${TMDB_IMAGE_BASE}${compareMovie.poster_path}`} className="w-full h-full object-cover"/>
                                    </div>
                                    <button onClick={() => setCompareMovie(null)} className="absolute top-4 right-4 bg-black/60 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><RefreshCcw size={16}/></button>
                                </div>
                                <h3 className="text-lg font-black text-center">{compareMovie.title}</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between py-2 border-b border-white/5"><span className="text-gray-500">Rating</span><span className="text-yellow-500 font-bold">{compareMovie.vote_average.toFixed(1)}</span></div>
                                    <div className="flex justify-between py-2 border-b border-white/5"><span className="text-gray-500">Popularity</span><span className="text-white font-bold">{Math.round(compareMovie.popularity)}</span></div>
                                    <div className="flex justify-between py-2 border-b border-white/5"><span className="text-gray-500">Year</span><span className="text-white font-bold">{compareMovie.release_date?.split('-')[0]}</span></div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
