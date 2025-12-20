

export interface Movie {
  id: number;
  title: string;
  original_title?: string;
  name?: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids?: number[];
  genres?: Genre[];
  media_type?: 'movie' | 'tv' | 'person';
  runtime?: number;
  episode_run_time?: number[];
  adult?: boolean;
  profile_path?: string | null;
  known_for_department?: string;
  known_for?: Movie[];
}

export interface Genre { id: number; name: string; }
export interface Keyword { id: number; name: string; }

export interface ExternalIds {
    imdb_id?: string;
    facebook_id?: string;
    instagram_id?: string;
    twitter_id?: string;
}

export interface MovieDetails extends Movie {
  budget: number;
  revenue: number;
  status: string;
  tagline: string;
  credits?: { cast: CastMember[]; crew: CrewMember[]; };
  videos?: { results: VideoResult[]; };
  similar?: { results: Movie[]; };
  seasons?: Season[];
  images?: { backdrops: Image[]; posters: Image[]; };
  "watch/providers"?: { results: Record<string, ProviderRegion>; };
  external_ids?: ExternalIds;
  homepage?: string;
  reviews?: { results: Review[]; };
  created_by?: Creator[];
  keywords?: { keywords?: Keyword[]; results?: Keyword[]; };
  belongs_to_collection?: {
    id: number;
    name: string;
    poster_path: string;
    backdrop_path: string;
  };
}

export interface Review {
  author: string;
  content: string;
  id: string;
  created_at: string;
  author_details?: { rating?: number; avatar_path?: string; }
}

export interface Creator { id: number; name: string; }

export interface Season {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  poster_path: string | null;
  episodes?: Episode[];
}

export interface Episode {
  id: number;
  name: string;
  overview: string;
  vote_average: number;
  air_date: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  runtime?: number;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  profile_path: string | null;
}

export interface VideoResult { id: string; key: string; name: string; site: string; type: string; }
export interface Image { file_path: string; aspect_ratio: number; }

export interface ProviderRegion {
  link: string;
  flatrate?: Provider[];
  rent?: Provider[];
  buy?: Provider[];
  // Fix: Added missing optional properties for free and ads providers
  free?: Provider[];
  ads?: Provider[];
}

export interface Provider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface UserProfile {
  name: string;
  age: string;
  genres: string[];
  avatar?: string;
  avatarBackground?: string;
  canWatch?: boolean;
  theme?: 'default' | 'gold';
  enableHistory?: boolean;
  maturityRating?: MaturityRating;
  region?: string;
}

export interface AIAnalysisResult {
  persona: string;
  analysis: string;
  suggestion: string;
  recommendations: string[];
  community_vibe: string;
  future_radar: string[];
  enrichedRecs?: Movie[];
  enrichedFuture?: Movie[];
}

export interface PersonDetails {
  id: number;
  name: string;
  biography: string;
  birthday: string;
  place_of_birth: string;
  profile_path: string | null;
  known_for_department: string;
  combined_credits: { cast: Movie[]; };
  external_ids?: ExternalIds;
  homepage?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export type MaturityRating = "G" | "PG" | "PG-13" | "R" | "NC-17";

export const INDIAN_LANGUAGES = [
  { code: "hi", name: "Hindi" },
  { code: "te", name: "Telugu" },
  { code: "ta", name: "Tamil" },
  { code: "ml", name: "Malayalam" },
  { code: "en", name: "English" }
];

export const GENRES_MAP: Record<string, number> = {
  "Action": 28, "Adventure": 12, "Animation": 16, "Comedy": 35, "Crime": 80,
  "Documentary": 99, "Drama": 18, "Family": 10751, "Fantasy": 14, "History": 36,
  "Horror": 27, "Music": 10402, "Mystery": 9648, "Romance": 10749, "Sci-Fi": 878,
  "Thriller": 53, "War": 10752, "Western": 37
};
export const GENRES_LIST = Object.keys(GENRES_MAP);