import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ArrowLeft, Star, Play, Calendar, Film, Layers, Share2, Check, 
  Sparkles, Clock, AlertCircle, ChevronRight, SlidersHorizontal
} from 'lucide-react';
import { Movie, CollectionDetails } from '../types';
import { TMDB_BASE_URL, TMDB_IMAGE_BASE, TMDB_BACKDROP_BASE, MovieCard, tvFetch } from './Shared';

export interface CollectionPageProps {
  collectionId: number;
  collectionName?: string;
  onClose: () => void;
  apiKey: string;
  onMovieClick: (movie: Movie) => void;
  watched?: Movie[];
  onToggleWatched?: (movie: Movie) => void;
}

export const CollectionPage: React.FC<CollectionPageProps> = ({
  collectionId,
  collectionName,
  onClose,
  apiKey,
  onMovieClick,
  watched = [],
  onToggleWatched,
}) => {
  const [collection, setCollection] = useState<CollectionDetails | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sortOrder, setSortOrder] = useState<'chronological' | 'latest' | 'rating'>('chronological');

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(onClose, 240);
  }, [onClose]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  // Fetch Collection Details & Images
  useEffect(() => {
    if (!collectionId || !apiKey) return;
    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchCollection = async () => {
      try {
        const keyParam = apiKey ? `api_key=${encodeURIComponent(apiKey)}` : '';
        const res = await tvFetch(`${TMDB_BASE_URL}/collection/${collectionId}?${keyParam}`);
        if (!res.ok) throw new Error(`Collection not found (status ${res.status})`);
        const data = await res.json();

        if (isMounted) {
          setCollection(data);
        }

        // Fetch Logo
        try {
          const imgRes = await tvFetch(`${TMDB_BASE_URL}/collection/${collectionId}/images?${keyParam}`);
          if (imgRes.ok) {
            const imgData = await imgRes.json();
            const enLogo = imgData.logos?.find((l: any) => l.iso_639_1 === 'en');
            const anyLogo = imgData.logos?.[0];
            const chosenLogo = enLogo || anyLogo;
            if (isMounted && chosenLogo?.file_path) {
              setLogoUrl(`https://image.tmdb.org/t/p/w500${chosenLogo.file_path}`);
            }
          }
        } catch {
          // Logo fetch failure is non-fatal
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Failed to fetch collection details:", err);
          setError(err?.message || "Failed to load collection.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchCollection();

    return () => {
      isMounted = false;
    };
  }, [collectionId, apiKey]);

  // Sorted Parts
  const sortedParts = useMemo(() => {
    if (!collection?.parts) return [];
    const list = [...collection.parts];

    if (sortOrder === 'chronological') {
      return list.sort((a, b) => {
        const dateA = a.release_date || '9999';
        const dateB = b.release_date || '9999';
        return dateA.localeCompare(dateB);
      });
    } else if (sortOrder === 'latest') {
      return list.sort((a, b) => {
        const dateA = a.release_date || '0000';
        const dateB = b.release_date || '0000';
        return dateB.localeCompare(dateA);
      });
    } else if (sortOrder === 'rating') {
      return list.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
    }
    return list;
  }, [collection?.parts, sortOrder]);

  // Statistics
  const stats = useMemo(() => {
    if (!collection?.parts || collection.parts.length === 0) {
      return { count: 0, yearRange: '', avgRating: null };
    }
    const partsWithDates = collection.parts
      .filter(p => p.release_date)
      .map(p => parseInt(p.release_date.split('-')[0], 10))
      .filter(y => !isNaN(y))
      .sort((a, b) => a - b);

    const startYear = partsWithDates.length > 0 ? partsWithDates[0] : null;
    const endYear = partsWithDates.length > 0 ? partsWithDates[partsWithDates.length - 1] : null;
    const yearRange = startYear ? (startYear === endYear ? `${startYear}` : `${startYear} – ${endYear}`) : 'TBA';

    const partsWithRatings = collection.parts.filter(p => p.vote_average && p.vote_average > 0);
    const avgRating = partsWithRatings.length > 0
      ? (partsWithRatings.reduce((acc, p) => acc + (p.vote_average || 0), 0) / partsWithRatings.length).toFixed(1)
      : null;

    return {
      count: collection.parts.length,
      yearRange,
      avgRating
    };
  }, [collection?.parts]);

  const handleShare = () => {
    const url = window.location.origin + `/collection/${collectionId}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const backdropImage = collection?.backdrop_path 
    ? `${TMDB_BACKDROP_BASE}${collection.backdrop_path}`
    : (sortedParts[0]?.backdrop_path ? `${TMDB_BACKDROP_BASE}${sortedParts[0].backdrop_path}` : null);

  const posterImage = collection?.poster_path
    ? `${TMDB_IMAGE_BASE}${collection.poster_path}`
    : (sortedParts[0]?.poster_path ? `${TMDB_IMAGE_BASE}${sortedParts[0].poster_path}` : null);

  return (
    <div className={`fixed inset-0 z-[95] bg-[#070709] overflow-y-auto custom-scrollbar select-none ${isClosing ? 'ios-sheet-exit' : 'ios-sheet-enter'}`}>
      {/* Top Floating Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 px-4 md:px-10 py-4 flex items-center justify-between pointer-events-none">
        <button
          onClick={handleClose}
          className="pointer-events-auto bg-black/60 hover:bg-black/85 backdrop-blur-md px-4 py-2 rounded-full text-zinc-200 hover:text-white flex items-center gap-2 border border-white/10 text-xs font-semibold active:scale-95 transition-all shadow-xl cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        <button
          onClick={handleShare}
          className="pointer-events-auto bg-black/60 hover:bg-black/85 backdrop-blur-md px-3.5 py-2 rounded-full text-zinc-200 hover:text-white flex items-center gap-2 border border-white/10 text-xs font-medium active:scale-95 transition-all shadow-xl cursor-pointer"
          title="Share Collection Link"
        >
          {copied ? (
            <>
              <Check size={15} className="text-emerald-400" />
              <span className="text-emerald-400 font-semibold">Link Copied</span>
            </>
          ) : (
            <>
              <Share2 size={15} />
              <span className="hidden sm:inline">Share</span>
            </>
          )}
        </button>
      </div>

      {loading ? (
        <div className="h-screen flex items-center justify-center flex-col gap-4">
          <div className="w-14 h-14 rounded-full border-3 border-white/10 border-t-white animate-spin" />
          <p className="text-zinc-500 text-xs animate-pulse uppercase tracking-wider font-semibold">
            Loading Franchise...
          </p>
        </div>
      ) : error ? (
        <div className="h-screen flex items-center justify-center flex-col gap-4 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 mb-2">
            <AlertCircle size={32} />
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">Collection Not Found</h3>
          <p className="text-zinc-400 text-xs max-w-md">{error}</p>
          <button
            onClick={handleClose}
            className="mt-2 px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all"
          >
            Go Back
          </button>
        </div>
      ) : collection ? (
        <div className="w-full flex flex-col pb-24">
          {/* Hero Banner Section */}
          <div className="relative w-full min-h-[440px] md:min-h-[520px] overflow-hidden bg-[#0a0a0c] flex items-end">
            {/* Backdrop Background */}
            <div className="absolute inset-0">
              {backdropImage ? (
                <img
                  src={backdropImage}
                  alt={collection.name}
                  className="w-full h-full object-cover object-center transition-transform duration-1000 scale-102"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-zinc-900/40 via-zinc-950 to-black" />
              )}
              {/* Gradients */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#070709] via-[#070709]/75 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#070709] via-[#070709]/50 to-transparent" />
              <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/80 to-transparent" />
            </div>

            {/* Foreground Content */}
            <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-12 pt-28 pb-8 md:pb-12 flex flex-col md:flex-row items-start md:items-end gap-6 md:gap-10">
              {/* Poster Card */}
              {posterImage && (
                <div className="hidden sm:block shrink-0 w-36 sm:w-44 md:w-52 aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_16px_36px_rgba(0,0,0,0.9)] border border-white/15 bg-zinc-900 group">
                  <img
                    src={posterImage}
                    alt={collection.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              )}

              {/* Title & Metadata */}
              <div className="flex-1 flex flex-col items-start gap-3.5 text-left">
                {/* Category Pill */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-zinc-300 text-[10px] font-medium tracking-wide">
                  <Layers size={13} className="text-zinc-400" />
                  <span>Franchise Collection</span>
                </div>

                {/* Collection Logo or Title */}
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={collection.name}
                    className="max-h-16 md:max-h-24 max-w-[85%] object-contain object-left drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] animate-in fade-in duration-300"
                  />
                ) : (
                  <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-2xl">
                    {collection.name}
                  </h1>
                )}

                {/* Metadata Badges */}
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs font-semibold text-zinc-300">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white font-bold text-[11px] border border-white/10">
                    {stats.count} {stats.count === 1 ? 'Film' : 'Films'}
                  </span>
                  {stats.yearRange && (
                    <>
                      <span className="text-zinc-600">•</span>
                      <span className="font-mono text-zinc-300 flex items-center gap-1.5">
                        <Calendar size={13} className="text-zinc-400" />
                        {stats.yearRange}
                      </span>
                    </>
                  )}
                  {stats.avgRating && (
                    <>
                      <span className="text-zinc-600">•</span>
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <Star size={13} fill="currentColor" />
                        {stats.avgRating} Avg Rating
                      </span>
                    </>
                  )}
                </div>

                {/* Overview */}
                <p className="text-zinc-300 text-xs sm:text-sm md:text-base max-w-3xl leading-relaxed drop-shadow line-clamp-3 md:line-clamp-4 font-normal">
                  {collection.overview ||
                    `Immerse yourself in the complete ${collection.name} saga. Follow the characters, storyline, and cinematic universe in chronological order.`}
                </p>

                {/* Actions */}
                {sortedParts.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={() => onMovieClick(sortedParts[0])}
                      className="px-6 py-2.5 rounded-full bg-white hover:bg-zinc-100 text-black text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg shadow-white/10 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      <Play size={16} fill="currentColor" />
                      <span>Start with Part 1</span>
                    </button>
                    {sortedParts.length > 1 && (
                      <button
                        onClick={() => onMovieClick(sortedParts[sortedParts.length - 1])}
                        className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-zinc-200 hover:text-white text-xs sm:text-sm font-semibold flex items-center gap-2 border border-white/10 transition-all active:scale-95 cursor-pointer"
                      >
                        <Film size={15} />
                        <span>Latest Release</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Films List Section */}
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-12 mt-8 md:mt-10">
            {/* Header & Sort Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/5 mb-8">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                  <span>Films in Universe</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/5">
                    {sortedParts.length}
                  </span>
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Chronological watch order and release history of the complete franchise.
                </p>
              </div>

              {/* Sort Order Toggle */}
              <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl self-start sm:self-auto">
                <button
                  onClick={() => setSortOrder('chronological')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    sortOrder === 'chronological'
                      ? 'bg-white text-black font-semibold shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Watch Order
                </button>
                <button
                  onClick={() => setSortOrder('latest')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    sortOrder === 'latest'
                      ? 'bg-white text-black font-semibold shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Newest First
                </button>
                <button
                  onClick={() => setSortOrder('rating')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    sortOrder === 'rating'
                      ? 'bg-white text-black font-semibold shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Top Rated
                </button>
              </div>
            </div>

            {/* Movies Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8 animate-in fade-in duration-500">
              {sortedParts.map((movie, idx) => {
                const releaseYear = movie.release_date?.split('-')[0] || 'TBA';
                
                return (
                  <div
                    key={movie.id}
                    onClick={() => onMovieClick(movie)}
                    className="group flex flex-col gap-2.5 cursor-pointer select-none text-left"
                  >
                    {/* Vertical Poster Container - Clean without overlay pills */}
                    <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-white/5 group-hover:border-white/20 group-hover:shadow-[0_12px_28px_rgba(0,0,0,0.85)] group-hover:scale-[1.03] transition-all duration-500">
                      <img
                        src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : 'https://placehold.co/400x600/111/444?text=No+Poster'}
                        alt={movie.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    </div>

                    {/* Movie Info below poster in clean text */}
                    <div className="flex flex-col px-1">
                      <h4 className="text-xs sm:text-sm font-semibold text-zinc-200 line-clamp-2 group-hover:text-white transition-colors duration-300 leading-snug min-h-[32px] sm:min-h-[40px]">
                        {movie.title}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-zinc-400 font-medium">
                        <span>Part {idx + 1}</span>
                        <span className="text-zinc-600">•</span>
                        <span>{releaseYear}</span>
                        {movie.vote_average ? (
                          <>
                            <span className="text-zinc-600">•</span>
                            <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                              ★ {movie.vote_average.toFixed(1)}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

