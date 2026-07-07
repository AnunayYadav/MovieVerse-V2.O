import { Movie } from '../types';

export function mapAnilistToTmdbShape(media: any): Movie {
  const isMovie = media.format === 'MOVIE';
  const titleStr = media.title?.english || media.title?.romaji || media.title?.userPreferred || 'Unknown Anime';
  const releaseDate = media.seasonYear ? `${media.seasonYear}-01-01` : undefined;

  return {
    id: media.id,
    title: titleStr,
    name: titleStr, // Duplicate for TV context
    original_title: media.title?.romaji,
    original_name: media.title?.romaji,
    media_type: isMovie ? 'movie' : 'tv',
    isAnime: true,
    overview: media.description ? media.description.replace(/<[^>]*>/g, '') : '', // strip HTML tags
    poster_path: media.bannerImage || media.coverImage?.extraLarge || media.coverImage?.large || null,
    backdrop_path: media.bannerImage || media.coverImage?.extraLarge || null,
    vote_average: media.averageScore ? media.averageScore / 10 : 7.0,
    vote_count: 100, // placeholder
    popularity: media.popularity || 0,
    genre_ids: [16], // Animation
    genres: media.genres ? media.genres.map((g: string) => ({ id: 16, name: g })) : [{ id: 16, name: 'Animation' }],
    release_date: isMovie ? releaseDate : undefined,
    first_air_date: !isMovie ? releaseDate : undefined,
    adult: media.isAdult || false,
    year: media.seasonYear,
  };
}
