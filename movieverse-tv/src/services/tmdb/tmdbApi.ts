import AsyncStorage from '@react-native-async-storage/async-storage';
import { Movie, MovieDetails, Season } from '../../types';

export const TMDB_PROXY_BASE = 'https://movieverseofficial.vercel.app/api/tmdb';

export const getTmdbKey = async (): Promise<string> => {
  try {
    const localKey = await AsyncStorage.getItem('movieverse_tmdb_key');
    if (localKey) return localKey;
  } catch (e) {}
  
  return (process as any).env?.TMDB_API_KEY || (process as any).env?.VITE_TMDB_API_KEY || "";
};

// Common request helper
async function tmdbFetch(endpoint: string, queryParams: Record<string, string> = {}): Promise<any> {
  const apiKey = await getTmdbKey();
  const params = new URLSearchParams({
    ...queryParams,
  });
  
  // Only add api_key if the endpoint doesn't already have it and we have a key
  if (apiKey && !params.has('api_key') && !endpoint.includes('api_key=')) {
    params.append('api_key', apiKey);
  }

  // Handle leading slash
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${TMDB_PROXY_BASE}${cleanEndpoint}?${params.toString()}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`TMDB Fetch failed for ${endpoint}: ${response.status}`);
  }
  return response.json();
}

// Feeds & Lists
export const fetchTrending = async (mediaType: 'movie' | 'tv' | 'all' = 'all'): Promise<Movie[]> => {
  const data = await tmdbFetch(`/trending/${mediaType}/week`);
  return data.results || [];
};

export const fetchPopular = (mediaType: 'movie' | 'tv' = 'movie'): Promise<{ results: Movie[] }> => {
  return tmdbFetch(`/${mediaType}/popular`);
};

export const fetchDiscover = async (mediaType: 'movie' | 'tv', params: Record<string, string>): Promise<Movie[]> => {
  const data = await tmdbFetch(`/discover/${mediaType}`, params);
  return data.results || [];
};

// Platform specific (watch provider queries)
export const fetchPlatformMovies = async (providerId: number): Promise<Movie[]> => {
  return fetchDiscover('movie', {
    with_watch_providers: providerId.toString(),
    watch_region: 'US',
    sort_by: 'popularity.desc',
  });
};

// Language specific
export const fetchRegionalMovies = async (languages: string): Promise<Movie[]> => {
  return fetchDiscover('movie', {
    with_original_language: languages,
    sort_by: 'popularity.desc',
  });
};

// Details page (Movie/TV details with credits, similar, and seasons/external IDs)
export const fetchDetails = async (mediaId: number, mediaType: 'movie' | 'tv'): Promise<MovieDetails> => {
  return tmdbFetch(`/${mediaType}/${mediaId}`, {
    append_to_response: 'credits,videos,similar,images,content_ratings,release_dates,external_ids,keywords',
  });
};

// Season Details (including episodes)
export const fetchSeasonDetails = async (tvId: number, seasonNumber: number): Promise<Season> => {
  return tmdbFetch(`/tv/${tvId}/season/${seasonNumber}`);
};

// Search (Multi search covers movies, tv shows, and people)
export const fetchSearchMulti = async (query: string, page: number = 1): Promise<{ results: Movie[], total_pages: number }> => {
  const data = await tmdbFetch('/search/multi', {
    query,
    page: page.toString(),
    include_adult: 'false',
  });
  return {
    results: data.results || [],
    total_pages: data.total_pages || 1,
  };
};

// Collection / Franchise details
export const fetchCollectionDetails = async (collectionId: number): Promise<Movie[]> => {
  const data = await tmdbFetch(`/collection/${collectionId}`);
  return data.parts || [];
};

// Search collections (franchise explorer)
export const fetchSearchCollection = async (query: string, page: number = 1): Promise<any> => {
  return tmdbFetch('/search/collection', {
    query,
    page: page.toString(),
  });
};
