import React, { useState, useEffect, useRef } from 'react';
import { UserCircle, X, Check, Settings, ShieldCheck, RefreshCcw, HelpCircle, FileText, Lock, LogOut, Calendar, Mail, User, BrainCircuit, Pencil, CheckCheck, Loader2, ChevronDown, ChevronUp, Fingerprint, Copy, Crown, History, Trash2, Search, Clock, ArrowLeft, Upload, Dice5, PaintBucket, AlertCircle, Sparkles, Bookmark, Heart, Download } from 'lucide-react';
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
    watchlist?: Movie[];
    setWatchlist?: (w: Movie[]) => void;
    favorites?: Movie[];
    setFavorites?: (f: Movie[]) => void;
    onSelectMovie?: (m: Movie) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ 
    isOpen, onClose, apiKey, setApiKey, maturityRating, setMaturityRating, profile, onUpdateProfile, onLogout,
    searchHistory = [], setSearchHistory, watchedMovies = [], setWatchedMovies,
    watchlist = [], setWatchlist, favorites = [], setFavorites, onSelectMovie
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

    // AniList & MAL states
    const [anilistUsername, setAnilistUsername] = useState(profile.anilistUsername || "");
    const [anilistToken, setAnilistToken] = useState(profile.anilistToken || "");
    const [malUsername, setMalUsername] = useState(profile.malUsername || "");

    // Expandable accordion states
    const [isProfileExpanded, setIsProfileExpanded] = useState(false);
    const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
    const [isWatchlistExpanded, setIsWatchlistExpanded] = useState(false);
    const [isFavoritesExpanded, setIsFavoritesExpanded] = useState(false);
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
            setAnilistUsername(profile.anilistUsername || "");
            setAnilistToken(profile.anilistToken || "");
            setMalUsername(profile.malUsername || "");

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

    const autoSaveProfile = async (updates: {
        name?: string;
        age?: string;
        genres?: string[];
        avatar?: string;
        avatarBackground?: string;
        newMaturityRating?: MaturityRating;
        newApiKey?: string;
        anilistUsername?: string;
        anilistToken?: string;
        malUsername?: string;
    }) => {
        const nameVal = updates.name !== undefined ? updates.name : profileName;
        const ageVal = updates.age !== undefined ? updates.age : profileAge;
        const genresVal = updates.genres !== undefined ? updates.genres : profileGenres;
        const avatarVal = updates.avatar !== undefined ? updates.avatar : profileAvatar;
        const avatarBgVal = updates.avatarBackground !== undefined ? updates.avatarBackground : profileAvatarBg;
        const maturityRatingVal = updates.newMaturityRating !== undefined ? updates.newMaturityRating : maturityRating;
        const anilistUserVal = updates.anilistUsername !== undefined ? updates.anilistUsername : anilistUsername;
        const anilistTokenVal = updates.anilistToken !== undefined ? updates.anilistToken : anilistToken;
        const malUserVal = updates.malUsername !== undefined ? updates.malUsername : malUsername;

        if (updates.name !== undefined && !nameVal.trim()) {
            setProfileError("Display name is required.");
            return;
        }
        if (updates.age !== undefined) {
            const ageNum = parseInt(ageVal);
            if (!ageVal || isNaN(ageNum) || ageNum < 10 || ageNum > 120) {
                setProfileError("Age must be between 10 and 120.");
                return;
            }
        }
        if (updates.genres !== undefined && genresVal.length < 3) {
            setProfileError("Please select at least 3 preferred genres.");
            return;
        }

        setProfileError("");
        try {
            if (updates.newApiKey !== undefined) {
                setApiKey(updates.newApiKey);
            }
            if (updates.newMaturityRating !== undefined) {
                setMaturityRating(updates.newMaturityRating);
            }

            const updatedProfile: UserProfile = {
                ...profile,
                name: nameVal,
                age: ageVal,
                genres: genresVal,
                avatar: avatarVal,
                avatarBackground: avatarBgVal,
                maturityRating: maturityRatingVal,
                anilistUsername: anilistUserVal,
                anilistToken: anilistTokenVal,
                malUsername: malUserVal
            };

            await onUpdateProfile(updatedProfile);
        } catch (err: any) {
            setProfileError(err.message || "Failed to auto-save settings.");
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
        const next = profileGenres.includes(genre)
            ? profileGenres.filter(g => g !== genre)
            : [...profileGenres, genre];
        setProfileGenres(next);
        autoSaveProfile({ genres: next });
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
                    const avatarUrl = e.target.result as string;
                    setProfileAvatar(avatarUrl);
                    setProfileError("");
                    autoSaveProfile({ avatar: avatarUrl });
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const selectAvatar = (seed: string) => {
        const avatarUrl = `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`;
        setProfileAvatar(avatarUrl);
        autoSaveProfile({ avatar: avatarUrl });
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
        <div className={`fixed inset-0 z-[100] bg-black/90 backdrop-blur-3xl overflow-y-auto font-sans transition-all duration-300 ${isOpen ? 'visible opacity-100 pointer-events-auto' : 'invisible opacity-0 pointer-events-none'}`}>
            {/* Inner Content Centered Wrapper */}
            <div className="max-w-3xl mx-auto px-5 py-8 md:py-14 relative">
                
                {/* Header Title band */}
                <div className="flex justify-between items-center pb-6 border-b border-white/[0.08] mb-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
                            Account
                        </h1>
                        <p className="text-xs text-zinc-400 font-medium mt-1 flex items-center gap-1.5">
                            <Calendar size={13} className="text-zinc-500" /> Member since {joinDate || '2025'}
                        </p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 text-zinc-400 hover:text-white transition-all flex items-center justify-center border border-white/10"
                        title="Close settings"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Error Banner */}
                {profileError && (
                    <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-200 text-xs font-medium animate-in slide-in-from-top-2 duration-200">
                        <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-red-300">Please note:</p>
                            <p className="mt-0.5 opacity-90">{profileError}</p>
                        </div>
                    </div>
                )}

                {/* APK DOWNLOAD BANNER (Apple Minimal Style) */}
                <div className="mb-8 p-4 md:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-white/15 transition-all flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 text-center sm:text-left">
                        <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 text-white flex items-center justify-center shrink-0">
                            <Download size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-white tracking-tight">MovieVerse for Android & TV</h3>
                            <p className="text-xs text-zinc-400 mt-0.5">Dedicated cinematic console application for Android phones and televisions.</p>
                        </div>
                    </div>
                    <a 
                        href="/movieverse.apk" 
                        download
                        className="px-4 py-2 bg-white text-black font-semibold text-xs rounded-full hover:bg-zinc-200 transition-all active:scale-[0.98] shrink-0 text-center flex items-center gap-2"
                    >
                        <Download size={14} /> Download APK
                    </a>
                </div>

                {/* SECTION 1: MEMBERSHIP & BILLING */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-7 border-b border-white/[0.08]">
                    <div className="md:col-span-4 space-y-2">
                        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Membership</h2>
                        <button 
                            onClick={() => { onClose(); onLogout?.(); }}
                            className="text-xs text-zinc-400 hover:text-red-400 transition-colors py-1 flex items-center gap-1.5"
                        >
                            <LogOut size={13} /> Sign Out
                        </button>
                    </div>
                    
                    <div className="md:col-span-8 space-y-4">
                        {/* Row: Email Address */}
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 pb-3 border-b border-white/[0.06]">
                            <div>
                                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Email Address</p>
                                <p className="text-sm font-medium text-white mt-0.5">{userEmail}</p>
                            </div>
                            <span className="text-[10px] text-zinc-400 bg-white/[0.05] border border-white/10 px-2.5 py-0.5 rounded-full self-start sm:self-auto font-medium">{provider} Login</span>
                        </div>

                        {/* Row: Password Mask */}
                        <div className="flex justify-between items-center pb-3 border-b border-white/[0.06]">
                            <div>
                                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Password</p>
                                <p className="text-sm font-mono text-zinc-400 mt-0.5">••••••••••••••••</p>
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
                                className="text-xs text-zinc-300 hover:text-white font-medium underline-offset-4 hover:underline transition-colors"
                            >
                                Reset Password
                            </button>
                        </div>

                        {/* Row: User ID */}
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">User ID</p>
                                <p className="text-xs font-mono text-zinc-400 mt-0.5 truncate max-w-[200px] sm:max-w-xs">{userId}</p>
                            </div>
                            <button 
                                onClick={handleCopyId} 
                                className="text-xs text-zinc-300 hover:text-white font-medium transition-all flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 rounded-lg border border-white/10"
                            >
                                {idCopied ? <Check size={13} className="text-zinc-200" /> : <Copy size={13} />}
                                <span>{idCopied ? "Copied" : "Copy ID"}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* SECTION 2: PLAN DETAILS */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-7 border-b border-white/[0.08]">
                    <div className="md:col-span-4">
                        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Plan Details</h2>
                    </div>
                    <div className="md:col-span-8 flex justify-between items-center">
                        <div className="flex items-center gap-2.5">
                            <p className="text-sm font-medium text-white">Premium Ultra HD</p>
                            <span className="text-[10px] font-semibold text-zinc-300 bg-white/[0.08] border border-white/10 px-2 py-0.5 rounded-md uppercase tracking-wider">4K HDR</span>
                        </div>
                        <span className="text-xs text-zinc-500 font-medium select-none cursor-default">Active Plan</span>
                    </div>
                </div>

                {/* SECTION 3: SYSTEM SETTINGS */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-7 border-b border-white/[0.08]">
                    <div className="md:col-span-4">
                        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Engines & API</h2>
                    </div>
                    <div className="md:col-span-8 space-y-4">
                        
                        {/* TMDB API Key row */}
                        <div className="space-y-2 pb-3 border-b border-white/[0.06]">
                            <div className="flex justify-between items-center">
                                <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider">TMDB API Key</label>
                                {!isEditingTmdb && (
                                    <span className="text-[10px] text-zinc-400 font-medium bg-white/[0.05] px-2.5 py-0.5 rounded-full border border-white/10 flex items-center gap-1">
                                        <ShieldCheck size={11} /> Default Engine
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <div className="relative flex-1 group">
                                    <input 
                                        type="password" 
                                        value={isEditingTmdb ? inputKey : "Default Environment Key"} 
                                        onChange={(e) => isEditingTmdb && setInputKey(e.target.value)} 
                                        onBlur={() => {
                                            if (isEditingTmdb) {
                                                autoSaveProfile({ newApiKey: inputKey });
                                            }
                                        }}
                                        disabled={!isEditingTmdb}
                                        className="w-full border rounded-xl p-2.5 pr-10 focus:outline-none transition-all text-xs font-mono bg-white/[0.04] border-white/10 text-zinc-200 focus:border-white/30" 
                                        placeholder="Enter TMDB Key"
                                    />
                                    {!isEditingTmdb && <Lock size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600" />}
                                </div>
                                
                                {isEditingTmdb ? (
                                    <button 
                                        onClick={() => { setIsEditingTmdb(false); setInputKey(""); autoSaveProfile({ newApiKey: "" }); }} 
                                        className="p-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-all"
                                        title="Reset to Default"
                                    >
                                        <RefreshCcw size={15} />
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => { setIsEditingTmdb(true); setInputKey(""); }} 
                                        className="p-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-all" 
                                        title="Edit Key"
                                    >
                                        <Pencil size={15} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Gemini Engine Block */}
                        <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.03] flex gap-3.5">
                            <BrainCircuit className="text-zinc-300 shrink-0 mt-0.5" size={18} />
                            <div>
                                <div className="flex justify-between items-center">
                                    <h4 className="text-xs font-semibold text-white tracking-wide">Gemini Cloud Engine</h4>
                                    <span className="text-[9px] font-semibold text-zinc-400 bg-white/[0.06] border border-white/10 px-2 py-0.5 rounded-full uppercase">Active</span>
                                </div>
                                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                                    AI-powered Cinema insights and recommendation streams are managed securely through cloud endpoints.
                                </p>
                            </div>
                        </div>

                        {/* AniList & MyAnimeList Connections */}
                        <div className="pt-3 border-t border-white/[0.06] space-y-3.5 text-left">
                            <div className="flex items-center gap-1.5">
                                <Sparkles size={14} className="text-zinc-400" />
                                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Anime & Manga Sync</label>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-medium text-zinc-400 ml-1">AniList Username</label>
                                    <input 
                                        type="text" 
                                        value={anilistUsername} 
                                        onChange={(e) => setAnilistUsername(e.target.value)} 
                                        onBlur={() => autoSaveProfile({ anilistUsername })}
                                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-white/30 text-xs font-medium" 
                                        placeholder="e.g. AnimeFan123" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-medium text-zinc-400 ml-1">MyAnimeList Username</label>
                                    <input 
                                        type="text" 
                                        value={malUsername} 
                                        onChange={(e) => setMalUsername(e.target.value)} 
                                        onBlur={() => autoSaveProfile({ malUsername })}
                                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-white/30 text-xs font-medium" 
                                        placeholder="e.g. MALProfileName" 
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-medium text-zinc-400 ml-1">AniList Access Token (Watchlist Sync)</label>
                                <input 
                                    type="password" 
                                    value={anilistToken} 
                                    onChange={(e) => setAnilistToken(e.target.value)} 
                                    onBlur={() => autoSaveProfile({ anilistToken })}
                                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-white/30 text-xs font-mono" 
                                    placeholder="Paste developer token here..." 
                                />
                                <p className="text-[10px] text-zinc-500 leading-normal px-1 mt-0.5">
                                    Generate this token in your AniList settings (Developer settings &gt; Create New Token) to enable syncing watchlists directly to your AniList profile.
                                </p>
                            </div>
                        </div>

                    </div>
                </div>

                {/* SECTION 4: PROFILE & PARENTAL CONTROLS */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-7 border-b border-white/[0.08]">
                    <div className="md:col-span-4">
                        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Profile & Preferences</h2>
                    </div>
                    <div className="md:col-span-8">
                        
                        {/* Profile Accordion Header */}
                        <button 
                            onClick={() => setIsProfileExpanded(!isProfileExpanded)}
                            className="w-full flex items-center justify-between p-4 bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] rounded-2xl transition-all"
                        >
                            <div className="flex items-center gap-3.5 text-left">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0 border border-white/10 shadow-sm ${profileAvatarBg}`}>
                                    {profileAvatar ? (
                                        <img src={profileAvatar} className="w-full h-full object-cover rounded-xl" alt="avatar" />
                                    ) : (
                                        profileName.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">{profileName || "User"}</p>
                                    <p className="text-xs text-zinc-400 mt-0.5">Maturity limit: {maturityRating}</p>
                                </div>
                            </div>
                            {isProfileExpanded ? <ChevronUp size={18} className="text-zinc-400" /> : <ChevronDown size={18} className="text-zinc-400" />}
                        </button>

                        {/* Accordion Expand Drawer */}
                        {isProfileExpanded && (
                            <div className="mt-3 p-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] space-y-5 animate-in slide-in-from-top-2 duration-200">
                                
                                {/* Identity Edit Inputs */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider ml-1">Display Name</label>
                                        <input 
                                            type="text" 
                                            value={profileName} 
                                            onChange={(e) => setProfileName(e.target.value)} 
                                            onBlur={() => autoSaveProfile({ name: profileName })}
                                            className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-white/30 text-xs font-medium" 
                                            placeholder="Your Name" 
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider ml-1">Age</label>
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
                                            onBlur={() => autoSaveProfile({ age: profileAge })}
                                            className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-white/30 text-xs font-medium" 
                                            placeholder="10-120" 
                                        />
                                    </div>
                                </div>

                                {/* Avatar Randomizer & Upload Row */}
                                <div className="space-y-2.5">
                                    <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider ml-1 block">Choose Avatar</label>
                                    <div className="flex flex-wrap gap-2">
                                        {AVATARS.map((av) => (
                                            <button
                                                key={av.seed}
                                                type="button"
                                                onClick={() => selectAvatar(av.seed)}
                                                className="w-8 h-8 rounded-full overflow-hidden border-2 border-transparent hover:border-white/50 active:scale-95 transition-all bg-white/[0.06]"
                                                title={av.name}
                                            >
                                                <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${av.seed}`} className="w-full h-full object-cover" alt="" />
                                            </button>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2.5 mt-1.5">
                                        <button 
                                            type="button" 
                                            onClick={() => fileInputRef.current?.click()} 
                                            className="py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl text-xs font-medium text-white transition-all flex items-center justify-center gap-1.5 active:scale-95"
                                        >
                                            <Upload size={13} /> Upload Image
                                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => selectAvatar(AVATARS[Math.floor(Math.random() * AVATARS.length)].seed)} 
                                            className="py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl text-xs font-medium text-white transition-all flex items-center justify-center gap-1.5 active:scale-95"
                                        >
                                            <Dice5 size={13} /> Random Avatar
                                        </button>
                                    </div>
                                </div>

                                {/* Background Swatches */}
                                <div className="space-y-2">
                                    <label className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block ml-1"><PaintBucket size={11} className="inline mr-1" /> Profile Card Palette</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {BACKGROUNDS.map(bg => (
                                            <button 
                                                key={bg.id}
                                                type="button"
                                                onClick={() => { setProfileAvatarBg(bg.class); autoSaveProfile({ avatarBackground: bg.class }); }}
                                                className={`w-6 h-6 rounded-full ${bg.class} border-2 transition-all ${profileAvatarBg === bg.class ? 'border-white scale-110 shadow-sm' : 'border-transparent hover:scale-105 hover:border-zinc-400'}`}
                                                title={bg.name}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Parental Maturity Limit Rating Selectors */}
                                <div className="space-y-2.5 pt-3.5 border-t border-white/[0.06]">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider ml-1">Maturity Rating Limit</label>
                                        <span className="text-[10px] text-zinc-400 bg-white/[0.05] border border-white/10 px-2 py-0.5 rounded-full font-medium">Restricts catalog</span>
                                    </div>
                                    <div className="grid grid-cols-5 gap-1.5">
                                        {['G', 'PG', 'PG-13', 'R', 'NC-17'].map((rate) => (
                                            <button 
                                                key={rate} 
                                                type="button"
                                                onClick={() => { setMaturityRating(rate as MaturityRating); autoSaveProfile({ newMaturityRating: rate as MaturityRating }); }}
                                                className={`py-2 text-[11px] font-semibold rounded-xl text-center transition-all ${
                                                    maturityRating === rate 
                                                    ? 'bg-white text-black shadow-sm' 
                                                    : 'bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.08]'
                                                }`}
                                            >
                                                {rate}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Genre Tags Edit panel */}
                                <div className="space-y-2.5 pt-3.5 border-t border-white/[0.06]">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider ml-1">Preferred Genres</label>
                                        <span className="text-[10px] text-zinc-400 bg-white/[0.05] border border-white/10 px-2 py-0.5 rounded-full font-medium">
                                            {profileGenres.length} Selected (Min 3)
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {GENRES_LIST.map(genre => {
                                            const isSelected = profileGenres.includes(genre);
                                            return (
                                                <button 
                                                    key={genre} 
                                                    type="button"
                                                    onClick={() => toggleGenre(genre)}
                                                    className={`px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all flex items-center gap-1.5 ${
                                                        isSelected 
                                                        ? 'bg-white text-black shadow-sm' 
                                                        : 'bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.08]'
                                                    }`}
                                                >
                                                    {genre}
                                                    {isSelected && <Check size={11} />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>

                {/* SECTION 5: MY LIBRARY & VIEWING HISTORY */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-7 border-b border-white/[0.08]">
                    <div className="md:col-span-4">
                        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Library & Logs</h2>
                    </div>
                    <div className="md:col-span-8 space-y-3">
                        
                        {/* Watchlist Accordion */}
                        <div>
                            <button 
                                onClick={() => setIsWatchlistExpanded(!isWatchlistExpanded)}
                                className="w-full flex items-center justify-between p-4 bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] rounded-2xl transition-all"
                            >
                                <div className="flex items-center gap-3 text-left">
                                    <Bookmark size={16} className="text-zinc-300" />
                                    <div>
                                        <p className="text-xs font-semibold text-white tracking-wide">My Watchlist</p>
                                        <p className="text-[11px] text-zinc-400 mt-0.5">{watchlist.length} items saved.</p>
                                    </div>
                                </div>
                                {isWatchlistExpanded ? <ChevronUp size={18} className="text-zinc-400" /> : <ChevronDown size={18} className="text-zinc-400" />}
                            </button>

                            {isWatchlistExpanded && (
                                <div className="mt-2 p-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] max-h-64 overflow-y-auto custom-scrollbar space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                                    {watchlist.length === 0 ? (
                                        <p className="text-[11px] text-zinc-500 text-center py-4">Your watchlist is currently empty.</p>
                                    ) : (
                                        watchlist.map((movie) => (
                                            <div key={movie.id} className="flex items-center gap-3 p-2 hover:bg-white/[0.05] rounded-xl transition-all relative group cursor-pointer" onClick={() => { if (onSelectMovie) { onSelectMovie(movie); onClose(); } }}>
                                                <img 
                                                    src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : "https://placehold.co/40x60"} 
                                                    alt={movie.title || movie.name}
                                                    className="w-8 h-12 object-cover rounded-lg shadow-sm"
                                                />
                                                <div className="flex-1 min-w-0 pr-8">
                                                    <p className="text-xs font-medium text-zinc-200 truncate group-hover:text-white transition-colors">{movie.title || movie.name}</p>
                                                    <p className="text-[10px] text-zinc-500 mt-0.5">{movie.release_date?.split('-')[0] || 'Unknown'}</p>
                                                </div>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (setWatchlist) {
                                                            setWatchlist(watchlist.filter(m => m.id !== movie.id));
                                                        }
                                                    }} 
                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-full text-zinc-500 hover:text-white transition-colors"
                                                    title="Remove from Watchlist"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Favorites Accordion */}
                        <div>
                            <button 
                                onClick={() => setIsFavoritesExpanded(!isFavoritesExpanded)}
                                className="w-full flex items-center justify-between p-4 bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] rounded-2xl transition-all"
                            >
                                <div className="flex items-center gap-3 text-left">
                                    <Heart size={16} className="text-zinc-300" />
                                    <div>
                                        <p className="text-xs font-semibold text-white tracking-wide">My Favorites</p>
                                        <p className="text-[11px] text-zinc-400 mt-0.5">{favorites.length} movies favorited.</p>
                                    </div>
                                </div>
                                {isFavoritesExpanded ? <ChevronUp size={18} className="text-zinc-400" /> : <ChevronDown size={18} className="text-zinc-400" />}
                            </button>

                            {isFavoritesExpanded && (
                                <div className="mt-2 p-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] max-h-64 overflow-y-auto custom-scrollbar space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                                    {favorites.length === 0 ? (
                                        <p className="text-[11px] text-zinc-500 text-center py-4">Your favorites list is currently empty.</p>
                                    ) : (
                                        favorites.map((movie) => (
                                            <div key={movie.id} className="flex items-center gap-3 p-2 hover:bg-white/[0.05] rounded-xl transition-all relative group cursor-pointer" onClick={() => { if (onSelectMovie) { onSelectMovie(movie); onClose(); } }}>
                                                <img 
                                                    src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : "https://placehold.co/40x60"} 
                                                    alt={movie.title || movie.name}
                                                    className="w-8 h-12 object-cover rounded-lg shadow-sm"
                                                />
                                                <div className="flex-1 min-w-0 pr-8">
                                                    <p className="text-xs font-medium text-zinc-200 truncate group-hover:text-white transition-colors">{movie.title || movie.name}</p>
                                                    <p className="text-[10px] text-zinc-500 mt-0.5">{movie.release_date?.split('-')[0] || 'Unknown'}</p>
                                                </div>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (setFavorites) {
                                                            setFavorites(favorites.filter(m => m.id !== movie.id));
                                                        }
                                                    }} 
                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-full text-zinc-500 hover:text-white transition-colors"
                                                    title="Remove from Favorites"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        {/* History/Viewing Logs Accordion */}
                        <div>
                            <button 
                                onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                                className="w-full flex items-center justify-between p-4 bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] rounded-2xl transition-all"
                            >
                                <div className="flex items-center gap-3 text-left">
                                    <History size={16} className="text-zinc-300" />
                                    <div>
                                        <p className="text-xs font-semibold text-white tracking-wide">Viewing Logs</p>
                                        <p className="text-[11px] text-zinc-400 mt-0.5">Toggle tracking state, clear searches, and review history.</p>
                                    </div>
                                </div>
                                {isHistoryExpanded ? <ChevronUp size={18} className="text-zinc-400" /> : <ChevronDown size={18} className="text-zinc-400" />}
                            </button>

                            {isHistoryExpanded && (
                                <div className="mt-3 p-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] space-y-5 animate-in slide-in-from-top-2 duration-200">
                                    
                                    {/* Paused tracking setting (Apple Switch) */}
                                    <div className="flex justify-between items-center pb-4 border-b border-white/[0.06]">
                                        <div>
                                            <p className="text-xs font-medium text-white">Record Viewing History</p>
                                            <p className="text-[11px] text-zinc-400 mt-0.5">Save your searches and watched items to personalize recommendations.</p>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={handleToggleHistory}
                                            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${profile.enableHistory !== false ? 'bg-white' : 'bg-white/15'}`}
                                            aria-label="Toggle history recording"
                                        >
                                            <div className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${profile.enableHistory !== false ? 'bg-black translate-x-5' : 'bg-white translate-x-0'}`} />
                                        </button>
                                    </div>

                                    {/* History Grid */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-1">
                                        
                                        {/* Search history column */}
                                        <div className="flex flex-col min-h-[160px] max-h-[220px]">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5"><Search size={12} /> Searches</span>
                                                {searchHistory.length > 0 && (
                                                    <button onClick={handleClearSearchHistory} className="text-[10px] font-semibold uppercase text-zinc-400 hover:text-white transition-colors">Clear</button>
                                                )}
                                            </div>
                                            <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-y-auto custom-scrollbar p-1.5 flex-1">
                                                {searchHistory.length === 0 ? (
                                                    <div className="h-full flex flex-col items-center justify-center text-zinc-500 opacity-60 text-center p-4">
                                                        <Clock size={16} className="mb-1" />
                                                        <p className="text-[10px] font-medium">No recent searches</p>
                                                    </div>
                                                ) : (
                                                    searchHistory.map((query, idx) => (
                                                        <div key={`${query}-${idx}`} className="flex items-center justify-between px-2.5 py-1.5 hover:bg-white/[0.04] rounded-lg transition-all mb-0.5 group">
                                                            <span className="text-xs text-zinc-300 truncate max-w-[80%] font-medium">{query}</span>
                                                            <button onClick={() => handleRemoveSearchItem(query)} className="text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all p-0.5">
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                        {/* Watch history column */}
                                        <div className="flex flex-col min-h-[160px] max-h-[220px]">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5"><History size={12} /> Watched</span>
                                                {watchedMovies.length > 0 && (
                                                    <button onClick={handleClearWatchHistory} className="text-[10px] font-semibold uppercase text-zinc-400 hover:text-white transition-colors">Clear</button>
                                                )}
                                            </div>
                                            <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-y-auto custom-scrollbar p-1.5 flex-1">
                                                {watchedMovies.length === 0 ? (
                                                    <div className="h-full flex flex-col items-center justify-center text-zinc-500 opacity-60 text-center p-4">
                                                        <History size={16} className="mb-1" />
                                                        <p className="text-[10px] font-medium">No watch history</p>
                                                    </div>
                                                ) : (
                                                    watchedMovies.slice().reverse().map((movie) => (
                                                        <div key={movie.id} className="flex items-center gap-2.5 p-1.5 hover:bg-white/[0.04] rounded-lg transition-all relative mb-0.5 group">
                                                            <img 
                                                                src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : "https://placehold.co/40x60"} 
                                                                alt={movie.title}
                                                                className="w-7 h-10 object-cover rounded-md shadow-sm"
                                                            />
                                                            <div className="flex-1 min-w-0 pr-6">
                                                                <p className="text-xs font-medium text-zinc-300 truncate">{movie.title || movie.name}</p>
                                                                <p className="text-[10px] text-zinc-500 mt-0.5">{movie.release_date?.split('-')[0] || 'Unknown'}</p>
                                                            </div>
                                                            <button 
                                                                onClick={() => handleRemoveWatchItem(movie.id)} 
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                                                            >
                                                                <Trash2 size={12} />
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
                </div>

                {/* SECTION 6: FAQ & HELP & SUPPORT */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-7 border-b border-white/[0.08]">
                    <div className="md:col-span-4">
                        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Help & FAQ</h2>
                    </div>
                    <div className="md:col-span-8">
                        
                        <button 
                            onClick={() => setIsFaqExpanded(!isFaqExpanded)}
                            className="w-full flex items-center justify-between p-4 bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] rounded-2xl transition-all"
                        >
                            <div className="flex items-center gap-3 text-left">
                                <HelpCircle size={16} className="text-zinc-300" />
                                <div>
                                    <p className="text-xs font-semibold text-white tracking-wide">Support Desk & FAQ</p>
                                    <p className="text-[11px] text-zinc-400 mt-0.5">Read frequently asked questions or submit an inquiry to our team.</p>
                                </div>
                            </div>
                            {isFaqExpanded ? <ChevronUp size={18} className="text-zinc-400" /> : <ChevronDown size={18} className="text-zinc-400" />}
                        </button>

                        {isFaqExpanded && (
                            <div className="mt-3 p-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] space-y-5 animate-in slide-in-from-top-2 duration-200">
                                
                                {/* FAQ Accordion */}
                                <div className="space-y-2 pb-4 border-b border-white/[0.06]">
                                    <h4 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block ml-1">Frequently Asked Questions</h4>
                                    <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-white/[0.01]">
                                        {FAQs.map((faq, i) => (
                                            <div key={i} className="border-b border-white/[0.06] last:border-0">
                                                <button 
                                                    onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                                                    className="w-full flex justify-between items-center p-3 text-left hover:bg-white/[0.04] transition-all"
                                                >
                                                    <span className="text-xs font-medium text-zinc-300">{faq.q}</span>
                                                    <ChevronDown size={14} className={`text-zinc-500 transition-transform duration-300 ${expandedFaq === i ? 'rotate-180' : ''}`} />
                                                </button>
                                                {expandedFaq === i && (
                                                    <div className="p-3 bg-white/[0.02] text-xs text-zinc-400 leading-relaxed border-t border-white/[0.06]">
                                                        {faq.a}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Support message sender */}
                                <div className="space-y-3.5">
                                    <h4 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block ml-1">Contact Support</h4>
                                    <div className="space-y-3">
                                        <div className="relative">
                                            <select 
                                                value={supportSubject} 
                                                onChange={(e) => setSupportSubject(e.target.value)}
                                                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-white/30 appearance-none font-medium"
                                            >
                                                <option className="bg-[#0e0e12] text-zinc-200">General Inquiry</option>
                                                <option className="bg-[#0e0e12] text-zinc-200">Bug Report</option>
                                                <option className="bg-[#0e0e12] text-zinc-200">Feature Request</option>
                                                <option className="bg-[#0e0e12] text-zinc-200">Account Issue</option>
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                                        </div>

                                        <textarea 
                                            value={supportMessage}
                                            onChange={(e) => setSupportMessage(e.target.value)}
                                            className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-white/30 resize-none h-24 placeholder-zinc-600 font-medium"
                                            placeholder="Describe your inquiry in detail..."
                                        />

                                        {sentSuccess ? (
                                            <div className="p-3 bg-white/[0.06] border border-white/15 text-white font-medium rounded-xl text-center text-xs flex items-center justify-center gap-1.5">
                                                <CheckCheck size={14} /> Message Sent Successfully!
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={handleSendSupport} 
                                                disabled={sending || !supportMessage.trim()}
                                                className="w-full bg-white hover:bg-zinc-200 text-black font-semibold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
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
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-7 border-b border-white/[0.08]">
                    <div className="md:col-span-4">
                        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Compliance & Legal</h2>
                    </div>
                    <div className="md:col-span-8 space-y-4">
                        
                        {/* TMDB Compliance Branding block */}
                        <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.06] flex gap-3.5 items-start">
                            <img 
                                src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228cf3ded904ef09b136fe3fec72548ebc1fea3fbbd1ad9e36364db38b.svg" 
                                className="w-12 h-12 object-contain shrink-0 bg-[#0d253f] p-1.5 rounded-lg" 
                                alt="TMDB Logo" 
                            />
                            <div>
                                <h4 className="text-xs font-semibold text-white tracking-wide">TMDB API Compliance</h4>
                                <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                                    This product uses the TMDB API but is not endorsed or certified by TMDB. All movie descriptors, poster thumbnails, and cast indices are rendered dynamically via standard compliance schemas.
                                </p>
                            </div>
                        </div>

                        {/* Quick scrollable Legal block */}
                        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-[11px] text-zinc-400 leading-relaxed max-h-32 overflow-y-auto custom-scrollbar">
                            <p className="font-semibold text-white mb-1 text-xs">Terms of Service & Privacy</p>
                            <p className="mb-2">MovieVerse functions strictly as an educational media discovery and tracking platform. We do not host, stream, or store copyright video files. Local Storage technologies store preferences and watch progress directly within your browser instance.</p>
                            <p>For inquiries, please submit a Contact Support ticket. Last Modified: 2026.</p>
                        </div>
                    </div>
                </div>

                <div className="pb-10" />

            </div>
        </div>
    );
};
