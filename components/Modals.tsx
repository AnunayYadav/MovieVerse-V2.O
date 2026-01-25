import React, { useState, useEffect, useRef } from 'react';
import { UserCircle, X, ListPlus, Plus, Check, Loader2, Film, AlertCircle, BrainCircuit, Search, Star, RefreshCcw, Bell, CheckCheck, Inbox, Heart, PaintBucket, Upload, Facebook, Instagram, Twitter, Globe, Scale, DollarSign, Clock, Trophy, ChevronRight, ChevronDown, Calendar, ArrowUp, ArrowDown, TrendingUp, History, ArrowLeft, MoreHorizontal, Dice5, Shield, ExternalLink } from 'lucide-react';
import { UserProfile, Movie, GENRES_LIST, PersonDetails, AppNotification, MovieDetails } from '../types';
import { TMDB_BASE_URL, TMDB_IMAGE_BASE, formatCurrency, MovieSkeleton } from './Shared';
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
                <p className="text-gray-400 mb-8 text-sm leading-relaxed">Please confirm your age to access content appropriately.</p>
                <input 
                    type="number" 
                    value={age} 
                    onChange={(e) => setAge(e.target.value)} 
                    placeholder="Enter your age"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white mb-6 focus:border-red-600 focus:outline-none text-center text-lg font-bold"
                />
                <button 
                    onClick={() => { if(age) onSave(age); }}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-red-900/20"
                >
                    Continue
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
        <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-300">
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"><ArrowLeft size={20}/></button>
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {credits.map((person, idx) => (
                        <div key={`${person.id}-${idx}`} onClick={() => { onClose(); onPersonClick(person.id); }} className="flex flex-col items-center text-center p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all cursor-pointer">
                            <img 
                                src={person.profile_path ? `${TMDB_IMAGE_BASE}${person.profile_path}` : `https://ui-avatars.com/api/?name=${person.name}`} 
                                className="w-20 h-20 rounded-full object-cover mb-3"
                                alt={person.name}
                            />
                            <h4 className="text-sm font-bold text-white mb-1">{person.name}</h4>
                            <p className="text-xs text-gray-500 line-clamp-1">{person.character || person.job}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// PARENTS GUIDE MODAL
interface ParentsGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
    imdbId: string | undefined;
    title: string;
}

export const ParentsGuideModal: React.FC<ParentsGuideModalProps> = ({ isOpen, onClose, imdbId, title }) => {
    if (!isOpen || !imdbId) return null;
    const url = `https://www.imdb.com/title/${imdbId}/parentalguide`;

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="glass-panel w-full max-w-5xl h-[85vh] rounded-2xl flex flex-col overflow-hidden border border-white/10 shadow-2xl relative">
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40">
                    <div className="flex items-center gap-3">
                        <Shield size={20} className="text-blue-400"/>
                        <h3 className="font-bold text-white text-sm md:text-base">Parents Guide: {title}</h3>
                    </div>
                    <div className="flex items-center gap-4">
                        <a href={url} target="_blank" rel="noopener noreferrer" className="hidden md:flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300">
                            <ExternalLink size={14}/> Open Source
                        </a>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <X size={20} className="text-white"/>
                        </button>
                    </div>
                </div>
                <div className="flex-1 bg-white">
                    <iframe 
                        src={url} 
                        className="w-full h-full border-0" 
                        title="IMDb Parents Guide"
                        sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
                    />
                </div>
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
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] bg-[#0a0a0a] p-8 animate-in slide-in-from-bottom-10 duration-500 overflow-y-auto">
            <div className="max-w-2xl mx-auto">
                <button onClick={onClose} className="mb-8 text-white bg-white/5 p-2 rounded-full"><ArrowLeft/></button>
                <h2 className="text-3xl font-bold text-white mb-8">Edit Profile</h2>
                <div className="space-y-6">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Display Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-red-600 outline-none" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Age</label>
                        <input type="number" value={age} onChange={e => setAge(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-red-600 outline-none" />
                    </div>
                    <button onClick={() => onSave({...profile, name, age})} className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 transition-all">Save Profile</button>
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
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (personId && apiKey) {
            setLoading(true);
            fetch(`${TMDB_BASE_URL}/person/${personId}?api_key=${apiKey}&append_to_response=combined_credits,external_ids`)
                .then(res => res.json())
                .then(data => { setDetails(data); setLoading(false); })
                .catch(() => setLoading(false));
        }
    }, [personId, apiKey]);
    if (!personId) return null;
    return (
        <div className="fixed inset-0 z-[150] bg-[#0a0a0a] overflow-y-auto animate-in slide-in-from-right-10 duration-500 font-sans">
            <div className="max-w-6xl mx-auto p-6 md:p-12">
                <button onClick={onClose} className="mb-8 p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all active:scale-95 text-white"><ArrowLeft size={24}/></button>
                {loading ? <Loader2 className="animate-spin text-red-600 mx-auto" size={40}/> : details && (
                    <div className="flex flex-col md:flex-row gap-12">
                        <div className="w-full md:w-80 shrink-0">
                            <img src={details.profile_path ? `${TMDB_IMAGE_BASE}${details.profile_path}` : "https://placehold.co/400x600"} className="w-full rounded-2xl shadow-2xl" alt={details.name}/>
                        </div>
                        <div className="flex-1">
                            <h1 className="text-4xl md:text-6xl font-black text-white mb-4">{details.name}</h1>
                            <p className="text-red-500 font-bold uppercase tracking-widest mb-8">{details.known_for_department}</p>
                            <h3 className="text-xl font-bold text-white mb-4">Biography</h3>
                            <p className="text-gray-400 leading-relaxed mb-12">{details.biography || "No bio available."}</p>
                            <h3 className="text-xl font-bold text-white mb-6">Known For</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {details.combined_credits?.cast?.slice(0, 8).map(movie => (
                                    <div key={movie.id} onClick={() => onMovieClick(movie)} className="cursor-pointer group">
                                        <div className="aspect-[2/3] rounded-xl overflow-hidden mb-2 bg-white/5"><img src={`${TMDB_IMAGE_BASE}${movie.poster_path}`} className="w-full h-full object-cover group-hover:scale-110 transition-all"/></div>
                                        <p className="text-xs font-bold text-white truncate">{movie.title || movie.name}</p>
                                    </div>
                                ))}
                            </div>
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
    onUpdate: () => void;
    userProfile: UserProfile;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose, onUpdate, userProfile }) => {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            getNotifications().then(data => { setNotifications(data); setLoading(false); if (data.some(n => !n.read)) markNotificationsRead().then(onUpdate); });
        }
    }, [isOpen]);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#121212] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95">
                <div className="p-4 border-b border-white/10 flex justify-between items-center text-white">
                    <h3 className="font-bold flex items-center gap-2"><Bell size={18}/> Notifications</h3>
                    <button onClick={onClose}><X size={20}/></button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
                    {loading ? <Loader2 className="animate-spin text-red-600 mx-auto"/> : notifications.length > 0 ? notifications.map(n => (
                        <div key={n.id} className={`p-4 rounded-xl border ${n.read ? 'bg-white/5 border-transparent opacity-60' : 'bg-red-600/10 border-red-600/30'}`}>
                            <h4 className="font-bold text-white text-sm mb-1">{n.title}</h4>
                            <p className="text-xs text-gray-400">{n.message}</p>
                        </div>
                    )) : <p className="text-center py-10 text-gray-500">No notifications.</p>}
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

export const ComparisonModal: React.FC<ComparisonModalProps> = ({ isOpen, onClose, baseMovie }) => {
    if (!isOpen || !baseMovie) return null;
    return (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="bg-[#121212] w-full max-w-2xl rounded-3xl border border-white/10 p-8 text-center text-white">
                <h3 className="text-2xl font-bold mb-4">Comparing: {baseMovie.title}</h3>
                <p className="text-gray-400 mb-8">Detailed comparison tool is coming soon. This will allow you to see metrics against other titles side-by-side.</p>
                <button onClick={onClose} className="px-8 py-3 bg-white text-black font-bold rounded-xl active:scale-95 transition-all">Close</button>
            </div>
        </div>
    );
};