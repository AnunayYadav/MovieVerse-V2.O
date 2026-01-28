
import React, { useState, useEffect, useRef } from 'react';
import { UserCircle, X, ListPlus, Plus, Check, Loader2, Film, AlertCircle, BrainCircuit, Search, Star, RefreshCcw, Bell, CheckCheck, Inbox, Heart, PaintBucket, Upload, Facebook, Instagram, Twitter, Globe, Scale, DollarSign, Clock, Trophy, ChevronRight, ChevronDown, Calendar, ArrowUp, ArrowDown, TrendingUp, History, ArrowLeft, MoreHorizontal, Dice5, Shield, ExternalLink } from 'lucide-react';
import { UserProfile, Movie, GENRES_LIST, PersonDetails, AppNotification, MovieDetails } from '../types';
import { TMDB_IMAGE_BASE, formatCurrency, MovieSkeleton } from './Shared';
import { generateSmartRecommendations } from '../services/gemini';
import { getNotifications, markNotificationsRead } from '../services/supabase';
import { tmdbService } from '../services/tmdb';

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
            <div className="bg-[#121212] p-8 rounded-2xl w-full max-w-md text-center border border-red-600/30 shadow-2xl animate-in zoom-in-95">
                <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500"><UserCircle size={32} /></div>
                <h2 className="text-2xl font-bold text-white mb-2">Age Verification</h2>
                <p className="text-gray-400 mb-8 text-sm leading-relaxed">Please confirm your age to ensure appropriate content (18+).</p>
                <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age (e.g. 24)" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white text-center text-lg font-bold mb-6 focus:outline-none" autoFocus />
                <button onClick={() => { if(age) onSave(age); }} disabled={!age} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98]">Continue</button>
            </div>
        </div>
    );
};

// FULL CREDITS MODAL
export const FullCreditsModal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; credits: any[]; onPersonClick: (id: number) => void; }> = ({ isOpen, onClose, title, credits, onPersonClick }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-xl flex flex-col">
            <div className="p-6 border-b border-white/10 flex items-center justify-between"><div className="flex items-center gap-4"><button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><ArrowLeft size={20}/></button><h2 className="text-xl font-bold text-white">{title}</h2></div></div>
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {credits.map((p, idx) => (
                    <div key={idx} onClick={() => { onClose(); onPersonClick(p.id); }} className="p-4 bg-white/5 rounded-xl text-center cursor-pointer hover:bg-white/10">
                        <img src={p.profile_path ? `${TMDB_IMAGE_BASE}${p.profile_path}` : `https://ui-avatars.com/api/?name=${p.name}`} className="w-20 h-20 rounded-full mx-auto mb-3 object-cover" alt=""/>
                        <h4 className="text-sm font-bold text-white line-clamp-1">{p.name}</h4>
                        <p className="text-[10px] text-gray-500 line-clamp-1">{p.character || p.job}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

// PERSON PAGE
export const PersonPage: React.FC<{ personId: number; onClose: () => void; apiKey: string; onMovieClick: (m: Movie) => void; }> = ({ personId, onClose, apiKey, onMovieClick }) => {
    const [details, setDetails] = useState<PersonDetails | null>(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!personId) return;
        setLoading(true);
        tmdbService.getPersonDetails(personId).then(data => { setDetails(data); setLoading(false); }).catch(() => setLoading(false));
    }, [personId]);
    if (!personId) return null;
    return (
        <div className="fixed inset-0 z-[100] bg-[#0a0a0a] overflow-y-auto animate-in slide-in-from-bottom-10">
            <button onClick={onClose} className="fixed top-6 left-6 z-[120] bg-black/40 px-4 py-2 rounded-full text-white flex items-center gap-2 border border-white/5"><ArrowLeft size={20}/> Back</button>
            {loading ? <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-red-600" size={40}/></div> : details && (
                <div className="flex flex-col lg:flex-row min-h-screen">
                    <div className="w-full lg:w-80 shrink-0 bg-black/40 p-10 border-r border-white/5 flex flex-col items-center">
                        <img src={details.profile_path ? `${TMDB_IMAGE_BASE}${details.profile_path}` : ""} className="w-48 rounded-xl shadow-2xl mb-6" alt=""/>
                        <h2 className="text-2xl font-bold text-white">{details.name}</h2>
                        <p className="text-red-500 text-xs font-bold uppercase mt-2">{details.known_for_department}</p>
                    </div>
                    <div className="flex-1 p-10">
                        <h3 className="text-xl font-bold text-white mb-4">Biography</h3>
                        <p className="text-gray-300 text-sm leading-relaxed mb-10 whitespace-pre-line">{details.biography || "N/A"}</p>
                        <h3 className="text-lg font-bold text-white mb-6">Known For</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {details.combined_credits?.cast?.sort((a:any, b:any) => b.popularity - a.popularity).slice(0, 10).map((m: any) => (
                                <div key={m.id} onClick={() => onMovieClick(m)} className="cursor-pointer group">
                                    <img src={m.poster_path ? `${TMDB_IMAGE_BASE}${m.poster_path}` : ""} className="aspect-[2/3] rounded-lg mb-2 group-hover:scale-105 transition-all" alt=""/>
                                    <p className="text-xs font-bold text-white truncate">{m.title || m.name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Fixed: Defined missing ProfilePage component
export const ProfilePage: React.FC<{ isOpen: boolean; onClose: () => void; profile: UserProfile; onSave: (p: UserProfile) => void; }> = ({ isOpen, onClose, profile, onSave }) => {
    const [name, setName] = useState(profile.name);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="bg-[#121212] border border-white/10 rounded-3xl p-8 w-full max-w-md animate-in zoom-in-95 duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Edit Profile</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20}/></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Display Name</label>
                        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors" />
                    </div>
                    <button onClick={() => { onSave({ ...profile, name }); onClose(); }} className="w-full bg-red-600 py-3 rounded-xl font-bold text-white mt-4 shadow-lg active:scale-95 transition-all">Save Profile</button>
                </div>
            </div>
        </div>
    );
};

// Fixed: Defined missing NotificationModal component
export const NotificationModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="bg-[#121212] border border-white/10 rounded-3xl p-8 w-full max-w-md text-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400"><Bell size={32}/></div>
                <h2 className="text-xl font-bold text-white mb-2">Notifications</h2>
                <p className="text-gray-500 text-sm mb-6">No new notifications at the moment.</p>
                <button onClick={onClose} className="w-full bg-white/5 py-3 rounded-xl font-bold text-white hover:bg-white/10 transition-all">Close</button>
            </div>
        </div>
    );
};

// Fixed: Defined missing ComparisonModal component
export const ComparisonModal: React.FC<{ isOpen: boolean; onClose: () => void; baseMovie: Movie | null; onMovieSelect: (m: Movie) => void; }> = ({ isOpen, onClose, baseMovie, onMovieSelect }) => {
    if (!isOpen || !baseMovie) return null;
    return (
        <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="bg-[#121212] border border-white/10 rounded-3xl p-8 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3"><Scale className="text-red-500"/> Compare Movies</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={24}/></button>
                </div>
                <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <img src={`${TMDB_IMAGE_BASE}${baseMovie.poster_path}`} className="w-full rounded-2xl shadow-2xl" alt=""/>
                        <h3 className="text-xl font-bold text-white">{baseMovie.title}</h3>
                        <p className="text-sm text-gray-400 line-clamp-3">{baseMovie.overview}</p>
                    </div>
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-2xl p-8 text-gray-500">
                        <Plus size={48} className="mb-4 opacity-20"/>
                        <p className="text-sm font-bold">Select another movie to compare</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export { ProfilePage, NotificationModal, ComparisonModal };
