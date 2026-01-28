
import React, { useState } from 'react';
import { BarChart3, PieChart, BrainCircuit, Sparkles, User, Lightbulb, Users, Loader2, Calendar, Film } from 'lucide-react';
import { Movie, AIAnalysisResult } from '../types';
import { generateMovieAnalysis } from '../services/gemini';
import { TMDB_IMAGE_BASE, TMDB_BASE_URL } from './Shared';

interface AnalyticsProps {
    watchedMovies: Movie[];
    watchlist: Movie[];
    favorites: Movie[];
    apiKey: string;
    onMovieClick: (m: Movie) => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsProps> = ({ watchedMovies, watchlist, favorites, apiKey, onMovieClick }) => {
    const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
    const [loadingAi, setLoadingAi] = useState(false);
  
    // Basic Stats
    const totalMovies = watchedMovies.length;
    const totalMinutes = watchedMovies.reduce((acc, m) => acc + (m.runtime || 120), 0);
    const totalHours = Math.floor(totalMinutes / 60);
  
    // Genre Stats
    const genreCounts: Record<string, number> = {};
    watchedMovies.forEach(m => {
        if (m.genres) {
            m.genres.forEach(g => {
                const name = typeof g === 'string' ? g : g.name;
                if (name) genreCounts[name] = (genreCounts[name] || 0) + 1;
            });
        }
    });
  
    const sortedGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);
    const topGenre = sortedGenres.length > 0 ? sortedGenres[0][0] : "Undetermined";
  
    const handleAiAnalysis = async () => {
        setLoadingAi(true);
        
        const watchedTitles = watchedMovies.map(m => m.title).slice(0, 20).join(", "); 
        const favTitles = favorites.map(m => m.title).slice(0, 15).join(", ");
        const watchlistTitles = watchlist.map(m => m.title).slice(0, 15).join(", ");
  
        try {
            const result = await generateMovieAnalysis(watchedTitles, favTitles, watchlistTitles);
            
            // Hydrate Recommendations
            if (result.recommendations) {
                const recPromises = result.recommendations.map(title => 
                    fetch(`${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(title)}`)
                    .then(r => { if(!r.ok) throw new Error("Fetch failed"); return r.json(); })
                    .then(d => d.results?.[0])
                    .catch(() => null) // Catch individual errors so Promise.all doesn't fail
                );
                const recs = await Promise.all(recPromises);
                result.enrichedRecs = recs.filter(Boolean);
            }
  
            // Hydrate Future Radar
            if (result.future_radar) {
                const futPromises = result.future_radar.map(title => 
                    fetch(`${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(title)}`)
                    .then(r => { if(!r.ok) throw new Error("Fetch failed"); return r.json(); })
                    .then(d => d.results?.[0])
                    .catch(() => null)
                );
                const futs = await Promise.all(futPromises);
                result.enrichedFuture = futs.filter(Boolean);
            }
  
            setAiAnalysis(result);
        } catch(e) {
            console.error("Analytics Error", e);
        }
        setLoadingAi(false);
    };
  
    return (
        <div className="p-8 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                <BarChart3 className="text-red-500"/> CineAnalytics
            </h2>
  
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-900 border border-red-900/50 p-6 rounded-2xl">
                    <p className="text-gray-500 text-xs uppercase font-bold mb-1">Total Watched</p>
                    <p className="text-4xl font-bold text-white">{totalMovies} <span className="text-lg text-red-600">movies</span></p>
                </div>
                <div className="bg-gray-900 border border-red-900/50 p-6 rounded-2xl">
                    <p className="text-gray-500 text-xs uppercase font-bold mb-1">Time Invested</p>
                    <p className="text-4xl font-bold text-white">{totalHours} <span className="text-lg text-red-600">hours</span></p>
                </div>
                <div className="bg-gray-900 border border-red-900/50 p-6 rounded-2xl">
                    <p className="text-gray-500 text-xs uppercase font-bold mb-1">Top Genre</p>
                    <p className="text-4xl font-bold text-red-400">{topGenre}</p>
                </div>
            </div>
  
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Genre Chart */}
                <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2"><PieChart size={18}/> Genre Breakdown</h3>
                    <div className="space-y-3">
                        {sortedGenres.slice(0, 5).map(([genre, count]) => (
                            <div key={genre}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-300">{genre}</span>
                                    <span className="text-gray-500">{Math.round((count / totalMovies) * 100)}%</span>
                                </div>
                                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-gradient-to-r from-red-600 to-red-900"
                                      style={{ width: `${(count / totalMovies) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                        {sortedGenres.length === 0 && <p className="text-gray-500 text-sm">Watch movies to see stats.</p>}
                    </div>
                </div>
  
                {/* AI Insights Box */}
                <div className="bg-gradient-to-br from-red-900/20 to-black/20 border border-red-500/50 p-6 rounded-2xl">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2"><BrainCircuit size={18} className="text-red-400"/> AI Analyst</h3>
                    
                    {!aiAnalysis && !loadingAi && (
                        <div className="text-center py-12">
                            <p className="text-gray-400 text-sm mb-4">Unlock deep insights into your viewing psychology.</p>
                            <button 
                              onClick={handleAiAnalysis} 
                              className="bg-red-600 text-white font-bold py-3 px-8 rounded-full hover:bg-red-700 transition-colors flex items-center gap-2 mx-auto active:scale-95 shadow-lg shadow-red-900/40"
                            >
                                <Sparkles size={16}/> Generate Full Report
                            </button>
                        </div>
                    )}

                    {loadingAi && (
                        <div className="py-8 space-y-4">
                            <div className="h-6 w-1/3 bg-white/10 rounded animate-pulse mb-6"></div>
                            <div className="space-y-2">
                                <div className="h-4 w-full bg-white/10 rounded animate-pulse"></div>
                                <div className="h-4 w-5/6 bg-white/10 rounded animate-pulse"></div>
                                <div className="h-4 w-4/6 bg-white/10 rounded animate-pulse"></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-6">
                                <div className="h-20 bg-white/10 rounded-lg animate-pulse"></div>
                                <div className="h-20 bg-white/10 rounded-lg animate-pulse"></div>
                            </div>
                            <p className="text-center text-xs text-red-400 font-bold tracking-widest uppercase animate-pulse pt-4">Analyzing patterns...</p>
                        </div>
                    )}

                    {aiAnalysis && (
                        <div className="space-y-5 animate-in fade-in">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-500 text-xs uppercase font-bold">Your Persona</p>
                                    <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-white">{aiAnalysis.persona}</p>
                                </div>
                                <div className="bg-white/10 p-2 rounded-lg">
                                    <User size={24} className="text-red-300"/>
                                </div>
                            </div>
                            
                            <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                                <p className="text-gray-300 text-sm leading-relaxed italic">"{aiAnalysis.analysis}"</p>
                            </div>
  
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-red-900/20 p-3 rounded-lg border border-red-500/20">
                                    <p className="text-red-400 text-xs uppercase font-bold mb-1 flex items-center gap-1"><Lightbulb size={12}/> Next Genre</p>
                                    <p className="text-white font-bold text-sm">{aiAnalysis.suggestion}</p>
                                </div>
                                <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                                    <p className="text-gray-400 text-xs uppercase font-bold mb-1 flex items-center gap-1"><Users size={12}/> Community</p>
                                    <p className="text-white text-[10px] leading-tight">{aiAnalysis.community_vibe}</p>
                                </div>
                            </div>
                            
                            <button onClick={handleAiAnalysis} className="text-xs text-gray-500 hover:text-white underline w-full text-center">Regenerate Analysis</button>
                        </div>
                    )}
                </div>
            </div>
            
            {/* AI Recommendations Section */}
            {aiAnalysis && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-8 delay-150">
                     {/* 20 Movie Recommendations */}
                     <div className="lg:col-span-2 bg-gray-900 border border-gray-800 p-6 rounded-2xl">
                          <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Film size={18} className="text-red-500"/> 20 Movies For You</h3>
                          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                              {aiAnalysis.enrichedRecs?.map((movie, idx) => (
                                  <div 
                                      key={idx} 
                                      onClick={() => onMovieClick(movie)}
                                      className="cursor-pointer hover:scale-105 transition-transform"
                                      title={movie.title}
                                  >
                                      <div className="aspect-[2/3] rounded-lg overflow-hidden relative bg-gray-800">
                                          <img 
                                              src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : "https://placehold.co/100x150"} 
                                              alt={movie.title} 
                                              className="w-full h-full object-cover"
                                          />
                                      </div>
                                  </div>
                              ))}
                              {(!aiAnalysis.enrichedRecs || aiAnalysis.enrichedRecs.length === 0) && <p className="text-gray-500 text-sm col-span-full">No recommendations generated.</p>}
                          </div>
                     </div>
  
                     {/* Future Radar */}
                     <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
                          <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Calendar size={18} className="text-red-400"/> Future Radar</h3>
                          <div className="space-y-4">
                              {aiAnalysis.enrichedFuture?.map((movie, idx) => (
                                  <div 
                                    key={idx} 
                                    className="flex gap-3 items-center cursor-pointer hover:bg-gray-800 p-2 rounded-lg transition-colors"
                                    onClick={() => onMovieClick(movie)}
                                  >
                                      <img 
                                          src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : "https://placehold.co/50x75"} 
                                          alt={movie.title}
                                          className="w-10 h-14 rounded object-cover"
                                      />
                                      <div>
                                          <p className="text-white text-sm font-bold line-clamp-1">{movie.title}</p>
                                          <p className="text-xs text-gray-500">{movie.release_date?.split('-')[0] || 'Upcoming'}</p>
                                      </div>
                                  </div>
                              ))}
                              {(!aiAnalysis.enrichedFuture || aiAnalysis.enrichedFuture.length === 0) && <p className="text-gray-500 text-sm">No upcoming data.</p>}
                          </div>
                     </div>
                </div>
            )}
        </div>
    );
};
