import React, { useState, useEffect, useRef } from 'react';
import { UserCircle, X, ListPlus, Plus, Check, Loader2, Film, AlertCircle, BrainCircuit, Search, Star, RefreshCcw, Bell, CheckCheck, Inbox, Heart, PaintBucket, Upload, Facebook, Instagram, Twitter, Globe, Scale, DollarSign, Clock, Trophy, ChevronRight, ChevronDown, Calendar, ArrowUp, ArrowDown, TrendingUp, History, ArrowLeft, MoreHorizontal, Dice5, Sparkles, MessageCircle, BarChart3, Video } from 'lucide-react';
import { UserProfile, Movie, GENRES_LIST, PersonDetails, AppNotification, MovieDetails } from '../types';
import { TMDB_BASE_URL, TMDB_IMAGE_BASE, formatCurrency, MovieSkeleton, MovieCard, PersonCard } from './Shared';
import { generateSmartRecommendations } from '../services/gemini';
import { getNotifications, markNotificationsRead } from '../services/supabase';

// AGE VERIFICATION MODAL
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
                    To provide personalized recommendations and ensure appropriate content (18+), please confirm your age to continue.
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

// PROFILE PAGE
interface ProfilePageProps {
    isOpen: boolean;
    onClose: () => void;
    profile: UserProfile;
    onSave: (p: UserProfile) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ isOpen, onClose, profile, onSave }) => {
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
    
    const AVATARS = [
        { seed: "Felix", name: "Maverick" },
        { seed: "Aneka", name: "Siren" },
        { seed: "Zack", name: "Cipher" },
        { seed: "Midnight", name: "Noir" },
        { seed: "Shadow", name: "Vantage" },
        { seed: "Bandit", name: "Rogue" },
        { seed: "Luna", name: "Eclipse" },
        { seed: "Leo", name: "Titan" }
    ];

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

    const selectAvatar = (seed: string) => {
        setAvatar(`https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`);
    };
  
    if (!isOpen) return null;
  
    return (
      <div className="fixed inset-0 z-[100] bg-[#0a0a0a] overflow-y-auto animate-in slide-in-from-bottom-10 duration-500 md:left-20">
         <div className="max-w-4xl mx-auto min-h-screen flex flex-col p-6 md:p-8">
             {/* Header */}
             <div className="flex items-center gap-4 mb-8">
                 <button onClick={onClose} className="text-white hover:text-red-500 p-2 rounded-full transition-all active:scale-95"><ArrowLeft size={24}/></button>
                 <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3"><UserCircle size={28} className="text-red-500"/> Edit Profile</h2>
                    <p className="text-xs text-gray-400 mt-1">Update your persona and viewing preferences.</p>
                 </div>
             </div>
             
             <div className="flex-1">
                {error && (
                    <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-200 text-xs font-medium animate-in slide-in-from-top-2 duration-300">
                        <div className="bg-red-500/20 p-1 rounded-full"><AlertCircle size={14}/></div>
                        {error}
                    </div>
                )}

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Left Column: Identity */}
                    <div className="w-full lg:w-1/2 space-y-6">
                        <div className="space-y-5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Avatar & Style</label>
                            <div className="flex justify-center lg:justify-start">
                                <div className="relative group">
                                    <div className={`w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold text-white shadow-2xl overflow-hidden border-4 transition-colors duration-500 ${avatarBg} ${isGoldTheme ? 'border-amber-500/50 shadow-amber-900/30' : 'border-white/10 shadow-black/50'}`}>
                                        {avatar ? <img src={avatar} className="w-full h-full object-cover animate-in fade-in duration-500" alt="avatar"/> : name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-4 border-white/30 duration-300" onClick={() => setAvatar("")}>
                                        <RefreshCcw size={28} className="text-white"/>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                                <p className="text-[10px] text-gray-500 font-bold mb-3 uppercase flex items-center gap-2"><PaintBucket size={12}/> Background Theme</p>
                                <div className="flex gap-3 flex-wrap">
                                    {BACKGROUNDS.map(bg => (
                                        <button 
                                            key={bg.id}
                                            onClick={() => setAvatarBg(bg.class)}
                                            className={`w-7 h-7 rounded-full ${bg.class} border-2 transition-all duration-300 ring-2 ring-transparent ${avatarBg === bg.class ? 'border-white scale-110 shadow-xl ring-white/20' : 'border-transparent hover:border-white/50 hover:scale-105'}`}
                                            title={bg.name}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-2 group active:scale-95">
                                    <Upload size={16} className="group-hover:-translate-y-0.5 transition-transform"/> Upload Photo
                                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                                </button>
                                <button type="button" onClick={() => selectAvatar(AVATARS[Math.floor(Math.random() * AVATARS.length)].seed)} className="py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-2 group active:scale-95">
                                    <Dice5 size={16} className="group-hover:rotate-180 transition-transform duration-500"/> Randomize
                                </button>
                            </div>
                        </div>

                        <div className="space-y-5 pt-5 border-t border-white/5">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Display Name</label>
                                <div className="relative group">
                                    <UserCircle size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white transition-colors duration-300"/>
                                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={`w-full bg-white/5 border border-white/5 rounded-xl py-3 pl-11 pr-4 text-white focus:bg-white/10 focus:outline-none transition-all duration-300 text-sm hover:bg-white/10 ${isGoldTheme ? 'focus:border-amber-500' : 'focus:border-red-500'}`} placeholder="Your Name" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Age</label>
                                <div className="relative group">
                                    <UserCircle size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white transition-colors duration-300"/>
                                    <input type="number" value={age} min="10" max="120" onChange={(e) => { const val = parseInt(e.target.value); if (!e.target.value || (val >= 0 && val <= 130)) { setAge(e.target.value); }}} className={`w-full bg-white/5 border border-white/5 rounded-xl py-3 pl-11 pr-4 text-white focus:bg-white/10 focus:outline-none transition-all duration-300 text-sm hover:bg-white/10 ${isGoldTheme ? 'focus:border-amber-500' : 'focus:border-red-500'}`} placeholder="10-120" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Preferences */}
                    <div className="flex-1 space-y-6">
                        <div className="bg-white/5 rounded-2xl p-6 border border-white/5 h-full">
                            <div className="flex justify-between items-center mb-5">
                                <h3 className="text-base font-bold text-white flex items-center gap-2"><Heart size={18} className={isGoldTheme ? "text-amber-500" : "text-red-500"}/> Content Interests</h3>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors duration-300 ${selectedGenres.length >= 3 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                    {selectedGenres.length} Selected
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 mb-5 leading-relaxed">Select at least 3 genres to help us personalize your "For You" feed and AI recommendations.</p>
                            
                            <div className="flex flex-wrap gap-2">
                                {GENRES_LIST.map(genre => (
                                    <button 
                                    key={genre}
                                    onClick={() => toggleGenre(genre)}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all duration-300 border flex items-center gap-1.5 active:scale-95 ${selectedGenres.includes(genre) ? (isGoldTheme ? 'bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/30' : 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-900/30') : 'bg-black/40 border-white/5 text-gray-400 hover:text-white hover:bg-white/5'}`}
                                    >
                                        {genre}
                                        {selectedGenres.includes(genre) && <Check size={12} className="animate-in zoom-in duration-200"/>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
             </div>
             
             {/* Footer */}
             <div className="mt-8 pt-6 border-t border-white/5 flex justify-end gap-3 sticky bottom-0 bg-[#0a0a0a]/90 backdrop-blur-lg p-6 -mx-6 -mb-6">
                 <button onClick={onClose} className="px-6 py-3 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-300">Cancel</button>
                 <button onClick={handleSave} className={`px-8 py-3 bg-white text-black font-bold rounded-xl transition-all duration-300 active:scale-[0.98] shadow-lg hover:shadow-white/20 text-sm ${isGoldTheme ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:to-amber-400' : 'bg-white hover:bg-gray-200'}`}>
                     Save Changes
                 </button>
             </div>
         </div>
      </div>
    );
};

// LIST SELECTION MODAL
interface ListSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    movie: Movie | null;
    customLists: Record<string, Movie[]>;
    onCreateList: (name: string, movie: Movie) => void;
    onAddToList: (listName: string, movie: Movie) => void;
}

export const ListSelectionModal: React.FC<ListSelectionModalProps> = ({ 
    isOpen, onClose, movie, customLists, onCreateList, onAddToList 
}) => {
    const [newListName, setNewListName] = useState("");
    const [error, setError] = useState("");

    if (!isOpen || !movie) return null;

    const handleCreate = () => {
        if (!newListName.trim()) {
            setError("List name cannot be empty");
            return;
        }
        if (customLists[newListName]) {
            setError("List already exists");
            return;
        }
        onCreateList(newListName, movie);
        setNewListName("");
        onClose();
    };

    const handleAdd = (listName: string) => {
        onAddToList(listName, movie);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
             <div className="bg-[#121212] rounded-2xl w-full max-w-md border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                 <div className="p-6 border-b border-white/5 flex justify-between items-center">
                     <h3 className="text-xl font-bold text-white">Add to List</h3>
                     <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20}/></button>
                 </div>
                 
                 <div className="p-6">
                     <div className="mb-6">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Your Lists</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                            {Object.keys(customLists).map(listName => {
                                const exists = customLists[listName].some(m => m.id === movie.id);
                                return (
                                    <button 
                                        key={listName}
                                        onClick={() => handleAdd(listName)}
                                        disabled={exists}
                                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors ${exists ? 'bg-green-500/10 border-green-500/20 text-green-400 cursor-default' : 'bg-white/5 border-white/5 hover:bg-white/10 text-white'}`}
                                    >
                                        <span className="font-medium text-sm">{listName}</span>
                                        {exists ? <Check size={16}/> : <Plus size={16}/>}
                                    </button>
                                );
                            })}
                            {Object.keys(customLists).length === 0 && <p className="text-sm text-gray-500 italic">No custom lists yet.</p>}
                        </div>
                     </div>
                     
                     <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Create New List</h4>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={newListName}
                                onChange={(e) => { setNewListName(e.target.value); setError(""); }}
                                placeholder="List Name (e.g. 'Date Night')"
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
                            />
                            <button 
                                onClick={handleCreate}
                                className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-xl transition-colors disabled:opacity-50"
                                disabled={!newListName.trim()}
                            >
                                <Plus size={20}/>
                            </button>
                        </div>
                        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
                     </div>
                 </div>
             </div>
        </div>
    );
};

// PERSON PAGE / FILMOGRAPHY
interface PersonPageProps {
    personId: number;
    onClose: () => void;
    apiKey: string;
    onMovieClick: (m: Movie) => void;
}

export const PersonPage: React.FC<PersonPageProps> = ({ personId, onClose, apiKey, onMovieClick }) => {
    const [person, setPerson] = useState<PersonDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [sortBy, setSortBy] = useState("popularity.desc");
    const [credits, setCredits] = useState<Movie[]>([]);

    useEffect(() => {
        if (!personId || !apiKey) return;
        setLoading(true);
        
        fetch(`${TMDB_BASE_URL}/person/${personId}?api_key=${apiKey}&append_to_response=combined_credits,external_ids`)
            .then(res => res.json())
            .then(data => {
                setPerson(data);
                if (data.combined_credits?.cast) {
                    setCredits(data.combined_credits.cast);
                }
                setLoading(false);
            })
            .catch(e => {
                console.error(e);
                setLoading(false);
            });
    }, [personId, apiKey]);

    const sortedCredits = React.useMemo(() => {
        let sorted = [...credits];
        // Filter out no poster
        sorted = sorted.filter(m => m.poster_path);
        
        if (sortBy === "popularity.desc") {
            sorted.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
        } else if (sortBy === "release_date.desc") {
            sorted.sort((a, b) => new Date(b.release_date || b.first_air_date || "").getTime() - new Date(a.release_date || a.first_air_date || "").getTime());
        }
        return sorted;
    }, [credits, sortBy]);

    if (!personId) return null;

    return (
        <div className="fixed inset-0 z-[120] bg-[#0a0a0a] overflow-y-auto animate-in slide-in-from-right-10 duration-500 md:left-20">
             <button 
                onClick={onClose} 
                className="fixed top-6 left-6 md:left-24 z-[130] p-3 rounded-full bg-black/50 hover:bg-white/10 transition-all active:scale-95 text-white"
             >
                <ArrowLeft size={24}/>
             </button>

             {loading || !person ? (
                 <div className="w-full h-screen flex items-center justify-center">
                     <Loader2 size={48} className="animate-spin text-red-600"/>
                 </div>
             ) : (
                 <div className="min-h-screen">
                     {/* Header */}
                     <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0a0a] z-10 pointer-events-none h-96"></div>
                        <div className="max-w-7xl mx-auto px-6 pt-24 pb-12 relative z-20 flex flex-col md:flex-row gap-8 md:gap-12">
                            <div className="shrink-0 mx-auto md:mx-0">
                                <div className="w-48 h-72 md:w-72 md:h-[430px] rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-white/5">
                                    <img 
                                        src={person.profile_path ? `${TMDB_IMAGE_BASE}${person.profile_path}` : "https://placehold.co/300x450"} 
                                        alt={person.name} 
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex-1 text-center md:text-left">
                                <h1 className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight">{person.name}</h1>
                                
                                <div className="flex flex-wrap justify-center md:justify-start gap-4 mb-6 text-sm text-gray-400">
                                    {person.birthday && (
                                        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                                            <Calendar size={14}/> <span>{new Date(person.birthday).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                    {person.place_of_birth && (
                                        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                                            <Globe size={14}/> <span>{person.place_of_birth}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                                        <Star size={14} className="text-yellow-500"/> <span>{person.known_for_department}</span>
                                    </div>
                                </div>

                                <div className="mb-8">
                                    <h3 className="text-sm font-bold text-white mb-2">Biography</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed max-w-3xl mx-auto md:mx-0 whitespace-pre-line">
                                        {person.biography || "No biography available."}
                                    </p>
                                </div>

                                {/* External Links */}
                                <div className="flex justify-center md:justify-start gap-3">
                                    {person.external_ids?.imdb_id && (
                                        <a href={`https://www.imdb.com/name/${person.external_ids.imdb_id}`} target="_blank" rel="noreferrer" className="p-2 bg-yellow-500/10 text-yellow-500 rounded-lg hover:bg-yellow-500/20 transition-colors"><Film size={20}/></a>
                                    )}
                                    {person.external_ids?.instagram_id && (
                                        <a href={`https://instagram.com/${person.external_ids.instagram_id}`} target="_blank" rel="noreferrer" className="p-2 bg-pink-500/10 text-pink-500 rounded-lg hover:bg-pink-500/20 transition-colors"><Instagram size={20}/></a>
                                    )}
                                    {person.external_ids?.twitter_id && (
                                        <a href={`https://twitter.com/${person.external_ids.twitter_id}`} target="_blank" rel="noreferrer" className="p-2 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500/20 transition-colors"><Twitter size={20}/></a>
                                    )}
                                </div>
                            </div>
                        </div>
                     </div>

                     {/* Filmography Grid */}
                     <div className="max-w-7xl mx-auto px-6 pb-20">
                         <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
                             <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Film size={24} className="text-red-500"/> Known For</h2>
                             
                             <div className="flex gap-2">
                                 <button onClick={() => setSortBy("popularity.desc")} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${sortBy === 'popularity.desc' ? 'bg-white text-black' : 'text-gray-400 hover:text-white bg-white/5'}`}>Popular</button>
                                 <button onClick={() => setSortBy("release_date.desc")} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${sortBy === 'release_date.desc' ? 'bg-white text-black' : 'text-gray-400 hover:text-white bg-white/5'}`}>Newest</button>
                             </div>
                         </div>
                         
                         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                             {sortedCredits.map((movie) => (
                                 <div key={movie.id} onClick={() => onMovieClick(movie)} className="cursor-pointer group">
                                     <div className="aspect-[2/3] rounded-xl overflow-hidden bg-white/5 relative mb-2">
                                         <img 
                                            src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : "https://placehold.co/200x300"} 
                                            alt={movie.title || movie.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            loading="lazy"
                                         />
                                         <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-white">
                                             {movie.vote_average?.toFixed(1)}
                                         </div>
                                     </div>
                                     <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-red-500 transition-colors">{movie.title || movie.name}</h3>
                                     <p className="text-xs text-gray-500">{movie.release_date?.split('-')[0] || movie.first_air_date?.split('-')[0] || "TBA"}</p>
                                 </div>
                             ))}
                         </div>
                     </div>
                 </div>
             )}
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
    const [results, setResults] = useState<any[]>([]);
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setLoading(true);
        setResults([]);
        setReason("");

        try {
            // 1. Get recommendations from Gemini (titles)
            const { movies, reason } = await generateSmartRecommendations(query);
            setReason(reason);

            // 2. Fetch details for each title from TMDB
            const moviePromises = movies.map(async (title) => {
                const res = await fetch(`${TMDB_BASE_URL}/search/multi?api_key=${apiKey}&query=${encodeURIComponent(title)}`);
                const data = await res.json();
                return data.results?.[0]; // Take best match
            });

            const movieResults = await Promise.all(moviePromises);
            setResults(movieResults.filter(Boolean)); // Filter out failed searches

        } catch (e) {
            console.error(e);
            setReason("Sorry, I couldn't generate recommendations right now.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#121212] w-full max-w-4xl h-[80vh] rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 relative">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white z-20"><X size={20}/></button>
                
                {/* Header */}
                <div className="p-8 border-b border-white/5 bg-gradient-to-r from-purple-900/20 to-blue-900/20">
                    <div className="flex items-center gap-3 mb-2">
                        <Sparkles className="text-purple-400" size={24}/>
                        <h2 className="text-2xl font-bold text-white">AI Concierge</h2>
                    </div>
                    <p className="text-gray-400 text-sm mb-6">Describe what you're in the mood for, and let AI find the perfect match.</p>
                    
                    <div className="relative">
                        <input 
                            type="text" 
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="e.g. 'Mind-bending sci-fi like Inception', 'Dark comedies from the 90s'..."
                            className="w-full bg-black/50 border border-white/10 rounded-xl py-4 pl-6 pr-14 text-white focus:outline-none focus:border-purple-500 transition-all placeholder-white/20"
                        />
                        <button 
                            onClick={handleSearch}
                            disabled={loading}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors disabled:opacity-50"
                        >
                            {loading ? <Loader2 size={20} className="animate-spin"/> : <ArrowUp size={20}/>}
                        </button>
                    </div>
                </div>

                {/* Results Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                    {reason && (
                        <div className="mb-8 flex items-start gap-4 bg-purple-900/10 border border-purple-500/20 p-4 rounded-xl">
                            <BrainCircuit className="text-purple-400 shrink-0" size={24}/>
                            <p className="text-sm text-gray-200 leading-relaxed italic">"{reason}"</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {results.map((movie, idx) => (
                            <div key={`${movie.id}-${idx}`} className="group relative">
                                <div className="aspect-[2/3] rounded-xl overflow-hidden bg-white/5 relative mb-2">
                                     <img 
                                        src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : "https://placehold.co/200x300"} 
                                        alt={movie.title || movie.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                     />
                                </div>
                                <h3 className="text-sm font-bold text-white line-clamp-1">{movie.title || movie.name}</h3>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span>{movie.release_date?.split('-')[0] || movie.first_air_date?.split('-')[0]}</span>
                                    <span className="flex items-center gap-1 text-yellow-500"><Star size={10} fill="currentColor"/> {movie.vote_average?.toFixed(1)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {!loading && results.length === 0 && !reason && (
                        <div className="text-center py-20 text-gray-600">
                            <Sparkles size={48} className="mx-auto mb-4 opacity-20"/>
                            <p>Waiting for your prompt...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// NOTIFICATION MODAL
interface NotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
    userProfile: UserProfile;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose, onUpdate, userProfile }) => {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            getNotifications().then(data => {
                setNotifications(data);
                setLoading(false);
                markNotificationsRead();
                onUpdate();
            });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-md flex justify-end">
            <div className="w-full max-w-md bg-[#121212] h-full border-l border-white/10 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2"><Bell size={20}/> Notifications</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24}/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-red-600"/></div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-20 text-gray-500">
                            <Inbox size={48} className="mx-auto mb-4 opacity-20"/>
                            <p>No new notifications</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {notifications.map(n => (
                                <div key={n.id} className={`p-4 rounded-xl border transition-colors ${!n.read ? 'bg-white/5 border-white/10' : 'bg-transparent border-transparent hover:bg-white/5'}`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-bold text-white text-sm">{n.title}</h4>
                                        <span className="text-[10px] text-gray-500">{n.time}</span>
                                    </div>
                                    <p className="text-xs text-gray-400 leading-relaxed">{n.message}</p>
                                    {!n.read && <div className="mt-2 w-2 h-2 rounded-full bg-red-600"></div>}
                                </div>
                            ))}
                        </div>
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
    const [secondMovie, setSecondMovie] = useState<MovieDetails | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<Movie[]>([]);
    const [baseDetails, setBaseDetails] = useState<MovieDetails | null>(null);

    // Fetch details for base movie
    useEffect(() => {
        if (baseMovie && apiKey) {
            fetch(`${TMDB_BASE_URL}/${baseMovie.media_type || 'movie'}/${baseMovie.id}?api_key=${apiKey}`)
                .then(r => r.json())
                .then(setBaseDetails);
        }
    }, [baseMovie, apiKey]);

    const handleSearch = async (val: string) => {
        setSearchTerm(val);
        if (val.length > 2) {
            const res = await fetch(`${TMDB_BASE_URL}/search/multi?api_key=${apiKey}&query=${encodeURIComponent(val)}`);
            const data = await res.json();
            setSearchResults(data.results?.filter((m: any) => m.media_type === 'movie' || m.media_type === 'tv').slice(0, 5) || []);
        } else {
            setSearchResults([]);
        }
    };

    const selectSecondMovie = async (movie: Movie) => {
        const res = await fetch(`${TMDB_BASE_URL}/${movie.media_type || 'movie'}/${movie.id}?api_key=${apiKey}`);
        const data = await res.json();
        setSecondMovie(data);
        setSearchTerm("");
        setSearchResults([]);
    };

    if (!isOpen || !baseDetails) return null;

    const StatRow = ({ label, val1, val2, format }: { label: string, val1: any, val2: any, format?: (v: any) => string }) => {
        const v1 = format ? format(val1) : val1;
        const v2 = format ? format(val2) : val2;
        // Simple winner highlight logic (numeric)
        const isNum = typeof val1 === 'number' && typeof val2 === 'number';
        const win1 = isNum && val1 > val2;
        const win2 = isNum && val2 > val1;

        return (
            <div className="grid grid-cols-3 gap-4 py-4 border-b border-white/5 items-center">
                <div className={`text-center font-mono text-sm ${win1 ? 'text-green-400 font-bold' : 'text-gray-300'}`}>{v1 || 'N/A'}</div>
                <div className="text-center text-xs font-bold text-gray-500 uppercase tracking-widest">{label}</div>
                <div className={`text-center font-mono text-sm ${win2 ? 'text-green-400 font-bold' : 'text-gray-300'}`}>{v2 || 'N/A'}</div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[140] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#121212] w-full max-w-5xl h-[80vh] rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 relative">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white z-20"><X size={20}/></button>
                
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2"><Scale size={20}/> Movie Face-off</h2>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                    <div className="grid grid-cols-2 gap-8 mb-8">
                        {/* Left Movie (Base) */}
                        <div className="flex flex-col items-center">
                            <img src={`${TMDB_IMAGE_BASE}${baseDetails.poster_path}`} className="w-32 rounded-lg shadow-lg mb-4" alt=""/>
                            <h3 className="text-xl font-bold text-white text-center">{baseDetails.title || baseDetails.name}</h3>
                        </div>

                        {/* Right Movie (Second) */}
                        <div className="flex flex-col items-center relative">
                            {secondMovie ? (
                                <>
                                    <img src={`${TMDB_IMAGE_BASE}${secondMovie.poster_path}`} className="w-32 rounded-lg shadow-lg mb-4" alt=""/>
                                    <h3 className="text-xl font-bold text-white text-center">{secondMovie.title || secondMovie.name}</h3>
                                    <button onClick={() => setSecondMovie(null)} className="mt-2 text-xs text-red-500 hover:underline">Change</button>
                                </>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center">
                                    <div className="w-32 h-48 border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center mb-4">
                                        <Search size={32} className="text-white/20"/>
                                    </div>
                                    <div className="relative w-full max-w-xs">
                                        <input 
                                            type="text" 
                                            value={searchTerm}
                                            onChange={(e) => handleSearch(e.target.value)}
                                            placeholder="Select movie to compare..."
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                                        />
                                        {searchResults.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                                                {searchResults.map(m => (
                                                    <button key={m.id} onClick={() => selectSecondMovie(m)} className="w-full text-left px-4 py-3 hover:bg-white/10 flex items-center gap-3">
                                                        <img src={m.poster_path ? `${TMDB_IMAGE_BASE}${m.poster_path}` : ""} className="w-8 h-12 object-cover rounded" alt=""/>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-white truncate">{m.title || m.name}</p>
                                                            <p className="text-xs text-gray-500">{m.release_date?.split('-')[0]}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {secondMovie && (
                        <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                            <StatRow label="Rating" val1={baseDetails.vote_average} val2={secondMovie.vote_average} format={(v) => v?.toFixed(1)}/>
                            <StatRow label="Runtime" val1={baseDetails.runtime || baseDetails.episode_run_time?.[0]} val2={secondMovie.runtime || secondMovie.episode_run_time?.[0]} format={(v) => v ? `${v} min` : '-'}/>
                            <StatRow label="Budget" val1={baseDetails.budget} val2={secondMovie.budget} format={(v) => v ? formatCurrency(v) : '-'}/>
                            <StatRow label="Revenue" val1={baseDetails.revenue} val2={secondMovie.revenue} format={(v) => v ? formatCurrency(v) : '-'}/>
                            <StatRow label="Popularity" val1={Math.round(baseDetails.popularity)} val2={Math.round(secondMovie.popularity)}/>
                            <StatRow label="Vote Count" val1={baseDetails.vote_count} val2={secondMovie.vote_count}/>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
