
import { TMDB_OFFICIAL_BASE, getTmdbBaseUrl, getTmdbKey } from '../components/Shared';

/**
 * Robust fetcher for TMDB with retry logic and proxy support.
 */
export const tmdbFetch = async (endpoint: string, params: Record<string, string> = {}, signal?: AbortSignal, retries = 3, delay = 1500): Promise<any> => {
    const baseUrl = getTmdbBaseUrl();
    const apiKey = getTmdbKey();
    
    if (!apiKey) throw new Error("TMDB API Key missing");

    const queryParams = new URLSearchParams({ 
        api_key: apiKey, 
        ...params 
    });

    const url = `${baseUrl}${endpoint}?${queryParams.toString()}`;

    try {
        const response = await fetch(url, { signal });
        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`TMDB API Error: ${response.status} ${response.statusText}`);
        }
        return await response.json();
    } catch (error: any) {
        if (error.name === 'AbortError') throw error;
        if (retries > 0) {
            await new Promise(r => setTimeout(r, delay));
            return tmdbFetch(endpoint, params, signal, retries - 1, delay * 2);
        }
        console.error("Critical TMDB Fetch Error:", error, "URL:", url);
        throw error;
    }
};

/**
 * Service methods for common TMDB operations.
 */
export const tmdbService = {
    getMovieDetails: (id: number, type: 'movie' | 'tv' = 'movie', append: string = '') => 
        tmdbFetch(`/${type}/${id}`, { append_to_response: append }),

    getCollection: (id: number) => 
        tmdbFetch(`/collection/${id}`),

    getPersonDetails: (id: number) => 
        tmdbFetch(`/person/${id}`, { append_to_response: 'combined_credits,images,external_ids' }),

    searchMulti: (query: string, page: number = 1) => 
        tmdbFetch('/search/multi', { query, page: page.toString() }),

    discover: (type: 'movie' | 'tv', params: Record<string, string>) => 
        tmdbFetch(`/discover/${type}`, params),

    getTrending: (type: 'movie' | 'tv', region?: string) => 
        tmdbFetch(`/trending/${type}/day`, region ? { region } : {}),

    getProviders: (type: 'movie' | 'tv', region: string) => 
        tmdbFetch(`/watch/providers/${type}`, { watch_region: region })
};
