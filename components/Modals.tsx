import React, { useState, useEffect } from 'react';
import { UserCircle, X, ListPlus, Plus, Check, Loader2, Film, AlertCircle, BrainCircuit, Search, Star, Settings, ShieldCheck, RefreshCcw } from 'lucide-react';
import { UserProfile, Movie, GENRES_LIST, PersonDetails } from '../types';
import { TMDB_BASE_URL, TMDB_IMAGE_BASE } from './Shared';
import { generateSmartRecommendations } from '../services/gemini';

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
      fetch(`${TMDB_BASE_URL}/person/${personId}?api_key=${apiKey}&append_to_response=movie_credits,images`)
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
             <div className="flex flex-col md:flex-row h-full overflow-hidden">
                  <div className="w-full md:w-80 shrink-0 bg-black/40 p-6 md:p-8 overflow-y-auto">
                    <img src={details.profile_path ? `${TMDB_IMAGE_BASE}${details.profile_path}` : "https://placehold.co/300x450/333/FFF?text=No+Image"} alt={details.name} className="w-full rounded-xl shadow-lg border border-white/10 mb-4" />
                    <div className="space-y-3">
                      <div className="glass p-3 rounded-xl text-sm"><span className="text-white/40 block text-[10px] uppercase font-bold tracking-wider mb-1">Born</span><span className="text-white font-medium">{details.birthday || 'N/A'}</span></div>
                      <div className="glass p-3 rounded-xl text-sm"><span className="text-white/40 block text-[10px] uppercase font-bold tracking-wider mb-1">Place</span><span className="text-white font-medium">{details.place_of_birth || 'N/A'}</span></div>
                    </div>
                  </div>
                  <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar bg-[#0f0f0f]/50">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">{details.name}</h2>
                    <p className="text-red-400 text-sm font-bold tracking-wider mb-6">{details.known_for_department}</p>
                    
                    <h3 className="text-white font-bold text-sm mb-2 uppercase tracking-wide opacity-70">Biography</h3>
                    <p className="text-gray-300 text-sm leading-relaxed mb-8 whitespace-pre-line">{details.biography || "No biography available."}</p>
                    
                    <h3 className="text-white font-bold text-sm mb-4 uppercase tracking-wide opacity-70 flex items-center gap-2"><Film size={14} className="text-red-500"/> Known For</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {details.movie_credits?.cast?.sort((a: any,b: any) => b.popularity - a.popularity).slice(0, 9).map(movie => (
                          <div key={movie.id} onClick={() => onMovieClick(movie)} className="cursor-pointer group">
                            <div className="aspect-[2/3] rounded-lg overflow-hidden mb-2 relative border border-white/5"><img src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : "https://placehold.co/100x150"} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={movie.title} /></div>
                            <p className="text-xs font-medium text-gray-300 truncate group-hover:text-white transition-colors">{movie.title}</p>
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

// SETTINGS MODAL
interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    apiKey: string;
    setApiKey: (key: string) => void;
    geminiKey: string;
    setGeminiKey: (key: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, apiKey, setApiKey, geminiKey, setGeminiKey }) => {
    const [inputKey, setInputKey] = useState(apiKey || "");
    const [inputGemini, setInputGemini] = useState(geminiKey || "");
    
    // Hardcoded defaults for demo convenience if user wants to reset
    const DEFAULT_TMDB_KEY = "fe42b660a036f4d6a2bfeb4d0f523ce9";
    const DEFAULT_GEMINI_KEY = "AIzaSyBGy80BBep7qmkqc0Wqt9dr-gMYs8X2mzo";

    useEffect(() => {
        if (isOpen) {
            setInputKey(apiKey || "");
            setInputGemini(geminiKey || "");
        }
    }, [isOpen, apiKey, geminiKey]);

    const handleSave = () => {
        setApiKey(inputKey);
        setGeminiKey(inputGemini);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in">
             <div className="glass-panel w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
                  <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20}/></button>
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                      <Settings className="text-red-500"/> App Settings
                  </h2>
                  
                  <div className="space-y-6">
                      {/* TMDB Key */}
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">TMDB API Key</label>
                          <div className="flex gap-2">
                              <div className="relative flex-1">
                                  <input 
                                      type="password" 
                                      value={inputKey} 
                                      onChange={(e) => setInputKey(e.target.value)} 
                                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pr-10 text-white focus:border-red-500 focus:outline-none transition-all text-sm font-mono"
                                      placeholder="Enter TMDB Key"
                                  />
                                  {inputKey === DEFAULT_TMDB_KEY && <ShieldCheck size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" title="Default Key Active"/>}
                              </div>
                              <button onClick={() => setInputKey(DEFAULT_TMDB_KEY)} className="bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded-xl text-gray-400 hover:text-white transition-colors" title="Use Default"><RefreshCcw size={18}/></button>
                          </div>
                      </div>

                      {/* Gemini Key */}
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Gemini API Key</label>
                           <div className="flex gap-2">
                              <input 
                                  type="password" 
                                  value={inputGemini} 
                                  onChange={(e) => setInputGemini(e.target.value)} 
                                  className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-red-500 focus:outline-none transition-all text-sm font-mono"
                                  placeholder="Enter Gemini Key"
                              />
                               <button onClick={() => setInputGemini(DEFAULT_GEMINI_KEY)} className="bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded-xl text-gray-400 hover:text-white transition-colors" title="Clear/Default"><RefreshCcw size={18}/></button>
                           </div>
                           <p className="text-[10px] text-gray-500">Required for Smart Search, AI Trivia, and Personality Analysis.</p>
                      </div>
                  </div>

                  <button onClick={handleSave} className="w-full mt-8 bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-red-900/20 active:scale-[0.98]">
                      Save Configuration
                  </button>
             </div>
        </div>
    );
};