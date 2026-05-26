
import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Loader2, User, Calendar, ArrowRight, ChevronLeft, AlertTriangle, Check, Sparkles } from 'lucide-react';
import { TMDB_IMAGE_BASE, BrandLogo, getTmdbKey } from './Shared';
import { GENRES_LIST, UserProfile } from '../types';
import { signInWithGoogle, signInWithEmail, signUpWithEmail, getSupabase } from '../services/supabase';

// High-quality fallback posters (classic films with verified active poster paths)
const FALLBACK_POSTERS = [
  "/qJ2tW6WMUDux911r6m7haRef0WH.jpg", // The Godfather
  "/rCzpDGLbOoPwLjy3vpX3uzwwkAK.jpg", // Pulp Fiction
  "/arw2vcBveWOVZr6pxd9KKvuNyLO.jpg", // Interstellar
  "/ow3wq89wM8qd5X7hWKxiRfsFf9C.jpg", // The Dark Knight
  "/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg", // The Shawshank Redemption
  "/saHP97rTPS5eLmrLQEcANmKrsFl.jpg", // Forrest Gump
  "/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg", // Fight Club
  "/u3bZgnGQ9TWA758r8vn0qHnDEnO.jpg", // Inception
  "/z2yahl2uefxDCl0nogcRBstwruJ.jpg", // The Lord of the Rings
  "/bMadFzhjy9T7R8J48QGq1ngWQq.jpg",  // Spirited Away
  "/1E5baAaEse26fej7uHcjOgEE2t2.jpg",  // Gladiator
  "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg"   // Fight Club alt
];

const splitPosters = (list: string[], colIndex: number) => {
  return list.filter((_, idx) => idx % 3 === colIndex);
};

interface LoginPageProps {
  onLogin: (profile?: UserProfile) => void;
  onOpenSettings: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onOpenSettings }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Login Form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Signup Flow State
  const [signupStep, setSignupStep] = useState(1); // 1: Account, 2: Preferences
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  // Dynamic poster columns state
  const [col1, setCol1] = React.useState<string[]>(() => splitPosters(FALLBACK_POSTERS, 0));
  const [col2, setCol2] = React.useState<string[]>(() => splitPosters(FALLBACK_POSTERS, 1));
  const [col3, setCol3] = React.useState<string[]>(() => splitPosters(FALLBACK_POSTERS, 2));

  React.useEffect(() => {
    let isMounted = true;
    const key = getTmdbKey() || localStorage.getItem('movieverse_tmdb_key');
    if (!key) return;

    Promise.all([
      fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=${key}`).then(res => res.ok ? res.json() : null),
      fetch(`https://api.themoviedb.org/3/movie/top_rated?api_key=${key}`).then(res => res.ok ? res.json() : null),
      fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${key}`).then(res => res.ok ? res.json() : null)
    ]).then(([trending, topRated, popular]) => {
      if (!isMounted) return;
      const allMovies = [
        ...(trending?.results || []),
        ...(topRated?.results || []),
        ...(popular?.results || [])
      ];
      // Extract unique poster paths
      const paths = Array.from(new Set(allMovies.map(m => m.poster_path).filter(Boolean))) as string[];
      if (paths.length >= 12) {
        // Shuffle paths
        const shuffled = paths.sort(() => 0.5 - Math.random());
        const c1: string[] = [];
        const c2: string[] = [];
        const c3: string[] = [];
        shuffled.forEach((p, idx) => {
          if (idx % 3 === 0) c1.push(p);
          else if (idx % 3 === 1) c2.push(p);
          else c3.push(p);
        });
        setCol1(c1.slice(0, 10));
        setCol2(c2.slice(0, 10));
        setCol3(c3.slice(0, 10));
      }
    }).catch(err => {
      console.warn("Dynamic posters load failed, using fallback.", err);
    });

    return () => {
      isMounted = false;
    };
  }, []);
  
  // Settings check
  const supabase = getSupabase();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    if (supabase) {
        try {
            await signInWithEmail(email, password);
            onLogin(); 
        } catch (e: any) {
            setErrorMsg(e.message || "Login failed");
            setLoading(false);
        }
    } else {
        setTimeout(() => {
            setLoading(false);
            onLogin();
        }, 1000);
    }
  };

  const handleSignupStep1 = (e: React.FormEvent) => {
      e.preventDefault();
      setSignupStep(2);
  };

  const handleSignupComplete = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setErrorMsg("");
      
      const profile: UserProfile = { name, age, genres: selectedGenres };

      if (supabase) {
          try {
             await signUpWithEmail(email, password, { profile });
             onLogin(profile);
          } catch (e: any) {
             setErrorMsg(e.message || "Signup failed");
             setLoading(false);
          }
      } else {
          setTimeout(() => {
              onLogin(profile);
          }, 1000);
      }
  };

  const handleGoogleLogin = async () => {
    if (!supabase) {
        setErrorMsg("Configure Supabase in Settings first.");
        return;
    }
    setLoading(true);
    try {
        await signInWithGoogle();
    } catch (e: any) {
        setErrorMsg(e.message || "Google Login Error");
        setLoading(false);
    }
  };

  const toggleGenre = (genre: string) => {
      setSelectedGenres(prev => 
          prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
      );
  };

  const resetState = (toLogin: boolean) => {
      setIsLogin(toLogin);
      setSignupStep(1);
      setEmail("");
      setPassword("");
      setName("");
      setAge("");
      setSelectedGenres([]);
      setErrorMsg("");
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#050505] flex flex-col lg:flex-row overflow-hidden font-sans text-white select-none selection:bg-red-500/30">
      
      {/* Left Side: Login / Signup Form */}
      <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col items-center justify-center p-6 md:p-12 z-20 bg-[#050505]/95 lg:bg-[#050505] border-r border-white/5 relative h-full shrink-0 backdrop-blur-md lg:backdrop-blur-none">
        
        {/* Mobile background only - subtle vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent lg:hidden pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050505_90%)] lg:hidden pointer-events-none" />

        {/* Floating Form Container */}
        <div className="relative z-10 w-full max-w-[400px] p-4 animate-in fade-in zoom-in-95 duration-700">
         <div className="relative overflow-hidden group">
            <div className="relative z-10 flex flex-col items-center">
                {/* Logo & Header */}
                <div className="mb-8 text-center">
                   <div className="inline-flex items-center justify-center mb-5 hover:scale-105 transition-transform duration-500">
                      <BrandLogo size={64} className="text-red-600" />
                   </div>
                   <h1 className="text-3xl font-black tracking-tight text-white mt-1">
                       {isLogin ? "Welcome Back" : "Join MovieVerse"}
                   </h1>
                   <p className="text-white/40 text-xs mt-2 font-medium tracking-wide">
                       {isLogin ? "Enter your personal cinema universe." : "Start your cinematic journey today."}
                   </p>
                </div>

                {errorMsg && (
                    <div className="w-full bg-red-500/10 border border-red-500/20 text-red-200 text-xs font-medium p-3 rounded-xl mb-6 flex items-center gap-2 animate-in slide-in-from-top-1">
                        <AlertTriangle size={14}/> {errorMsg}
                    </div>
                )}
                
                {/* Back Button for Signup Step 2 */}
                {!isLogin && signupStep > 1 && (
                    <button onClick={() => setSignupStep(signupStep - 1)} className="absolute top-8 left-8 text-white/30 hover:text-white transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                )}

                <div className="w-full">
                {isLogin ? (
                    // LOGIN FORM
                    <div key="login-section" className="space-y-4 animate-slide-left">
                        <button 
                           onClick={handleGoogleLogin}
                           className={`w-full bg-white text-black font-bold text-sm h-12 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-200 transition-all active:scale-[0.98] mb-6 shadow-lg shadow-white/5 ${!supabase ? 'opacity-50 cursor-not-allowed' : ''}`}
                           disabled={!supabase || loading}
                        >
                           {loading ? <Loader2 className="animate-spin text-gray-600" size={18}/> : (
                               <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path></svg>
                           )}
                           Continue with Google
                        </button>

                        <div className="relative flex items-center gap-3 mb-6">
                           <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent flex-1"></div>
                           <span className="text-[10px] text-white/20 uppercase tracking-widest font-medium">Or continue with email</span>
                           <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent flex-1"></div>
                        </div>

                        <form onSubmit={handleLoginSubmit} className="space-y-4">
                            <div className="group relative">
                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white transition-colors" />
                                <input 
                                    type="email" 
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Email address" 
                                    className="w-full h-12 bg-white/5 border-none rounded-xl pl-12 pr-4 text-white text-sm focus:outline-none focus:bg-white/10 focus:ring-1 focus:ring-red-600/30 transition-all placeholder-white/20"
                                />
                            </div>

                            <div className="group relative">
                                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white transition-colors" />
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Password" 
                                    className="w-full h-12 bg-white/5 border-none rounded-xl pl-12 pr-12 text-white text-sm focus:outline-none focus:bg-white/10 focus:ring-1 focus:ring-red-600/30 transition-all placeholder-white/20"
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            <button 
                              type="submit" 
                              disabled={loading}
                              className="w-full h-12 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white text-sm font-bold tracking-wide rounded-xl shadow-lg shadow-red-900/30 transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2 group"
                            >
                              {loading ? <Loader2 className="animate-spin" size={20}/> : <>Sign In <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/></>}
                            </button>
                        </form>
                    </div>
                ) : signupStep === 1 ? (
                    // SIGNUP STEP 1
                    <form key="signup-step-1" onSubmit={handleSignupStep1} className="space-y-4 animate-slide-right">
                        <div className="group relative">
                           <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white transition-colors" />
                           <input 
                              type="text" 
                              required
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder="Full Name" 
                              className="w-full h-12 bg-white/5 border-none rounded-xl pl-12 pr-4 text-white text-sm focus:outline-none focus:bg-white/10 focus:ring-1 focus:ring-red-600/30 transition-all placeholder-white/20"
                           />
                        </div>
                        
                        <div className="group relative">
                           <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white transition-colors" />
                           <input 
                              type="email" 
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="Email address" 
                              className="w-full h-12 bg-white/5 border-none rounded-xl pl-12 pr-4 text-white text-sm focus:outline-none focus:bg-white/10 focus:ring-1 focus:ring-red-600/30 transition-all placeholder-white/20"
                           />
                        </div>

                        <div className="group relative">
                           <input 
                              type={showPassword ? "text" : "password"} 
                              required
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Create Password" 
                              className="w-full h-12 bg-white/5 border-none rounded-xl pl-4 pr-12 text-white text-sm focus:outline-none focus:bg-white/10 focus:ring-1 focus:ring-red-600/30 transition-all placeholder-white/20"
                           />
                           <button 
                             type="button"
                             onClick={() => setShowPassword(!showPassword)}
                             className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                           >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                           </button>
                        </div>

                        <button 
                          type="submit" 
                          className="w-full h-12 bg-white text-black font-bold text-sm rounded-xl hover:bg-gray-200 transition-all active:scale-[0.98] mt-2 flex items-center justify-center gap-2 group"
                        >
                          Next Step <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/>
                        </button>
                    </form>
                ) : (
                    // SIGNUP STEP 2
                    <form key="signup-step-2" onSubmit={handleSignupComplete} className="space-y-6 animate-slide-right">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider ml-1">Your Age</label>
                            <div className="group relative">
                               <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white transition-colors" />
                               <input 
                                  type="number" 
                                  required
                                  min="10"
                                  max="120"
                                  value={age}
                                  onChange={(e) => setAge(e.target.value)}
                                  placeholder="e.g. 24" 
                                  className="w-full h-12 bg-white/5 border-none rounded-xl pl-12 pr-4 text-white text-sm focus:outline-none focus:bg-white/10 focus:ring-1 focus:ring-red-600/30 transition-all placeholder-white/20"
                               />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider ml-1 flex items-center gap-2">
                                Favorite Genres <span className={`text-[9px] px-1.5 py-0.5 rounded ${selectedGenres.length >= 3 ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/50'}`}>{selectedGenres.length}/3</span>
                            </label>
                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar p-1">
                                 {GENRES_LIST.map(genre => (
                                     <button 
                                       type="button"
                                       key={genre}
                                       onClick={() => toggleGenre(genre)}
                                       className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${selectedGenres.includes(genre) ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                                     >
                                         {genre}
                                         {selectedGenres.includes(genre) && <Check size={10}/>}
                                     </button>
                                 ))}
                            </div>
                        </div>

                        <button 
                          type="submit" 
                          disabled={loading || selectedGenres.length < 3}
                          className="w-full h-12 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 disabled:from-white/10 disabled:to-white/10 disabled:text-gray-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-red-900/30 transition-all active:scale-[0.98] mt-2 flex items-center justify-center gap-2"
                        >
                          {loading ? <Loader2 className="animate-spin" size={20}/> : <><Sparkles size={18}/> Complete Setup</>}
                        </button>
                    </form>
                )}
                </div>

                <div className="mt-8 text-center">
                    <p className="text-white/30 text-xs font-medium">
                       {isLogin ? "New here? " : "Already have an account? "}
                       <button 
                         type="button"
                         onClick={() => resetState(!isLogin)}
                         className="text-white hover:text-red-400 transition-colors ml-1 font-bold"
                       >
                          {isLogin ? "Create Account" : "Log In"}
                       </button>
                    </p>
                    
                    {/* Guest access hint */}
                    <div className="mt-6 pt-4 border-t border-white/5 flex justify-center">
                       <p className="text-[10px] text-white/20 flex items-center gap-1">
                         Try guest mode? 
                         {!supabase && (
                            <button onClick={onOpenSettings} className="text-white/40 hover:text-white transition-colors underline decoration-white/20">
                                Configure Database
                            </button>
                         )}
                       </p>
                    </div>
                </div>
            </div>
         </div>
      </div>
      </div>

      {/* Right Side: Three Column Moving Film Posters */}
      <div className="absolute lg:relative inset-0 lg:inset-auto flex-1 h-full bg-[#030303]/40 lg:bg-[#030303] overflow-hidden flex justify-center items-center gap-4 lg:gap-6 p-4 lg:p-8 opacity-25 lg:opacity-100 z-0 lg:z-10">
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-10" />
        
        {/* Vignette shadows */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-transparent to-[#050505] pointer-events-none z-10 hidden lg:block" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-transparent to-[#050505] pointer-events-none z-10" />

        {/* Column 1 (Scrolls Up) */}
        <div className="w-[30%] h-[150%] flex flex-col overflow-hidden select-none pointer-events-none">
            <div className="flex flex-col animate-scroll-up">
                <div className="flex flex-col gap-4 lg:gap-6 pb-4 lg:pb-6">
                    {col1.map((poster, i) => (
                        <div key={`col1-1-${i}`} className="w-full aspect-[2/3] rounded-xl lg:rounded-2xl overflow-hidden shadow-2xl bg-white/5 relative border border-white/5 hover:border-red-500/30 hover:scale-[1.03] transition-all duration-500">
                            <img src={`${TMDB_IMAGE_BASE}${poster}`} className="w-full h-full object-cover opacity-80" alt="" loading="lazy" />
                        </div>
                    ))}
                </div>
                <div className="flex flex-col gap-4 lg:gap-6 pb-4 lg:pb-6">
                    {col1.map((poster, i) => (
                        <div key={`col1-2-${i}`} className="w-full aspect-[2/3] rounded-xl lg:rounded-2xl overflow-hidden shadow-2xl bg-white/5 relative border border-white/5 hover:border-red-500/30 hover:scale-[1.03] transition-all duration-500">
                            <img src={`${TMDB_IMAGE_BASE}${poster}`} className="w-full h-full object-cover opacity-80" alt="" loading="lazy" />
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Column 2 (Scrolls Down) */}
        <div className="w-[30%] h-[150%] flex flex-col overflow-hidden select-none pointer-events-none">
            <div className="flex flex-col animate-scroll-down">
                <div className="flex flex-col gap-4 lg:gap-6 pb-4 lg:pb-6">
                    {col2.map((poster, i) => (
                        <div key={`col2-1-${i}`} className="w-full aspect-[2/3] rounded-xl lg:rounded-2xl overflow-hidden shadow-2xl bg-white/5 relative border border-white/5 hover:border-red-500/30 hover:scale-[1.03] transition-all duration-500">
                            <img src={`${TMDB_IMAGE_BASE}${poster}`} className="w-full h-full object-cover opacity-80" alt="" loading="lazy" />
                        </div>
                    ))}
                </div>
                <div className="flex flex-col gap-4 lg:gap-6 pb-4 lg:pb-6">
                    {col2.map((poster, i) => (
                        <div key={`col2-2-${i}`} className="w-full aspect-[2/3] rounded-xl lg:rounded-2xl overflow-hidden shadow-2xl bg-white/5 relative border border-white/5 hover:border-red-500/30 hover:scale-[1.03] transition-all duration-500">
                            <img src={`${TMDB_IMAGE_BASE}${poster}`} className="w-full h-full object-cover opacity-80" alt="" loading="lazy" />
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Column 3 (Scrolls Up) */}
        <div className="w-[30%] h-[150%] flex flex-col overflow-hidden select-none pointer-events-none">
            <div className="flex flex-col animate-scroll-up-slow">
                <div className="flex flex-col gap-4 lg:gap-6 pb-4 lg:pb-6">
                    {col3.map((poster, i) => (
                        <div key={`col3-1-${i}`} className="w-full aspect-[2/3] rounded-xl lg:rounded-2xl overflow-hidden shadow-2xl bg-white/5 relative border border-white/5 hover:border-red-500/30 hover:scale-[1.03] transition-all duration-500">
                            <img src={`${TMDB_IMAGE_BASE}${poster}`} className="w-full h-full object-cover opacity-80" alt="" loading="lazy" />
                        </div>
                    ))}
                </div>
                <div className="flex flex-col gap-4 lg:gap-6 pb-4 lg:pb-6">
                    {col3.map((poster, i) => (
                        <div key={`col3-2-${i}`} className="w-full aspect-[2/3] rounded-xl lg:rounded-2xl overflow-hidden shadow-2xl bg-white/5 relative border border-white/5 hover:border-red-500/30 hover:scale-[1.03] transition-all duration-500">
                            <img src={`${TMDB_IMAGE_BASE}${poster}`} className="w-full h-full object-cover opacity-80" alt="" loading="lazy" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
      
      {/* Minimal Aesthetic Footer */}
      <div className="absolute bottom-6 left-0 lg:w-[45%] xl:w-[40%] text-center w-full z-20 pointer-events-none hidden lg:block">
          <p className="text-white/10 text-[10px] font-bold tracking-[0.3em] uppercase">MovieVerse AI © 2025</p>
      </div>

      <style>{`
        @keyframes scrollUp {
            0% { transform: translateY(0); }
            100% { transform: translateY(-50%); }
        }
        @keyframes scrollDown {
            0% { transform: translateY(-50%); }
            100% { transform: translateY(0); }
        }
        .animate-scroll-up {
            animation: scrollUp 45s linear infinite;
        }
        .animate-scroll-down {
            animation: scrollDown 45s linear infinite;
        }
        .animate-scroll-up-slow {
            animation: scrollUp 55s linear infinite;
        }
        @keyframes fadeInSlideLeft {
            0% { opacity: 0; transform: translateX(-20px); }
            100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInSlideRight {
            0% { opacity: 0; transform: translateX(20px); }
            100% { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-left {
            animation: fadeInSlideLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-slide-right {
            animation: fadeInSlideRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};
