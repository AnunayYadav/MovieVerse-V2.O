import React, { useState, useEffect } from 'react';
import { UserCircle, X, ListPlus, Plus, Check, Loader2, Film, AlertCircle, BrainCircuit, Search, Star, Settings, ShieldCheck, RefreshCcw, Bell, HelpCircle, Shield, FileText, Lock, ChevronRight, LogOut, MessageSquare, Send, Calendar, Mail, Hash, Copy, User } from 'lucide-react';
import { UserProfile, Movie, GENRES_LIST, PersonDetails, MaturityRating } from '../types';
import { TMDB_BASE_URL, TMDB_IMAGE_BASE } from './Shared';
import { generateSmartRecommendations } from '../services/gemini';
import { getSupabase } from '../services/supabase';

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
  
    useEffect(() => {
        if (isOpen) {
            setName(profile.name || "");
            setAge(profile.age || "");
            setSelectedGenres(profile.genres || []);
        }
    }, [isOpen, profile]);
  
    const toggleGenre = (genre: string) => {
        setSelectedGenres(prev => 
            prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
        );
    };
  
    const handleSave = () => {
        onSave({ name, age, genres: selectedGenres });
        onClose();
    };
  
    if (!isOpen) return null;
  
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
         <div className="glass-panel w-full max-w-md rounded-2xl p-6 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-red-800"></div>
             <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold text-white flex items-center gap-2"><UserCircle className="text-red-500"/> Edit Profile</h2>
                 <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><X size={20}/></button>
             </div>
             
             <div className="space-y-5">
                 <div className="space-y-1">
                     <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Name</label>
                     <input 
                       type="text" 
                       value={name} 
                       onChange={(e) => setName(e.target.value)} 
                       className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-red-500 focus:bg-white/10 focus:outline-none transition-all"
                       placeholder="Enter your name"
                     />
                 </div>
                 <div className="space-y-1">
                     <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Age</label>
                     <input 
                       type="number" 
                       value={age} 
                       onChange={(e) => setAge(e.target.value)} 
                       className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-red-500 focus:bg-white/10 focus:outline-none transition-all"
                       placeholder="Enter your age"
                     />
                     <p className="text-[10px] text-gray-500 ml-1">Used for age-appropriate recommendations.</p>
                 </div>
                 
                 <div className="space-y-2">
                     <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Favorite Genres</label>
                     <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
                         {GENRES_LIST.map(genre => (
                             <button 
                               key={genre}
                               onClick={() => toggleGenre(genre)}
                               className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${selectedGenres.includes(genre) ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-900/50' : 'bg-transparent border-white/10 text-gray-400 hover:border-white/30 hover:text-white'}`}
                             >
                                 {genre}
                             </button>
                         ))}
                     </div>
                 </div>
             </div>
             
             <button onClick={handleSave} className="w-full mt-8 bg-white text-black font-bold py-3.5 rounded-xl hover:bg-gray-200 transition-all active:scale-[0.98]">
                 Save Changes
             </button>
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
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
        <div className="glass-panel w-full max-w-sm rounded-2xl p-6 shadow-2xl">
          <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-white flex items-center gap-2"><ListPlus size={20} className="text-red-500"/> Add to List</h3><button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20}/></button></div>
          <div className="space-y-4">
            <div className="flex gap-2"><input type="text" value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="New List Name..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-red-500 focus:outline-none"/><button onClick={handleCreate} className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-xl transition-colors"><Plus size={18}/></button></div>
            <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
               {Object.keys(customLists).length === 0 ? <p className="text-xs text-gray-500 text-center py-6 border border-dashed border-white/10 rounded-xl">No custom lists yet.</p> : Object.keys(customLists).map(listName => { const isPresent = customLists[listName].some(m => m.id === movie.id); return (<button key={listName} onClick={() => { onAddToList(listName, movie); onClose(); }} className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 p-3 rounded-xl text-sm transition-colors border border-transparent hover:border-white/10"><span className="text-gray-200 font-medium">{listName}</span>{isPresent ? <Check size={16} className="text-green-500"/> : <Plus size={16} className="text-gray-500"/>}</button>) })}
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
    const [details, setDetails] = useState<PersonDetails | null>(null);
    const [loading, setLoading] = useState(true);
  
    useEffect(() => {
      if (!personId || !apiKey) return;
      setLoading(true);
      fetch(`${TMDB_BASE_URL}/person/${personId}?api_key=${apiKey}&append_to_response=combined_credits,images`)
        .then(res => { if (!res.ok) throw new Error("Fetch failed"); return res.json(); })
        .then(data => { setDetails(data); setLoading(false); })
        .catch(err => { console.error("Person fetch error", err); setLoading(false); setDetails(null); });
    }, [personId, apiKey]);
  
    if (!personId) return null;
  
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
        <div className="glass-panel w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl relative max-h-[85vh] flex flex-col">
           <button onClick={onClose} className="absolute top-4 right-4 z-20 bg-black/50 hover:bg-white/20 p-2 rounded-full text-white transition-colors"><X size={20} /></button>
          {loading ? (
             <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-red-500" size={32}/></div>
          ) : details ? (
             <div className="flex flex-col md:flex-row h-full md:overflow-hidden overflow-y-auto custom-scrollbar pb-24 md:pb-0">
                  <div className="w-full md:w-80 shrink-0 bg-black/40 p-6 md:p-8 md:overflow-y-auto border-b md:border-b-0 md:border-r border-white/5">
                    <img 
                        src={details.profile_path ? `${TMDB_IMAGE_BASE}${details.profile_path}` : "https://placehold.co/300x450/333/FFF?text=No+Image"} 
                        alt={details.name} 
                        className="w-48 md:w-full mx-auto rounded-xl shadow-lg border border-white/10 mb-4 object-cover aspect-[2/3]" 
                    />
                    <div className="space-y-3 text-center md:text-left">
                      <div className="glass p-3 rounded-xl text-sm"><span className="text-white/40 block text-[10px] uppercase font-bold tracking-wider mb-1">Born</span><span className="text-white font-medium">{details.birthday || 'N/A'}</span></div>
                      <div className="glass p-3 rounded-xl text-sm"><span className="text-white/40 block text-[10px] uppercase font-bold tracking-wider mb-1">Place</span><span className="text-white font-medium">{details.place_of_birth || 'N/A'}</span></div>
                    </div>
                  </div>
                  <div className="flex-1 p-6 md:p-8 md:overflow-y-auto custom-scrollbar bg-[#0f0f0f]/50">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 text-center md:text-left">{details.name}</h2>
                    <p className="text-red-400 text-sm font-bold tracking-wider mb-6 text-center md:text-left">{details.known_for_department}</p>
                    
                    <h3 className="text-white font-bold text-sm mb-2 uppercase tracking-wide opacity-70">Biography</h3>
                    <p className="text-gray-300 text-sm leading-relaxed mb-8 whitespace-pre-line">{details.biography || "No biography available."}</p>
                    
                    <h3 className="text-white font-bold text-sm mb-4 uppercase tracking-wide opacity-70 flex items-center gap-2"><Film size={14} className="text-red-500"/> Known For</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {details.combined_credits?.cast?.sort((a: any,b: any) => b.popularity - a.popularity).slice(0, 9).map((movie: Movie) => (
                          <div key={movie.id} onClick={() => onMovieClick(movie)} className="cursor-pointer group">
                            <div className="aspect-[2/3] rounded-lg overflow-hidden mb-2 relative border border-white/5"><img src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : "https://placehold.co/100x150"} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={movie.title || movie.name} /></div>
                            <p className="text-xs font-medium text-gray-300 truncate group-hover:text-white transition-colors">{movie.title || movie.name}</p>
                          </div>
                        ))}
                     </div>
                  </div>
             </div>
          ) : <div className="p-12 text-center flex flex-col items-center text-gray-500"><AlertCircle size={48} className="mb-4 opacity-50 text-red-500"/><p className="text-lg font-bold text-gray-300">Details Unavailable</p></div>}
        </div>
      </div>
    );
};

// AI RECOMMENDATION MODAL
interface AIRecommendationModalProps {
    isOpen: boolean;
    onClose: () => void;
    apiKey: string;
    geminiKey: string;
}

export const AIRecommendationModal: React.FC<AIRecommendationModalProps> = ({ isOpen, onClose, apiKey, geminiKey }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [aiContext, setAiContext] = useState("");
  
    const handleRecommend = async () => {
      if (!query.trim()) return;
      setLoading(true);
      setResults(null);
      setAiContext("");
      
      try {
          if (geminiKey) {
             const geminiResponse = await generateSmartRecommendations(geminiKey, query);
             if (geminiResponse && geminiResponse.movies) {
                  setAiContext(geminiResponse.reason);
                  const searches = geminiResponse.movies.map(title => 
                    fetch(`${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(title)}&include_adult=false`)
                    .then(r => { if(!r.ok) throw new Error("Fetch failed"); return r.json(); })
                    .then(d => d.results?.[0])
                    .catch(() => null)
                  );
                  const fetchedMovies = (await Promise.all(searches)).filter(Boolean);
                  if (fetchedMovies.length > 0) { setResults(fetchedMovies); } 
                  else { setResults(null); setAiContext("Gemini tried its best but couldn't find it in the DB."); }
             }
          } else {
             setAiContext("Gemini Key required for Smart Recommendations");
          }
      } catch(e) { console.error(e); }
      setLoading(false);
    };

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
         <div className="glass-panel w-full max-w-lg rounded-2xl p-6 shadow-2xl relative max-h-[80vh] flex flex-col border border-white/10">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20}/></button>
          <div className="text-center mb-8 flex-shrink-0 mt-2">
              <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-900/40 rotate-3">
                  <BrainCircuit size={32} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-1 text-white tracking-tight">AI Movie Finder</h2>
              <p className="text-white/50 text-sm">Describe your mood, specific plots, or abstract ideas.</p>
          </div>
          
          {!results && !loading && ( 
              <div className="space-y-4 flex-shrink-0">
                  <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-900 rounded-xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
                      <div className="relative flex items-center">
                        <input 
                            type="text" 
                            value={query} 
                            onChange={(e) => setQuery(e.target.value)} 
                            placeholder="e.g. 'Space movies that feel lonely'..." 
                            className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl p-4 pr-12 text-white focus:outline-none focus:border-white/30 transition-all placeholder-gray-600"
                            onKeyDown={(e) => { if(e.key === 'Enter') { handleRecommend(); }}} 
                            autoFocus 
                        />
                        <button onClick={handleRecommend} className="absolute right-2 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors">
                            <Search size={20} />
                        </button>
                      </div>
                  </div>
              </div> 
          )}
          
          {loading && (
              <div className="h-48 flex flex-col items-center justify-center space-y-4 flex-shrink-0">
                  <Loader2 size={40} className="animate-spin text-red-500"/>
                  <p className="text-red-300 text-sm font-medium animate-pulse">Analyzing cinematic universe...</p>
              </div>
          )}
          
          {results && ( 
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2">
                  {aiContext && (
                      <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl mb-4">
                          <p className="text-xs text-red-200 italic leading-relaxed">AI: "{aiContext}"</p>
                      </div>
                  )}
                  <div className="space-y-3">
                      {Array.isArray(results) ? results.map((res: Movie, idx) => (
                          <div key={idx} className="glass p-3 rounded-xl flex gap-4 transition-all hover:bg-white/10 group">
                              <img src={res.poster_path ? `${TMDB_IMAGE_BASE}${res.poster_path}` : "https://placehold.co/100x150"} className="w-14 h-20 object-cover rounded-lg shadow-lg shrink-0 group-hover:scale-105 transition-transform" alt="Result"/>
                              <div className="flex-1 min-w-0 py-1">
                                  <h3 className="text-sm font-bold mb-1 truncate text-white">{res.title || res.original_title}</h3>
                                  <div className="flex items-center gap-2 mb-1.5">
                                      <span className="text-[10px] bg-white/10 text-gray-300 px-1.5 py-0.5 rounded">{res.release_date?.split('-')[0] || 'TBA'}</span>
                                      <span className="text-[10px] text-gray-400 flex items-center gap-1"><Star size={10} className="text-yellow-500" /> {res.vote_average?.toFixed(1)}</span>
                                  </div>
                                  <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed">{res.overview}</p>
                              </div>
                          </div>
                      )) : (
                          <div className="text-center py-8 text-gray-400"><p>No valid results found.</p></div>
                      )}
                  </div>
                  <button onClick={() => { setResults(null); setQuery(""); }} className="w-full mt-4 text-sm font-bold py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors">Search Again</button>
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
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    // Mock Notifications
    const notifications = [
        { id: 1, title: "New Arrival: Dune Part Two", time: "2 hours ago", read: false },
        { id: 2, title: "Your Watchlist: Inception is now streaming", time: "1 day ago", read: true },
        { id: 3, title: "System Update: Enhanced AI Search", time: "3 days ago", read: true },
        { id: 4, title: "Welcome to MovieVerse Pro!", time: "1 week ago", read: true },
    ];

    return (
        <div className="fixed top-16 right-4 md:right-20 z-[90] w-80 animate-in slide-in-from-top-2 fade-in duration-200">
            <div className="glass-panel rounded-xl overflow-hidden shadow-2xl border border-white/10">
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/40">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2"><Bell size={14} className="text-red-500"/> Notifications</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={16}/></button>
                </div>
                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                    {notifications.map(n => (
                        <div key={n.id} className={`p-4 border-b border-white/5 hover:bg-white/5 transition-colors ${!n.read ? 'bg-white/5' : ''}`}>
                            <div className="flex justify-between items-start mb-1">
                                <p className={`text-sm ${!n.read ? 'text-white font-bold' : 'text-gray-300'}`}>{n.title}</p>
                                {!n.read && <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5"></div>}
                            </div>
                            <p className="text-[10px] text-gray-500">{n.time}</p>
                        </div>
                    ))}
                </div>
                <div className="p-3 text-center bg-black/40 border-t border-white/5">
                    <button className="text-xs text-gray-400 hover:text-white transition-colors">Mark all as read</button>
                </div>
            </div>
            {/* Click outside listener overlay */}
            <div className="fixed inset-0 -z-10" onClick={onClose}></div>
        </div>
    );
};

// SETTINGS MODAL
interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    apiKey: string;
    setApiKey: (key: string) => void;
    geminiKey: string;
    setGeminiKey: (key: string) => void;
    maturityRating: MaturityRating;
    setMaturityRating: (r: MaturityRating) => void;
    profile: UserProfile;
    onLogout?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, onClose, apiKey, setApiKey, geminiKey, setGeminiKey, maturityRating, setMaturityRating, profile, onLogout 
}) => {
    const DEFAULT_TMDB_KEY = "fe42b660a036f4d6a2bfeb4d0f523ce9";
    const DEFAULT_GEMINI_KEY = "AIzaSyBGy80BBep7qmkqc0Wqt9dr-gMYs8X2mzo";

    const [inputKey, setInputKey] = useState(apiKey || "");
    const [inputGemini, setInputGemini] = useState(geminiKey || "");
    const [activeTab, setActiveTab] = useState("account");
    
    // Enhanced Account State
    const [userEmail, setUserEmail] = useState("");
    const [joinDate, setJoinDate] = useState("");
    const [userId, setUserId] = useState("");
    const [provider, setProvider] = useState("Guest");

    useEffect(() => {
        if (isOpen) {
            setInputKey(apiKey || "");
            setInputGemini(geminiKey || "");
            
            // Fetch real user data
            const fetchUser = async () => {
                const supabase = getSupabase();
                if (supabase) {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        setUserEmail(user.email || "No Email");
                        setJoinDate(new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
                        setUserId(user.id);
                        setProvider(user.app_metadata.provider || "Email");
                    } else {
                        // Guest Fallback
                        setUserEmail("guest@movieverse.ai");
                        setJoinDate("Just Now");
                        setUserId(`guest-${Date.now()}`);
                        setProvider("Local Session");
                    }
                } else {
                     setUserEmail("guest@movieverse.ai");
                     setJoinDate("Just Now");
                     setUserId(`guest-${Date.now()}`);
                     setProvider("Local Session");
                }
            };
            fetchUser();
        }
    }, [isOpen, apiKey, geminiKey]);

    const handleSave = () => {
        setApiKey(inputKey);
        setGeminiKey(inputGemini);
        onClose();
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Could add toast here, but for now simple action
    };

    const handleSignOut = () => {
        onClose();
        if (onLogout) onLogout();
    };

    if (!isOpen) return null;

    const tabs = [
        { id: 'account', icon: UserCircle, label: 'Account' },
        { id: 'general', icon: Settings, label: 'General' },
        { id: 'restrictions', icon: Lock, label: 'Restrictions' },
        { id: 'help', icon: HelpCircle, label: 'Help' },
        { id: 'legal', icon: FileText, label: 'Legal' },
    ];

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in">
             <div className="glass-panel w-full max-w-4xl rounded-2xl shadow-2xl relative flex flex-col md:flex-row overflow-hidden max-h-[85vh] h-auto my-auto border border-white/10">
                  {/* Sidebar */}
                  <div className="w-full md:w-64 bg-black/40 border-b md:border-b-0 md:border-r border-white/5 p-4 flex flex-col shrink-0">
                      <div className="flex justify-between items-center mb-6">
                          <h2 className="text-xl font-bold text-white flex items-center gap-2">
                              <Settings className="text-red-500" size={24}/> <span>Settings</span>
                          </h2>
                          <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white p-1"><X size={20}/></button>
                      </div>
                      
                      <div className="flex md:flex-col gap-1 flex-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0 hide-scrollbar">
                          {tabs.map(tab => (
                              <button 
                                key={tab.id} 
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-shrink-0 w-auto md:w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                              >
                                  <tab.icon size={18} /> <span>{tab.label}</span>
                              </button>
                          ))}
                      </div>
                      <div className="hidden md:block mt-auto pt-4 border-t border-white/5">
                          <button onClick={handleSignOut} className="flex items-center gap-3 text-sm text-red-400 hover:text-red-300 px-4 py-3 w-full text-left hover:bg-red-900/10 rounded-xl transition-colors">
                              <LogOut size={18}/> Sign Out
                          </button>
                      </div>
                  </div>

                  {/* Content Area */}
                  <div className="flex-1 p-6 md:p-8 bg-[#0a0a0a] relative flex flex-col overflow-y-auto custom-scrollbar">
                      <button onClick={onClose} className="hidden md:block absolute top-6 right-6 text-gray-400 hover:text-white p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"><X size={20}/></button>
                      
                      {activeTab === 'account' && (
                          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 max-w-2xl">
                              <div>
                                <h3 className="text-2xl font-bold text-white mb-6">My Profile</h3>
                                
                                {/* Profile Card */}
                                <div className="flex items-center gap-6 p-6 bg-gradient-to-br from-white/5 to-transparent rounded-2xl border border-white/5 mb-8">
                                    <div className="relative">
                                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-3xl font-bold text-white shrink-0 shadow-xl shadow-red-900/20 border-2 border-white/10">
                                            {profile.avatar ? <img src={profile.avatar} className="w-full h-full object-cover rounded-full" alt="avatar"/> : profile.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 bg-green-500 w-5 h-5 rounded-full border-4 border-[#0a0a0a]"></div>
                                    </div>
                                    <div>
                                        <h4 className="text-2xl font-bold text-white mb-1">{profile.name}</h4>
                                        <p className="text-white/40 text-sm font-medium flex items-center gap-2">
                                            <span className="bg-white/10 px-2 py-0.5 rounded text-xs uppercase tracking-wider">{provider}</span> 
                                            User
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Email */}
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors group">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Mail size={18}/></div>
                                            <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Email Address</span>
                                        </div>
                                        <p className="text-white font-medium truncate" title={userEmail}>{userEmail}</p>
                                    </div>

                                    {/* Join Date */}
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><Calendar size={18}/></div>
                                            <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Member Since</span>
                                        </div>
                                        <p className="text-white font-medium">{joinDate}</p>
                                    </div>

                                    {/* User ID */}
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-400"><Hash size={18}/></div>
                                                <span className="text-xs font-bold text-white/40 uppercase tracking-wider">User ID</span>
                                            </div>
                                            <button onClick={() => copyToClipboard(userId)} className="text-white/20 hover:text-white transition-colors"><Copy size={14}/></button>
                                        </div>
                                        <p className="text-white font-mono text-sm truncate opacity-80">{userId}</p>
                                    </div>

                                    {/* Age & Genres */}
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-pink-500/10 rounded-lg text-pink-400"><User size={18}/></div>
                                            <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Profile Info</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-white font-medium">Age: {profile.age || 'N/A'}</span>
                                            <span className="text-xs bg-white/10 px-2 py-1 rounded text-gray-300">{profile.genres?.length || 0} Genres</span>
                                        </div>
                                    </div>
                                </div>
                              </div>
                              
                              <div className="pt-6 border-t border-white/5">
                                <h4 className="text-sm font-bold text-white mb-3">Preferences</h4>
                                <div className="flex flex-wrap gap-2">
                                    {profile.genres && profile.genres.length > 0 ? profile.genres.map(g => (
                                        <span key={g} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-xs text-gray-300">{g}</span>
                                    )) : <span className="text-gray-500 text-sm italic">No genres selected</span>}
                                </div>
                              </div>

                              <div className="md:hidden pt-4 border-t border-white/5 mt-auto">
                                  <button onClick={handleSignOut} className="flex items-center gap-2 text-sm text-white font-bold w-full justify-center p-4 rounded-xl bg-red-600 shadow-lg shadow-red-900/20 active:scale-95 transition-all">
                                      <LogOut size={18}/> Sign Out
                                  </button>
                              </div>
                          </div>
                      )}

                      {activeTab === 'general' && (
                          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 max-w-xl">
                              <h3 className="text-2xl font-bold text-white mb-6">General Settings</h3>
                              
                              <div className="space-y-4">
                                  <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">TMDB API Key</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1 group">
                                            <input type="password" value={inputKey} onChange={(e) => setInputKey(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 pr-10 text-white focus:border-red-500 focus:bg-white/10 focus:outline-none transition-all text-sm font-mono" placeholder="Enter TMDB Key"/>
                                            {inputKey === DEFAULT_TMDB_KEY && <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" title="Default Key Active"><ShieldCheck size={18}/></div>}
                                        </div>
                                        <button onClick={() => setInputKey(DEFAULT_TMDB_KEY)} className="bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-xl text-gray-400 hover:text-white transition-colors" title="Reset to Default"><RefreshCcw size={20}/></button>
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">Gemini API Key <BrainCircuit size={12} className="text-blue-400"/></label>
                                    <div className="flex gap-2">
                                        <input type="password" value={inputGemini} onChange={(e) => setInputGemini(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-blue-500 focus:bg-white/10 focus:outline-none transition-all text-sm font-mono" placeholder="Enter Gemini Key"/>
                                        <button onClick={() => setInputGemini(DEFAULT_GEMINI_KEY)} className="bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-xl text-gray-400 hover:text-white transition-colors" title="Reset to Default"><RefreshCcw size={20}/></button>
                                    </div>
                                    <p className="text-[10px] text-gray-500">Required for Smart Recommendations and Analytics.</p>
                                  </div>
                              </div>
                              
                              <div className="pt-6">
                                <button onClick={handleSave} className="w-full bg-white text-black font-bold py-4 rounded-xl transition-all hover:bg-gray-200 active:scale-[0.98]">Save Changes</button>
                              </div>
                          </div>
                      )}

                      {activeTab === 'restrictions' && (
                          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 max-w-xl">
                              <h3 className="text-2xl font-bold text-white mb-2">Content Restrictions</h3>
                              <p className="text-sm text-gray-400 mb-6 bg-white/5 p-4 rounded-xl border border-white/5">
                                Set the maximum maturity rating for content displayed in this profile. Titles exceeding this rating will be hidden.
                              </p>
                              
                              <div className="space-y-3">
                                  {['G', 'PG', 'PG-13', 'R', 'NC-17'].map((rate) => (
                                      <button 
                                        key={rate} 
                                        onClick={() => setMaturityRating(rate as MaturityRating)}
                                        className={`w-full flex items-center justify-between p-4 rounded-xl transition-all border ${maturityRating === rate ? 'bg-red-600/20 border-red-500/50 text-white' : 'bg-white/5 border-transparent text-gray-400 hover:text-white hover:bg-white/10'}`}
                                      >
                                          <div className="flex items-center gap-3">
                                              <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold ${maturityRating === rate ? 'bg-red-600 text-white' : 'bg-white/10 text-gray-500'}`}>{rate}</span>
                                              <span className="font-bold text-sm">Rated {rate}</span>
                                          </div>
                                          {maturityRating === rate && <div className="bg-red-600 rounded-full p-1"><Check size={14} className="text-white"/></div>}
                                      </button>
                                  ))}
                              </div>
                          </div>
                      )}

                      {activeTab === 'help' && (
                          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 h-full flex flex-col max-w-xl">
                              <h3 className="text-2xl font-bold text-white mb-6">Help Center</h3>
                              <div className="space-y-6">
                                  <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                                      <h4 className="font-bold text-white mb-4 flex items-center gap-2"><HelpCircle size={18} className="text-yellow-400"/> FAQ</h4>
                                      <ul className="space-y-4 text-sm text-gray-300">
                                          <li className="flex gap-3 items-start">
                                              <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 shrink-0"></div>
                                              <div>
                                                  <span className="text-white font-medium block mb-1">How do I verify my email?</span>
                                                  Check your inbox for a confirmation link. If not found, check spam.
                                              </div>
                                          </li>
                                          <li className="flex gap-3 items-start">
                                              <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 shrink-0"></div>
                                              <div>
                                                  <span className="text-white font-medium block mb-1">Is this service free?</span>
                                                  Yes, this is a demonstration app using public APIs.
                                              </div>
                                          </li>
                                      </ul>
                                  </div>
                                  
                                  <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                                      <h4 className="font-bold text-white text-sm mb-4 flex items-center gap-2"><MessageSquare size={16} className="text-blue-400"/> Contact Support</h4>
                                      <textarea className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl p-4 text-sm text-white focus:border-white/30 focus:outline-none mb-4 resize-none" rows={4} placeholder="Describe your issue..."></textarea>
                                      <button className="w-full bg-white text-black font-bold py-3 rounded-xl transition-all hover:bg-gray-200 flex items-center justify-center gap-2"><Send size={16}/> Send Message</button>
                                  </div>
                              </div>
                          </div>
                      )}

                      {activeTab === 'legal' && (
                          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 h-full flex flex-col max-w-xl">
                              <h3 className="text-2xl font-bold text-white mb-6">Legal & Privacy</h3>
                              <div className="space-y-4 text-sm text-gray-400 leading-relaxed">
                                  <div className="p-6 bg-red-950/20 border border-red-500/20 rounded-2xl">
                                      <h4 className="text-red-400 font-bold mb-3 flex items-center gap-2 text-base"><Shield size={18}/> Disclaimer</h4>
                                      <p>MovieVerse AI acts as a search engine and content aggregator. We do not host any files on our servers. All content is provided by non-affiliated third parties.</p>
                                  </div>
                                  
                                  <div className="p-6 bg-white/5 border border-white/5 rounded-2xl">
                                      <h4 className="text-white font-bold mb-2 text-base">Data Privacy</h4>
                                      <p className="mb-4">We prioritize your privacy. User watchlists and preferences are stored securely. We do not sell your personal data to advertisers.</p>
                                      
                                      <h4 className="text-white font-bold mb-2 text-base">Attribution</h4>
                                      <p>Metadata provided by <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">TMDB</a>. AI services powered by Google Gemini.</p>
                                  </div>

                                  <div className="p-6 bg-white/5 border border-white/5 rounded-2xl">
                                      <h4 className="text-white font-bold mb-2 text-base">Terms of Service</h4>
                                      <p>By using this application, you acknowledge that it is for educational and demonstration purposes. You agree to comply with all local laws regarding copyright and content consumption.</p>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
             </div>
        </div>
    );
};