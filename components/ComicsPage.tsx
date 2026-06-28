import React, { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, Download, ExternalLink, X, BookOpen, AlertCircle, RefreshCcw, ChevronLeft, ChevronRight, Calendar, ArrowRight, Shield } from 'lucide-react';
import { useTvFocus, TvFocusButton, TvFocusInput } from '../tvNavigation';

interface ComicObject {
  title: string;
  image: string;
  excerpt: string;
  year?: string;
  size?: string;
  description?: string;
  download?: string;
  readOnline?: string;
  ufile?: string;
  mega?: string;
  mediafire?: string;
  zippyshare?: string;
}

const RECOMMENDED_TAGS = ['Batman', 'Spider-Man', 'Avengers', 'Marvel', 'DC Comics', 'Star Wars', 'X-Men'];

export const ComicsPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [comics, setComics] = useState<ComicObject[]>([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedComic, setSelectedComic] = useState<ComicObject | null>(null);

  // Fetch comics from serverless endpoint
  const fetchComics = useCallback(async (searchQuery: string, pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.fetch(`/api/comics?query=${encodeURIComponent(searchQuery)}&page=${pageNum}`);
      if (!res.ok) throw new Error('Failed to load comics catalog');
      const data = await res.json();
      
      setComics(data.containers || []);
      setHasNextPage(data.hasNextPage || false);
    } catch (err: any) {
      console.error('Failed to retrieve comics:', err);
      setError(err?.message || 'Failed to connect to GetComics servers.');
      setComics([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount or query/page changes
  useEffect(() => {
    fetchComics(query, page);
  }, [query, page, fetchComics]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setQuery(searchInput);
  };

  const handleTagClick = (tag: string) => {
    setPage(1);
    setSearchInput(tag);
    setQuery(tag);
  };

  const handleClearSearch = () => {
    setPage(1);
    setSearchInput('');
    setQuery('');
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white font-sans select-none pb-20">
      
      {/* Hero Header */}
      <div className="relative w-full py-16 px-4 md:px-12 bg-gradient-to-b from-[#110505]/40 via-zinc-950/20 to-transparent flex flex-col items-center justify-center text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.12),rgba(255,255,255,0))] pointer-events-none" />
        
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/10 border border-red-600/20 text-red-500 text-[10px] font-bold uppercase tracking-wider mb-4 animate-pulse">
          <BookOpen size={12} />
          <span>Comics Portal v1.0</span>
        </div>
        
        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-none mb-4 uppercase drop-shadow-md">
          MovieVerse <span className="text-red-600">Comics</span>
        </h1>
        <p className="text-zinc-400 text-xs md:text-sm max-w-lg mb-8 leading-relaxed font-normal">
          Explore and download thousands of digital western comic books, novels, and graphic novels directly.
        </p>

        {/* Search Input Bar */}
        <form onSubmit={handleSearchSubmit} className="w-full max-w-xl relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <input
            type="text"
            placeholder="Search comics (e.g. Batman, Spider-Man, Avengers)..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-zinc-950/80 border border-white/10 hover:border-white/20 focus:border-red-600 rounded-full pl-11 pr-24 py-3 text-sm focus:outline-none transition-all placeholder-zinc-500 font-medium"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="text-[10px] text-zinc-500 hover:text-white px-2 py-1 font-bold rounded"
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-full transition-all active:scale-95 shadow-lg shadow-red-600/15"
            >
              Search
            </button>
          </div>
        </form>

        {/* Recommended Tags */}
        <div className="flex flex-wrap gap-2 justify-center items-center max-w-xl">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mr-1">Hot:</span>
          {RECOMMENDED_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => handleTagClick(tag)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${query === tag ? 'bg-red-600 border-red-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-zinc-300 hover:border-white/20 hover:text-white'}`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid View */}
      <div className="max-w-7xl mx-auto px-4 md:px-12 text-left">
        <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-1.5 h-5 bg-red-600 rounded-full inline-block"></span>
            <span>{query ? `Search Results for "${query}"` : 'Latest Comics Uploads'}</span>
          </h2>
          {query && (
            <button
              onClick={handleClearSearch}
              className="text-xs font-bold text-red-500 hover:text-red-400 bg-red-600/10 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <ChevronLeft size={13} /> Back to Latest
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="animate-spin text-red-500" size={36} />
            <p className="text-xs text-zinc-500 font-bold tracking-widest uppercase">Indexing Comics...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <AlertCircle size={40} className="text-red-500 animate-bounce" />
            <h3 className="text-lg font-bold text-white">Scraper Connection Failed</h3>
            <p className="text-zinc-500 text-xs max-w-sm">{error}</p>
            <button
              onClick={() => fetchComics(query, page)}
              className="mt-4 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-xs font-bold text-white transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-98"
            >
              <RefreshCcw size={13} /> Retry Search
            </button>
          </div>
        ) : comics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
            <BookOpen size={48} className="text-white/20 mb-4" />
            <h3 className="text-lg font-bold text-white mb-1">No Comics Found</h3>
            <p className="text-zinc-500 text-xs max-w-xs">No records matched your search query. Please try another character or series.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {comics.map((comic, index) => {
                const { ref } = useTvFocus({
                  onEnterPress: () => setSelectedComic(comic)
                });
                return (
                  <div
                    key={index}
                    ref={ref}
                    onClick={() => setSelectedComic(comic)}
                    className="group relative shrink-0 aspect-[2/3] rounded-xl overflow-hidden cursor-pointer bg-zinc-900 border border-white/5 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.25)] hover:scale-[1.03] transition-all duration-500"
                  >
                    <img
                      src={comic.image || 'https://placehold.co/400x600/111/444?text=Comic+Cover'}
                      alt={comic.title}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent opacity-85 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                    {/* Metadata overlays */}
                    {comic.size && (
                      <div className="absolute top-2 right-2 bg-black/80 border border-white/10 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wide text-zinc-300">
                        {comic.size}
                      </div>
                    )}
                    {comic.year && (
                      <div className="absolute top-2 left-2 bg-red-600 border border-red-500 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wide text-white">
                        {comic.year}
                      </div>
                    )}

                    {/* Comic Title details overlay */}
                    <div className="absolute inset-0 p-3 flex flex-col justify-end text-left select-none pointer-events-none">
                      <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-2 group-hover:text-red-500 transition-colors duration-300 drop-shadow-md leading-tight">
                        {comic.title}
                      </h4>
                      <p className="text-[9px] text-zinc-500 line-clamp-1 mt-1 group-hover:text-zinc-400 transition-colors">
                        {comic.excerpt || 'View comic files download'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-center gap-4 mt-16 select-none">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 disabled:opacity-20 disabled:pointer-events-none text-xs font-semibold text-white hover:border-white/20 transition-all flex items-center gap-1 active:scale-95"
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <span className="text-xs font-bold text-zinc-400">
                Page {page}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!hasNextPage}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 disabled:opacity-20 disabled:pointer-events-none text-xs font-semibold text-white hover:border-white/20 transition-all flex items-center gap-1 active:scale-95"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Glassmorphic Details & Download Modal */}
      {selectedComic && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in text-left select-none">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-zinc-950/95 border border-white/10 rounded-2xl overflow-hidden flex flex-col md:flex-row relative shadow-2xl animate-in scale-in duration-300 max-h-[90vh] md:max-h-none overflow-y-auto"
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedComic(null)}
              className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>

            {/* Left Cover Banner Column */}
            <div className="w-full md:w-60 bg-zinc-900 shrink-0 relative aspect-[2/3] md:aspect-auto">
              <img
                src={selectedComic.image || 'https://placehold.co/400x600/111/444?text=Comic+Cover'}
                alt={selectedComic.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent md:hidden" />
            </div>

            {/* Right Information & Links Column */}
            <div className="flex-1 p-6 md:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 items-center">
                  {selectedComic.year && (
                    <span className="px-2 py-0.5 rounded bg-red-600/15 border border-red-500/30 text-red-400 text-[10px] font-bold uppercase tracking-wider">
                      Year: {selectedComic.year}
                    </span>
                  )}
                  {selectedComic.size && (
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300 text-[10px] font-bold uppercase tracking-wider">
                      Size: {selectedComic.size}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Shield size={10} /> Safe Download
                  </span>
                </div>

                <h2 className="text-xl md:text-2xl font-black text-white leading-tight">
                  {selectedComic.title}
                </h2>
                
                <p className="text-zinc-400 text-xs md:text-sm leading-relaxed font-light line-clamp-4 md:line-clamp-6">
                  {selectedComic.description || selectedComic.excerpt || 'No description summary available.'}
                </p>
              </div>

              {/* Download Buttons Section */}
              <div className="space-y-3.5 pt-4 border-t border-white/5">
                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Available Server Links</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  
                  {/* Direct Download Now */}
                  {selectedComic.download && (
                    <a
                      href={selectedComic.download}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 rounded-lg font-bold bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-1.5 transition-all shadow-md shadow-red-600/10 active:scale-98"
                    >
                      <Download size={14} /> Download Now
                    </a>
                  )}

                  {/* Read Online */}
                  {selectedComic.readOnline && (
                    <a
                      href={selectedComic.readOnline}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 rounded-lg font-bold bg-white/5 border border-white/10 hover:border-white/20 text-white flex items-center justify-center gap-1.5 transition-all active:scale-98"
                    >
                      <ExternalLink size={14} /> Read Online
                    </a>
                  )}

                  {/* Mega Upload Mirror */}
                  {selectedComic.mega && (
                    <a
                      href={selectedComic.mega}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 rounded-lg font-bold bg-pink-600/10 border border-pink-500/20 hover:border-pink-500/40 text-pink-400 flex items-center justify-center gap-1.5 transition-all active:scale-98"
                    >
                      <ArrowRight size={14} className="rotate-45" /> Server: Mega
                    </a>
                  )}

                  {/* Mediafire Mirror */}
                  {selectedComic.mediafire && (
                    <a
                      href={selectedComic.mediafire}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 rounded-lg font-bold bg-blue-600/10 border border-blue-500/20 hover:border-blue-500/40 text-blue-400 flex items-center justify-center gap-1.5 transition-all active:scale-98"
                    >
                      <ArrowRight size={14} className="rotate-45" /> Server: Mediafire
                    </a>
                  )}

                  {/* Ufile Mirror */}
                  {selectedComic.ufile && (
                    <a
                      href={selectedComic.ufile}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 rounded-lg font-bold bg-emerald-600/10 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 flex items-center justify-center gap-1.5 transition-all active:scale-98 col-span-1 sm:col-span-2"
                    >
                      <ArrowRight size={14} className="rotate-45" /> Server: Ufile Mirror
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ComicsPage;
