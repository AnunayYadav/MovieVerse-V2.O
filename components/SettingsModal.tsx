import React, { useState, useEffect, useRef } from 'react';
import { UserCircle, X, Check, Settings, ShieldCheck, RefreshCcw, HelpCircle, FileText, Lock, LogOut, Calendar, Mail, User, BrainCircuit, Pencil, CheckCheck, Loader2, ChevronDown, ChevronUp, Fingerprint, Copy, Crown, History, Trash2, Search, Clock, ArrowLeft, Upload, Dice5, PaintBucket, AlertCircle } from 'lucide-react';
import { UserProfile, MaturityRating, Movie, GENRES_LIST } from '../types';
import { getSupabase, submitSupportTicket } from '../services/supabase';
import { TMDB_IMAGE_BASE } from './Shared';

interface SettingsPageProps {
    isOpen: boolean;
    onClose: () => void;
    apiKey: string;
    setApiKey: (key: string) => void;
    maturityRating: MaturityRating;
    setMaturityRating: (r: MaturityRating) => void;
    profile: UserProfile;
    onUpdateProfile: (p: UserProfile) => void;
    onLogout?: () => void;
    searchHistory?: string[];
    setSearchHistory?: (h: string[]) => void;
    watchedMovies?: Movie[];
    setWatchedMovies?: (m: Movie[]) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ 
    isOpen, onClose, apiKey, setApiKey, maturityRating, setMaturityRating, profile, onUpdateProfile, onLogout,
    searchHistory = [], setSearchHistory, watchedMovies = [], setWatchedMovies
}) => {
    // Check if custom keys are stored
    const hasCustomTmdb = !!localStorage.getItem('movieverse_tmdb_key');

    const [inputKey, setInputKey] = useState(apiKey || "");
    const [isEditingTmdb, setIsEditingTmdb] = useState(false);

    // Enhanced Account State
    const [userEmail, setUserEmail] = useState("");
    const [userId, setUserId] = useState("");
    const [joinDate, setJoinDate] = useState("");
    const [provider, setProvider] = useState("Guest");
    const [idCopied, setIdCopied] = useState(false);

    // Local profile editing states
    const [profileName, setProfileName] = useState(profile.name || "");
    const [profileAge, setProfileAge] = useState(profile.age || "");
    const [profileGenres, setProfileGenres] = useState<string[]>(profile.genres || []);
    const [profileAvatar, setProfileAvatar] = useState(profile.avatar || "");
    const [profileAvatarBg, setProfileAvatarBg] = useState(profile.avatarBackground || "bg-gradient-to-br from-red-600 to-red-900");
    const [profileError, setProfileError] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Expandable accordion states
    const [isProfileExpanded, setIsProfileExpanded] = useState(false);
    const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
    const [isFaqExpanded, setIsFaqExpanded] = useState(false);

    // Help Form State
    const [supportSubject, setSupportSubject] = useState("General Inquiry");
    const [supportMessage, setSupportMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [sentSuccess, setSentSuccess] = useState(false);
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setInputKey(hasCustomTmdb ? apiKey : "");
            setIsEditingTmdb(hasCustomTmdb);
            setProfileName(profile.name || "");
            setProfileAge(profile.age || "");
            setProfileGenres(profile.genres || []);
            setProfileAvatar(profile.avatar || "");
            setProfileAvatarBg(profile.avatarBackground || "bg-gradient-to-br from-red-600 to-red-900");
            setProfileError("");

            // Fetch real user data from Supabase
            const fetchUser = async () => {
                const supabase = getSupabase();
                if (supabase) {
                    const { data: { session } } = await supabase.auth.getSession();
                    const user = session?.user;
                    if (user) {
                        setUserEmail(user.email || "No Email");
                        setUserId(user.id);
                        setJoinDate(new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
                        setProvider(user.app_metadata?.provider || "Email");
                    } else {
                        // Guest Fallback
                        setUserEmail("guest@movieverse.ai");
                        setUserId("guest-session-" + Math.floor(Math.random() * 10000));
                        setJoinDate("Just Now");
                        setProvider("Local Session");
                    }
                } else {
                     setUserEmail("guest@movieverse.ai");
                     setUserId("guest-session-" + Math.floor(Math.random() * 10000));
                     setJoinDate("Just Now");
                     setProvider("Local Session");
                }
            };
            fetchUser();
        }
    }, [isOpen, apiKey, hasCustomTmdb, profile]);

    const handleSaveAll = async () => {
        const ageNum = parseInt(profileAge);
        if (!profileName.trim()) {
            setProfileError("Display name is required.");
            setIsProfileExpanded(true);
            return;
        }
        if (!profileAge || isNaN(ageNum) || ageNum < 10 || ageNum > 120) {
            setProfileError("Age must be between 10 and 120.");
            setIsProfileExpanded(true);
            return;
        }
        if (profileGenres.length < 3) {
             setProfileError("Please select at least 3 genres to personalize your feed.");
             setIsProfileExpanded(true);
             return;
        }

        setIsSaving(true);
        setProfileError("");

        try {
            // Save TMDB Key
            setApiKey(isEditingTmdb ? inputKey : "");

            // Update user profile properties
            const updatedProfile: UserProfile = {
                ...profile,
                name: profileName,
                age: profileAge,
                genres: profileGenres,
                avatar: profileAvatar,
                avatarBackground: profileAvatarBg,
                maturityRating: maturityRating
            };

            await onUpdateProfile(updatedProfile);
            onClose();
        } catch (err: any) {
            setProfileError(err.message || "Failed to update profile settings.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopyId = () => {
        navigator.clipboard.writeText(userId);
        setIdCopied(true);
        setTimeout(() => setIdCopied(false), 2000);
    };

    const handleToggleHistory = () => {
        const newHistoryStatus = profile.enableHistory !== false ? false : true;
        onUpdateProfile({ ...profile, enableHistory: newHistoryStatus });
    };

    const handleClearSearchHistory = () => {
        if (setSearchHistory) setSearchHistory([]);
    };

    const handleRemoveSearchItem = (item: string) => {
        if (setSearchHistory) setSearchHistory(searchHistory.filter(h => h !== item));
    };

    const handleClearWatchHistory = () => {
        if (setWatchedMovies) setWatchedMovies([]);
    };

    const handleRemoveWatchItem = (movieId: number) => {
        if (setWatchedMovies) setWatchedMovies(watchedMovies.filter(m => m.id !== movieId));
    };

    const handleSendSupport = async () => {
        setSending(true);
        const fullMessage = `[User ID: ${userId}] ${supportMessage}`;
        const success = await submitSupportTicket(supportSubject, fullMessage, userEmail);
        
        if (success) {
            setSentSuccess(true);
            setSupportMessage("");
            setTimeout(() => setSentSuccess(false), 4000);
        }
        setSending(false);
    };

    const toggleGenre = (genre: string) => {
        setProfileGenres(prev => 
            prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
        );
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { 
                setProfileError("Image too large. Max 5MB.");
                return;
            }
            if (!file.type.startsWith('image/')) {
                setProfileError("Please upload a valid image file.");
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target?.result) {
                    setProfileAvatar(e.target.result as string);
                    setProfileError("");
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const selectAvatar = (seed: string) => {
        setProfileAvatar(`https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`);
    };

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
        { id: "default", class: "bg-gradient-to-br from-red-600 to-red-900", name: "Default" },
        { id: "dark", class: "bg-gradient-to-br from-gray-900 to-black", name: "Dark Void" },
        { id: "crimson", class: "bg-gradient-to-br from-red-950 to-black", name: "Blood Moon" },
        { id: "steel", class: "bg-gradient-to-br from-zinc-700 to-zinc-900", name: "Dark Metal" },
        { id: "abyss", class: "bg-black", name: "Abyss" }
    ];

    const FAQs = [
        { q: "How do I verify my email?", a: "Check your inbox for a confirmation link. If not found, check spam." },
        { q: "Is this service free?", a: "Yes, this is a demonstration app using public APIs for educational purposes." },
        { q: "Where does the data come from?", a: "We use the TMDB API for movie metadata and Google Gemini for AI features." },
        { q: "Can I watch movies here?", a: "No, MovieVerse AI is purely a discovery and tracking platform. We do not host or stream any video content." }
    ];

    return (
        <div className={`fixed inset-0 z-[100] bg-[#030303] overflow-y-auto font-sans transition-all duration-300 ${isOpen ? 'visible opacity-100 pointer-events-auto scale-100' : 'invisible opacity-0 pointer-events-none scale-98'}`}>
            {/* Inner Content Centered Wrapper */}
            <div className="max-w-5xl mx-auto px-6 py-12 md:py-16 relative">
                
                {/* Header Title band */}
                <div className="flex justify-between items-center pb-6 border-b border-zinc-800 mb-8">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight flex items-center gap-3">
                            Account
                        </h1>
                        <p className="text-xs text-zinc-500 font-medium mt-1.5 flex items-center gap-1.5">
                            <Calendar size={13} className="text-zinc-600" /> Member Since {joinDate || '2025'}
                        </p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-zinc-500 hover:text-white transition-all bg-zinc-900 hover:bg-zinc-800 p-2.5 rounded-full border border-white/5 shadow-md"
                        title="Close settings"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Error Banner */}
                {profileError && (
                    <div className="mb-8 p-4 bg-red-950/40 border border-red-800/40 rounded-xl flex items-start gap-3.5 text-red-200 text-xs font-medium animate-in slide-in-from-top-2 duration-300">
                        <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-red-400">Please fix the following:</p>
                            <p className="mt-1 opacity-90">{profileError}</p>
                        </div>
                    </div>
                )}

                {/* SECTION 1: MEMBERSHIP & BILLING */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-8 border-b border-zinc-800">
                    <div className="md:col-span-4 space-y-3">
                        <h2 className="text-xs font-extrabold text-zinc-500 uppercase tracking-widest">Membership & Billing</h2>
                        <button 
                            onClick={() => { onClose(); onLogout?.(); }}
                            className="bg-zinc-900 hover:bg-red-900/20 hover:text-red-400 text-zinc-300 font-bold py-2.5 px-5 rounded-md text-xs border border-zinc-800 hover:border-red-900/30 transition-all shadow-sm flex items-center gap-1.5"
                        >
                            <LogOut size={13} /> Cancel Membership
                        </button>
                    </div>
                    
                    <div className="md:col-span-8 space-y-4">
                        {/* Row: Email Address */}
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 pb-3 border-b border-zinc-900">
                            <div>
                                <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Email Address</p>
                                <p className="text-sm font-semibold text-white mt-1">{userEmail}</p>
                            </div>
                            <span className="text-xs text-zinc-600 bg-zinc-900/50 px-2 py-0.5 rounded border border-zinc-800 self-start sm:self-auto font-bold uppercase tracking-wider">{provider} Login</span>
                        </div>

                        {/* Row: Password Mask */}
                        <div className="flex justify-between items-center pb-3 border-b border-zinc-900">
                            <div>
                                <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Password</p>
                                <p className="text-sm font-mono text-zinc-400 mt-1">••••••••••••••••</p>
                            </div>
                            <button 
                                onClick={async () => {
                                    const supabase = getSupabase();
                                    if (supabase && userEmail) {
                                        try {
                                            const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
                                                redirectTo: window.location.origin
                                            });
                                            if (error) throw error;
                                            alert("Password reset email sent to " + userEmail);
                                        } catch (e: any) {
                                            alert("Error sending password reset: " + e.message);
                                        }
                                    } else {
                                        alert("Password resets are not supported in guest mode.");
                                    }
                                }} 
                                className="text-xs text-red-500 hover:text-red-400 font-bold hover:underline transition-all"
                            >
                                Reset Password
                            </button>
                        </div>

                        {/* Row: User ID */}
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">User ID</p>
                                <p className="text-xs font-mono text-zinc-400 mt-1 truncate max-w-[200px] sm:max-w-xs">{userId}</p>
                            </div>
                            <button 
                                onClick={handleCopyId} 
                                className="text-xs text-zinc-400 hover:text-white font-bold transition-all flex items-center gap-1.5 hover:bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800"
                            >
                                {idCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                <span>{idCopied ? "Copied" : "Copy ID"}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* SECTION 2: PLAN DETAILS */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-8 border-b border-zinc-800">
                    <div className="md:col-span-4">
                        <h2 className="text-xs font-extrabold text-zinc-500 uppercase tracking-widest">Plan Details</h2>
                    </div>
                    <div className="md:col-span-8 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <p className="text-sm font-semibold text-white">Premium Ultra HD</p>
                            <span className="text-[10px] font-extrabold text-red-500 bg-red-950/40 border border-red-800/40 px-2 py-0.5 rounded uppercase tracking-wider">4K + HDR</span>
                        </div>
                        <span className="text-xs text-zinc-600 font-bold select-none cursor-not-allowed uppercase tracking-widest">Active Plan</span>
                    </div>
                </div>

                {/* SECTION 3: SYSTEM SETTINGS */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-8 border-b border-zinc-800">
                    <div className="md:col-span-4">
                        <h2 className="text-xs font-extrabold text-zinc-500 uppercase tracking-widest">Settings & Engines</h2>
                    </div>
                    <div className="md:col-span-8 space-y-5">
                        
                        {/* TMDB API Key row */}
                        <div className="space-y-2 pb-3 border-b border-zinc-900">
                            <div className="flex justify-between items-center">
                                <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider">TMDB API Key</label>
                                {!isEditingTmdb && (
                                    <span className="text-[10px] text-green-400 font-bold bg-green-950/20 px-2 py-0.5 rounded border border-green-800/20 flex items-center gap-1">
                                        <ShieldCheck size={10} /> Default Engine
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-2.5">
                                <div className="relative flex-1 group">
                                    <input 
                                        type="password" 
                                        value={isEditingTmdb ? inputKey : "Default Environment Key"} 
                                        onChange={(e) => isEditingTmdb && setInputKey(e.target.value)} 
                                        disabled={!isEditingTmdb}
                                        className={`w-full border rounded-lg p-2.5 pr-10 focus:outline-none transition-all text-xs font-mono bg-zinc-900/60 border-zinc-800 text-zinc-300 focus:border-red-600`} 
                                        placeholder="Enter TMDB Key"
                                    />
                                    {!isEditingTmdb && <Lock size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600" />}
                                </div>
                                
                                {isEditingTmdb ? (
                                    <button 
                                        onClick={() => { setIsEditingTmdb(false); setInputKey(""); }} 
                                        className="p-2.5 rounded-lg border border-red-800/40 bg-red-950/20 text-red-400 hover:bg-red-950/30 transition-all"
                                        title="Reset to Default"
                                    >
                                        <RefreshCcw size={15} />
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => { setIsEditingTmdb(true); setInputKey(""); }} 
                                        className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 p-2.5 rounded-lg text-zinc-400 hover:text-white transition-all" 
                                        title="Edit Key"
                                    >
                                        <Pencil size={15} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Gemini Engine Block */}
                        <div className="p-4 rounded-xl border border-blue-900/30 bg-blue-950/10 flex gap-3">
                            <BrainCircuit className="text-blue-500 shrink-0 mt-0.5" size={18} />
                            <div>
                                <div className="flex justify-between items-center">
                                    <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider">Gemini Cloud Engine</h4>
                                    <span className="text-[9px] font-bold text-blue-400 bg-blue-950/40 border border-blue-800/30 px-2 py-0.5 rounded uppercase">Active</span>
                                </div>
                                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                                    AI-powered Cinema insights and recommendation streams are managed securely through cloud endpoints.
                                </p>
                            </div>
                        </div>

                    </div>
                </div>

                {/* SECTION 4: PROFILE & PARENTAL CONTROLS */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-8 border-b border-zinc-800">
                    <div className="md:col-span-4">
                        <h2 className="text-xs font-extrabold text-zinc-500 uppercase tracking-widest">Profile & Parental Controls</h2>
                    </div>
                    <div className="md:col-span-8">
                        
                        {/* Profile Accordion Header */}
                        <button 
                            onClick={() => setIsProfileExpanded(!isProfileExpanded)}
                            className="w-full flex items-center justify-between p-4 bg-zinc-900/30 hover:bg-zinc-900/50 border border-zinc-800 rounded-xl transition-all"
                        >
                            <div className="flex items-center gap-3.5 text-left">
                                <div className={`w-11 h-11 rounded-md flex items-center justify-center text-lg font-bold text-white shrink-0 border border-white/10 shadow-md ${profileAvatarBg}`}>
                                    {profileAvatar ? (
                                        <img src={profileAvatar} className="w-full h-full object-cover rounded-md" alt="avatar" />
                                    ) : (
                                        profileName.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-white">{profileName || "User"}</p>
                                    <p className="text-xs text-zinc-500 mt-0.5">Rating Restriction: {maturityRating}</p>
                                </div>
                            </div>
                            {isProfileExpanded ? <ChevronUp size={18} className="text-zinc-500" /> : <ChevronDown size={18} className="text-zinc-500" />}
                        </button>

                        {/* Accordion Expand Drawer */}
                        {isProfileExpanded && (
                            <div className="mt-4 p-5 rounded-xl border border-zinc-800 bg-zinc-900/10 space-y-6 animate-in slide-in-from-top-3 duration-300">
                                
                                {/* Identity Edit Inputs */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Display Name</label>
                                        <input 
                                            type="text" 
                                            value={profileName} 
                                            onChange={(e) => setProfileName(e.target.value)} 
                                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2 px-3.5 text-white focus:outline-none focus:border-red-600 text-sm" 
                                            placeholder="Your Name" 
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Age</label>
                                        <input 
                                            type="number" 
                                            value={profileAge} 
                                            min="10" 
                                            max="120" 
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                if (!e.target.value || (val >= 0 && val <= 130)) {
                                                    setProfileAge(e.target.value);
                                                }
                                            }} 
                                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2 px-3.5 text-white focus:outline-none focus:border-red-600 text-sm" 
                                            placeholder="10-120" 
                                        />
                                    </div>
                                </div>

                                {/* Avatar Randomizer & Upload Row */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1 block">Choose Avatar</label>
                                    <div className="flex flex-wrap gap-2.5">
                                        {AVATARS.map((av) => (
                                            <button
                                                key={av.seed}
                                                type="button"
                                                onClick={() => selectAvatar(av.seed)}
                                                className="w-9 h-9 rounded-full overflow-hidden border-2 border-transparent hover:border-white/50 active:scale-95 transition-all shadow bg-zinc-800"
                                                title={av.name}
                                            >
                                                <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${av.seed}`} className="w-full h-full object-cover" alt="" />
                                            </button>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 mt-2">
                                        <button 
                                            type="button" 
                                            onClick={() => fileInputRef.current?.click()} 
                                            className="py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 active:scale-95"
                                        >
                                            <Upload size={14} /> Upload Image
                                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => selectAvatar(AVATARS[Math.floor(Math.random() * AVATARS.length)].seed)} 
                                            className="py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 active:scale-95"
                                        >
                                            <Dice5 size={14} /> Random Avatar
                                        </button>
                                    </div>
                                </div>

                                {/* Background Swatches */}
                                <div className="space-y-2">
                                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block ml-1"><PaintBucket size={11} className="inline mr-1" /> Profile Card Palette</label>
                                    <div className="flex gap-2.5 flex-wrap">
                                        {BACKGROUNDS.map(bg => (
                                            <button 
                                                key={bg.id}
                                                type="button"
                                                onClick={() => setProfileAvatarBg(bg.class)}
                                                className={`w-7 h-7 rounded-full ${bg.class} border-2 ring-2 ring-transparent transition-all ${profileAvatarBg === bg.class ? 'border-white scale-110 ring-white/20 shadow-md' : 'border-transparent hover:scale-105 hover:border-zinc-500'}`}
                                                title={bg.name}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Parental Maturity Limit Rating Selectors */}
                                <div className="space-y-3 pt-4 border-t border-zinc-900">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Maturity Rating Limit</label>
                                        <span className="text-[10px] text-red-500 bg-red-950/40 px-2 py-0.5 rounded border border-red-800/40 font-bold uppercase tracking-wider">Restricts display</span>
                                    </div>
                                    <div className="grid grid-cols-5 gap-1.5">
                                        {['G', 'PG', 'PG-13', 'R', 'NC-17'].map((rate) => (
                                            <button 
                                                key={rate} 
                                                type="button"
                                                onClick={() => setMaturityRating(rate as MaturityRating)}
                                                className={`py-2 text-[10px] sm:text-xs font-bold rounded-lg border text-center transition-all ${
                                                    maturityRating === rate 
                                                    ? 'bg-red-600 border-red-600 text-white shadow-md' 
                                                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
                                                }`}
                                            >
                                                {rate}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Genre Tags Edit panel */}
                                <div className="space-y-3 pt-4 border-t border-zinc-900">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Preferred Genres</label>
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded transition-all ${profileGenres.length >= 3 ? 'bg-green-950/20 text-green-400 border border-green-800/20' : 'bg-yellow-950/20 text-yellow-400 border border-yellow-800/20'}`}>
                                            {profileGenres.length} Selected (Min 3)
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {GENRES_LIST.map(genre => (
                                            <button 
                                                key={genre}
                                                type="button"
                                                onClick={() => toggleGenre(genre)}
                                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border flex items-center gap-1 ${
                                                    profileGenres.includes(genre) 
                                                    ? 'bg-red-600/20 border-red-500/40 text-white shadow-sm' 
                                                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
                                                }`}
                                            >
                                                {genre}
                                                {profileGenres.includes(genre) && <Check size={10} />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                            </div>
                        )}

                    </div>
                </div>

                {/* SECTION 5: MANAGE VIEWING HISTORY */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-8 border-b border-zinc-800">
                    <div className="md:col-span-4">
                        <h2 className="text-xs font-extrabold text-zinc-500 uppercase tracking-widest">Viewing & Search History</h2>
                    </div>
                    <div className="md:col-span-8">
                        
                        <button 
                            onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                            className="w-full flex items-center justify-between p-4 bg-zinc-900/30 hover:bg-zinc-900/50 border border-zinc-800 rounded-xl transition-all"
                        >
                            <div className="flex items-center gap-3 text-left">
                                <History size={16} className="text-zinc-400" />
                                <div>
                                    <p className="text-xs font-bold text-white uppercase tracking-wider">Manage Viewing Logs</p>
                                    <p className="text-[11px] text-zinc-500 mt-0.5">Toggle tracking state, clear searches, and review watched movies list.</p>
                                </div>
                            </div>
                            {isHistoryExpanded ? <ChevronUp size={18} className="text-zinc-500" /> : <ChevronDown size={18} className="text-zinc-500" />}
                        </button>

                        {isHistoryExpanded && (
                            <div className="mt-4 p-5 rounded-xl border border-zinc-800 bg-zinc-900/10 space-y-6 animate-in slide-in-from-top-3 duration-300">
                                
                                {/* Paused tracking setting */}
                                <div className="flex justify-between items-center pb-4 border-b border-zinc-900">
                                    <div>
                                        <p className="text-xs font-semibold text-white">Record Viewing History</p>
                                        <p className="text-[11px] text-zinc-500 mt-0.5">Save your searches and watched items to personalize recommendations.</p>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={handleToggleHistory}
                                        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${profile.enableHistory !== false ? 'bg-red-600' : 'bg-zinc-800'}`}
                                    >
                                        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${profile.enableHistory !== false ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>

                                {/* History Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                                    
                                    {/* Search history column */}
                                    <div className="flex flex-col min-h-[160px] max-h-[220px]">
                                        <div className="flex justify-between items-center mb-2.5">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1"><Search size={12} className="text-blue-500" /> Searches</span>
                                            {searchHistory.length > 0 && (
                                                <button onClick={handleClearSearchHistory} className="text-[9px] font-extrabold uppercase text-red-500 hover:underline">Clear</button>
                                            )}
                                        </div>
                                        <div className="bg-zinc-955 rounded-lg border border-zinc-900 overflow-y-auto custom-scrollbar p-1.5 flex-1">
                                            {searchHistory.length === 0 ? (
                                                <div className="h-full flex flex-col items-center justify-center text-zinc-600 opacity-60 text-center p-4">
                                                    <Clock size={16} className="mb-1" />
                                                    <p className="text-[10px] font-medium">No recent searches</p>
                                                </div>
                                            ) : (
                                                searchHistory.map((query, idx) => (
                                                    <div key={`${query}-${idx}`} className="flex items-center justify-between px-2.5 py-1.5 hover:bg-zinc-900/60 rounded-md transition-all mb-0.5 group">
                                                        <span className="text-[11px] text-zinc-400 truncate max-w-[80%] font-medium">{query}</span>
                                                        <button onClick={() => handleRemoveSearchItem(query)} className="text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-0.5">
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Watch history column */}
                                    <div className="flex flex-col min-h-[160px] max-h-[220px]">
                                        <div className="flex justify-between items-center mb-2.5">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1"><History size={12} className="text-red-500" /> Watched</span>
                                            {watchedMovies.length > 0 && (
                                                <button onClick={handleClearWatchHistory} className="text-[9px] font-extrabold uppercase text-red-500 hover:underline">Clear</button>
                                            )}
                                        </div>
                                        <div className="bg-zinc-955 rounded-lg border border-zinc-900 overflow-y-auto custom-scrollbar p-1.5 flex-1">
                                            {watchedMovies.length === 0 ? (
                                                <div className="h-full flex flex-col items-center justify-center text-zinc-600 opacity-60 text-center p-4">
                                                    <History size={16} className="mb-1" />
                                                    <p className="text-[10px] font-medium">No watch history</p>
                                                </div>
                                            ) : (
                                                watchedMovies.slice().reverse().map((movie) => (
                                                    <div key={movie.id} className="flex items-center gap-2.5 p-1.5 hover:bg-zinc-900/60 rounded-md transition-all relative mb-0.5 group">
                                                        <img 
                                                            src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : "https://placehold.co/40x60"} 
                                                            alt={movie.title}
                                                            className="w-7 h-10 object-cover rounded shadow"
                                                        />
                                                        <div className="flex-1 min-w-0 pr-6">
                                                            <p className="text-[11px] font-bold text-zinc-300 truncate">{movie.title || movie.name}</p>
                                                            <p className="text-[9px] text-zinc-600 mt-0.5">{movie.release_date?.split('-')[0] || 'Unknown'}</p>
                                                        </div>
                                                        <button 
                                                            onClick={() => handleRemoveWatchItem(movie.id)} 
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 p-1 rounded-full text-zinc-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                                        >
                                                            <Trash2 size={11} />
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                </div>

                            </div>
                        )}

                    </div>
                </div>

                {/* SECTION 6: FAQ & HELP & SUPPORT */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-8 border-b border-zinc-800">
                    <div className="md:col-span-4">
                        <h2 className="text-xs font-extrabold text-zinc-500 uppercase tracking-widest">Help Center & Support</h2>
                    </div>
                    <div className="md:col-span-8">
                        
                        <button 
                            onClick={() => setIsFaqExpanded(!isFaqExpanded)}
                            className="w-full flex items-center justify-between p-4 bg-zinc-900/30 hover:bg-zinc-900/50 border border-zinc-800 rounded-xl transition-all"
                        >
                            <div className="flex items-center gap-3 text-left">
                                <HelpCircle size={16} className="text-zinc-400" />
                                <div>
                                    <p className="text-xs font-bold text-white uppercase tracking-wider">Support Desk & FAQ</p>
                                    <p className="text-[11px] text-zinc-500 mt-0.5">Read frequently asked questions or submit an online ticket to our support engineers.</p>
                                </div>
                            </div>
                            {isFaqExpanded ? <ChevronUp size={18} className="text-zinc-500" /> : <ChevronDown size={18} className="text-zinc-500" />}
                        </button>

                        {isFaqExpanded && (
                            <div className="mt-4 p-5 rounded-xl border border-zinc-800 bg-zinc-900/10 space-y-6 animate-in slide-in-from-top-3 duration-300">
                                
                                {/* FAQ Accordion Accordion */}
                                <div className="space-y-2 pb-4 border-b border-zinc-900">
                                    <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block ml-1">Frequently Asked Questions</h4>
                                    <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950">
                                        {FAQs.map((faq, i) => (
                                            <div key={i} className="border-b border-zinc-800 last:border-0">
                                                <button 
                                                    onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                                                    className="w-full flex justify-between items-center p-3 text-left hover:bg-zinc-900/60 transition-all"
                                                >
                                                    <span className="text-[11px] font-bold text-zinc-300">{faq.q}</span>
                                                    <ChevronDown size={14} className={`text-zinc-500 transition-transform duration-300 ${expandedFaq === i ? 'rotate-180' : ''}`} />
                                                </button>
                                                {expandedFaq === i && (
                                                    <div className="p-3 bg-zinc-900/20 text-xs text-zinc-500 leading-relaxed border-t border-zinc-800">
                                                        {faq.a}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Support message sender */}
                                <div className="space-y-4">
                                    <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block ml-1">Contact Support Team</h4>
                                    <div className="space-y-3">
                                        <div className="relative">
                                            <select 
                                                value={supportSubject} 
                                                onChange={(e) => setSupportSubject(e.target.value)}
                                                className="w-full bg-zinc-955 border border-zinc-800 rounded-lg px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-red-600 appearance-none"
                                            >
                                                <option className="bg-[#030303] text-zinc-300">General Inquiry</option>
                                                <option className="bg-[#030303] text-zinc-300">Bug Report</option>
                                                <option className="bg-[#030303] text-zinc-300">Feature Request</option>
                                                <option className="bg-[#030303] text-zinc-300">Account Issue</option>
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                                        </div>

                                        <textarea 
                                            value={supportMessage}
                                            onChange={(e) => setSupportMessage(e.target.value)}
                                            className="w-full bg-zinc-955 border border-zinc-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-red-600 resize-none h-24 placeholder-zinc-700"
                                            placeholder="Describe your request in detail..."
                                        />

                                        {sentSuccess ? (
                                            <div className="p-3 bg-green-950/20 border border-green-800/40 text-green-400 font-bold rounded-lg text-center text-xs flex items-center justify-center gap-1.5">
                                                <CheckCheck size={14} /> Message Sent Successfully!
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={handleSendSupport} 
                                                disabled={sending || !supportMessage.trim()}
                                                className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-2.5 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
                                            >
                                                {sending ? <Loader2 size={13} className="animate-spin" /> : "Submit Ticket"}
                                            </button>
                                        )}
                                    </div>
                                </div>

                            </div>
                        )}

                    </div>
                </div>

                {/* SECTION 7: COMPLIANCE & LEGAL CENTER */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-8 border-b border-zinc-800">
                    <div className="md:col-span-4">
                        <h2 className="text-xs font-extrabold text-zinc-500 uppercase tracking-widest">Compliance & Legal</h2>
                    </div>
                    <div className="md:col-span-8 space-y-6">
                        
                        {/* TMDB Compliance Branding block */}
                        <div className="bg-zinc-955 rounded-xl p-4 border border-zinc-800 flex gap-4 items-start">
                            <img 
                                src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228cf3ded904ef09b136fe3fec72548ebc1fea3fbbd1ad9e36364db38b.svg" 
                                className="w-16 h-16 object-contain shrink-0 bg-[#0d253f] p-1.5 rounded-lg" 
                                alt="TMDB Logo" 
                            />
                            <div>
                                <h4 className="text-xs font-bold text-white uppercase tracking-wider">TMDB API Compliance</h4>
                                <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                                    This product uses the TMDB API but is not endorsed or certified by TMDB. All movie descriptors, poster thumbnails, and cast indices are rendered dynamically via standard compliance schemas.
                                </p>
                            </div>
                        </div>

                        {/* Quick scrollable Legal block */}
                        <div className="bg-zinc-955 border border-zinc-800 rounded-xl p-4 text-[10px] text-zinc-600 leading-relaxed max-h-32 overflow-y-auto custom-scrollbar">
                            <p className="font-bold text-zinc-400 mb-1 text-xs">Terms of Service & Privacy Statement</p>
                            <p className="mb-2">MovieVerse AI functions strictly as an educational streaming simulation index. We do not host, upload, stream, or store copyright video files. Local Storage technologies store API tokens and list metrics directly inside secure browser instances.</p>
                            <p>For inquiries, please submit a Contact Support ticket. Last Modified: January 2025.</p>
                        </div>
                    </div>
                </div>

                {/* SAVE CHANGES & CANCEL FOOTER BARS */}
                <div className="mt-12 flex flex-col sm:flex-row justify-end items-center gap-3 bg-[#030303] sticky bottom-0 py-6 border-t border-zinc-800">
                    <button 
                        onClick={onClose} 
                        className="w-full sm:w-auto px-6 py-2.5 text-zinc-400 hover:text-white font-bold text-xs rounded-lg transition-all"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSaveAll} 
                        disabled={isSaving}
                        className="w-full sm:w-auto px-8 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-md shadow-red-950/20 active:scale-[0.98]"
                    >
                        {isSaving ? <Loader2 size={13} className="animate-spin" /> : "Save Changes"}
                    </button>
                </div>

            </div>
        </div>
    );
};
