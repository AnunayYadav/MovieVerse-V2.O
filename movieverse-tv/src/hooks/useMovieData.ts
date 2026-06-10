import { useQuery } from '@tanstack/react-query';
import * as tmdbApi from '../services/tmdb/tmdbApi';

// Query keys
export const QueryKeys = {
  trending: (type: string) => ['trending', type],
  popular: (type: string) => ['popular', type],
  platform: (providerId: number) => ['platform', providerId],
  regional: (languages: string) => ['regional', languages],
  details: (id: number, type: 'movie' | 'tv') => ['details', id, type],
  season: (tvId: number, seasonNum: number) => ['season', tvId, seasonNum],
  search: (query: string, page: number) => ['search', query, page],
  collection: (id: number) => ['collection', id],
};

export const useTrendingQuery = (type: 'movie' | 'tv' | 'all' = 'all') => {
  return useQuery({
    queryKey: QueryKeys.trending(type),
    queryFn: () => tmdbApi.fetchTrending(type),
  });
};

export const usePopularQuery = (type: 'movie' | 'tv' = 'movie') => {
  return useQuery({
    queryKey: QueryKeys.popular(type),
    queryFn: () => tmdbApi.fetchPopular(type).then(d => d.results || []),
  });
};

export const usePlatformQuery = (providerId: number) => {
  return useQuery({
    queryKey: QueryKeys.platform(providerId),
    queryFn: () => tmdbApi.fetchPlatformMovies(providerId),
  });
};

export const useRegionalQuery = (languages: string) => {
  return useQuery({
    queryKey: QueryKeys.regional(languages),
    queryFn: () => tmdbApi.fetchRegionalMovies(languages),
  });
};

export const useDetailsQuery = (id: number, type: 'movie' | 'tv') => {
  return useQuery({
    queryKey: QueryKeys.details(id, type),
    queryFn: () => tmdbApi.fetchDetails(id, type),
    enabled: !!id,
  });
};

export const useSeasonQuery = (tvId: number, seasonNum: number) => {
  return useQuery({
    queryKey: QueryKeys.season(tvId, seasonNum),
    queryFn: () => tmdbApi.fetchSeasonDetails(tvId, seasonNum),
    enabled: !!tvId && seasonNum !== undefined,
  });
};

export const useSearchQuery = (query: string, page: number = 1) => {
  return useQuery({
    queryKey: QueryKeys.search(query, page),
    queryFn: () => tmdbApi.fetchSearchMulti(query, page),
    enabled: query.length > 2,
  });
};

export const useCollectionQuery = (collectionId: number) => {
  return useQuery({
    queryKey: QueryKeys.collection(collectionId),
    queryFn: () => tmdbApi.fetchCollectionDetails(collectionId),
    enabled: !!collectionId,
  });
};
