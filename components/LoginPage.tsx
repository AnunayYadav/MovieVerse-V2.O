
import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Loader2, User, Calendar, ArrowRight, ChevronLeft, AlertTriangle, Check, Sparkles } from 'lucide-react';
import { TMDB_IMAGE_BASE, BrandLogo } from './Shared';
import { GENRES_LIST, UserProfile } from '../types';
import { signInWithGoogle, signInWithEmail, signUpWithEmail, getSupabase } from '../services/supabase';

// High-quality posters for the background wall
const BACKGROUND_POSTERS = [
  "/qJ2tW6WMUDux911r6m7haRef0WH.jpg", "/saHP97rTPS5eLmrLQEcANmKrsFl.jpg",
  "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg", "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
  "/sF1U4EUQS8YHUYjNl3pTXMYjj9s.jpg", "/ow3wq89wM8qd5X7hWKxiRfsFf9C.jpg",
  "/bMadFzhjy9T7R8J48QGq1ngWQq.jpg",  "/1E5baAaEse26fej7uHcjOgEE2t2.jpg",
  "/8UlWHLMpgZm9bx6QYh0NFoq67TZ.jpg", "/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg",
  "/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg", "/arw2vcBveWOVZr6pxd9KKvuNyLO.jpg",
  "/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg", "/u3bZgnGQ9TWA758r8vn0qHnDEnO.jpg",
  "/rCzpDGLbOoPwLjy3vpX3uzwwkAK.jpg", "/z2yahl2uefxDCl0nogcRBstwruJ.jpg",
  "/qJ2tW6WMUDux911r6m7haRef0WH.jpg", "/saHP97rTPS5eLmrLQEcANmKrsFl.jpg",
  "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg", "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
  "/sF1U4EUQS8YHUYjNl3pTXMYjj9s.jpg", "/ow3wq89wM8qd5X7hWKxiRfsFf9C.jpg",
  "/bMadFzhjy9T7R8J48QGq1ngWQq.jpg",  "/1E5baAaEse26fej7uHcjOgEE2t2.jpg",
  // Duplicates for seamless looping density
  "/qJ2tW6WMUDux911r6m7haRef0WH.jpg", "/saHP97rTPS5eLmrLQEcANmKrsFl.jpg",
  "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg", "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
  "/sF1U4EUQS8YHUYjNl3pTXMYjj9s.jpg", "/ow3wq89wM8qd5X7hWKxiRfsFf9C.jpg",
  "/bMadFzhjy9T7R8J48QGq1ngWQq.jpg",  "/1E5baAaEse26fej7uHcjOgEE2t2.jpg",
];

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
    <div className="fixed inset-0 z-[100] bg-[#050505] flex items-center justify-center overflow-hidden font-sans text-white selection:bg-red-500/30">
      
      {/* Moving Background Wall - Angled and animated */}
      <div className="absolute inset-[-50%] w-[200%] h-[200%] bg-black -rotate-12 opacity-30 pointer-events-none select-none overflow-hidden">
        <div className="flex flex-wrap justify-center gap-6 animate-wall-scroll">
             {/* Repeat array multiple times for density */}
             {[...BACKGROUND_POSTERS, ...BACKGROUND_POSTERS, ...BACKGROUND_POSTERS, ...BACKGROUND_POSTERS].map((poster, i) => (
               <div key={i} className="w-48 aspect-[2/3] rounded-xl overflow-hidden bg-white/5 relative grayscale hover:grayscale-0 transition-all duration-700 ease-out hover:scale-105 shadow-2xl">
                  <img 
                    src={`${TMDB_IMAGE_BASE}${poster}`} 
                    className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity" 
                    alt="" 
                    loading="lazy"
                  />
               </div>
             ))}
        </div>
      </div>
      
      {/* Heavy Vignette for Focus */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050505_90%)]" />
      
      {/* Aesthetic Glass Card */}
      <div className="relative z-10 w-full max-w-[420px] p-6 animate-in fade-in zoom-in-95 duration-700">
         <div className="backdrop-blur-3xl bg-black/40 border border-white/10 rounded-3xl p-8 shadow-[0_0_100px_rgba(220,38,38,0.1)] relative overflow-hidden group">
            
            {/* Subtle light sheen */}
            <div className="absolute -inset-[100%] bg-gradient-to-r from-transparent via-white/5 to-transparent rotate-45 pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center">
                {/* Logo & Header */}
                <div className="mb-8 text-center">
                   <div className="inline-flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-500">
                      <BrandLogo size={40} className="text-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.6)]" />
                   </div>
                   <h1 className="text-2xl font-bold tracking-tight text-white">
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
                    <>
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
                                    className="w-full h-12 bg-white/5 border border-white/5 rounded-xl pl-12 pr-4 text-white text-sm focus:outline-none focus:bg-white/10 focus:border-red-500/50 transition-all placeholder-white/20"
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
                                    className="w-full h-12 bg-white/5 border border-white/5 rounded-xl pl-12 pr-12 text-white text-sm focus:outline-none focus:bg-white/10 focus:border-red-500/50 transition-all placeholder-white/20"
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
                    </>
                ) : signupStep === 1 ? (
                    // SIGNUP STEP 1
                    <form onSubmit={handleSignupStep1} className="space-y-4 animate-in fade-in slide-in-from-right-8">
                        <div className="group relative">
                           <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white transition-colors" />
                           <input 
                              type="text" 
                              required
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder="Full Name" 
                              className="w-full h-12 bg-white/5 border border-white/5 rounded-xl pl-12 pr-4 text-white text-sm focus:outline-none focus:bg-white/10 focus:border-red-500/50 transition-all placeholder-white/20"
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
                              className="w-full h-12 bg-white/5 border border-white/5 rounded-xl pl-12 pr-4 text-white text-sm focus:outline-none focus:bg-white/10 focus:border-red-500/50 transition-all placeholder-white/20"
                           />
                        </div>

                        <div className="group relative">
                           <input 
                              type={showPassword ? "text" : "password"} 
                              required
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Create Password" 
                              className="w-full h-12 bg-white/5 border border-white/5 rounded-xl pl-4 pr-12 text-white text-sm focus:outline-none focus:bg-white/10 focus:border-red-500/50 transition-all placeholder-white/20"
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
                    <form onSubmit={handleSignupComplete} className="space-y-6 animate-in fade-in slide-in-from-right-8">
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
                                  className="w-full h-12 bg-white/5 border border-white/5 rounded-xl pl-12 pr-4 text-white text-sm focus:outline-none focus:bg-white/10 focus:border-red-500/50 transition-all placeholder-white/20"
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
                                       className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border flex items-center gap-1.5 ${selectedGenres.includes(genre) ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-900/20' : 'bg-white/5 border-white/5 text-gray-400 hover:border-white/20 hover:text-white'}`}
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
      
      {/* Minimal Aesthetic Footer */}
      <div className="absolute bottom-6 text-center w-full z-10 pointer-events-none">
          <p className="text-white/10 text-[10px] font-bold tracking-[0.3em] uppercase">MovieVerse AI © 2025</p>
      </div>

      <style>{`
        @keyframes scroll {
            0% { transform: translateY(0); }
            100% { transform: translateY(-50%); }
        }
        .animate-wall-scroll {
            animation: scroll 120s linear infinite;
        }
      `}</style>
    </div>
  );
};
