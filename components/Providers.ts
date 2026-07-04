export interface Provider {
  id: string;
  name: string;
  getMovieUrl: (tmdbId: number, color: string, progress?: number, isAnime?: boolean, anilistId?: number | null, animeLanguage?: string, language?: string, subtitle?: string) => string;
  getTvUrl: (tmdbId: number, season: number, episode: number, color: string, progress?: number, isAnime?: boolean, anilistId?: number | null, animeLanguage?: string, language?: string, subtitle?: string) => string;
  supportsPostMessage: boolean;
}

export const getAudioCode = (lang: string, format: 'name' | 'iso') => {
  const map: Record<string, string> = {
    'English': 'en',
    'Hindi': 'hi',
    'Spanish': 'es',
    'Japanese': 'ja',
    'French': 'fr',
    'German': 'de',
    'Portuguese': 'pt',
    'Russian': 'ru'
  };
  return format === 'iso' ? (map[lang] || 'en') : lang;
};

export const getSubtitleCode = (sub: string, format: 'name' | 'iso') => {
  if (sub === 'None') return '';
  const map: Record<string, string> = {
    'English': 'en',
    'Hindi': 'hi',
    'Spanish': 'es',
    'French': 'fr',
    'German': 'de',
    'Portuguese': 'pt',
    'Russian': 'ru'
  };
  return format === 'iso' ? (map[sub] || 'en') : sub;
};

export const PROVIDERS: Provider[] = [
  {
    id: 'videasy_adfree',
    name: 'VidEasy (HLS Ad-Free)',
    getMovieUrl: () => '',
    getTvUrl: () => '',
    supportsPostMessage: true
  },
  {
    id: 'encdec_hexa',
    name: 'EncDec - Hexa (HLS Ad-Free)',
    getMovieUrl: () => '',
    getTvUrl: () => '',
    supportsPostMessage: true
  },
  {
    id: 'anikai',
    name: 'Anikai',
    getMovieUrl: (tmdbId, color, progress, isAnime, anilistId, animeLanguage, language) => {
      const subdub = animeLanguage === 'dub' || (language && language !== 'Japanese') ? 'dub' : 'sub';
      return `/api/anime?provider=anikai&tmdbId=${tmdbId}&mediaType=movie&anilistId=${anilistId || ''}&lang=${subdub}${progress && progress > 0 ? `&progress=${Math.floor(progress)}` : ''}`;
    },
    getTvUrl: (tmdbId, season, episode, color, progress, isAnime, anilistId, animeLanguage, language) => {
      const subdub = animeLanguage === 'dub' || (language && language !== 'Japanese') ? 'dub' : 'sub';
      return `/api/anime?provider=anikai&tmdbId=${tmdbId}&mediaType=tv&season=${season}&episode=${episode}&anilistId=${anilistId || ''}&lang=${subdub}${progress && progress > 0 ? `&progress=${Math.floor(progress)}` : ''}`;
    },
    supportsPostMessage: false
  },

  {
    id: 'cinesrc',
    name: 'CineSrc',
    getMovieUrl: (tmdbId, color, progress) => {
      const hexColor = color ? `%23${color.replace('#', '')}` : '%23EF4444';
      const startAt = progress && progress > 0 ? `&t=${Math.floor(progress)}&continueprompt=false` : '';
      return `https://cinesrc.st/embed/movie/${tmdbId}?autoplay=true&controls=false&color=${hexColor}&back=close${startAt}`;
    },
    getTvUrl: (tmdbId, season, episode, color, progress) => {
      const hexColor = color ? `%23${color.replace('#', '')}` : '%23EF4444';
      const startAt = progress && progress > 0 ? `&t=${Math.floor(progress)}&continueprompt=false` : '';
      return `https://cinesrc.st/embed/tv/${tmdbId}?s=${season}&e=${episode}&autoplay=true&controls=false&color=${hexColor}&back=close${startAt}`;
    },
    supportsPostMessage: true
  },
  {
    id: 'vidfast',
    name: 'VidFast',
    getMovieUrl: (tmdbId, color, progress, isAnime, anilistId, animeLanguage, language, subtitle) => 
      `https://vidfast.pro/movie/${tmdbId}?autoPlay=true&controls=false&theme=${color.replace('#', '')}${subtitle && subtitle !== 'None' ? `&sub=${getSubtitleCode(subtitle, 'iso')}` : ''}${progress && progress > 0 ? `&startAt=${Math.floor(progress)}` : ''}`,
    getTvUrl: (tmdbId, season, episode, color, progress, isAnime, anilistId, animeLanguage, language, subtitle) => 
      `https://vidfast.pro/tv/${tmdbId}/${season}/${episode}?autoPlay=true&controls=false&theme=${color.replace('#', '')}&nextButton=true&autoNext=true${subtitle && subtitle !== 'None' ? `&sub=${getSubtitleCode(subtitle, 'iso')}` : ''}${progress && progress > 0 ? `&startAt=${Math.floor(progress)}` : ''}`,
    supportsPostMessage: true
  },
  {
    id: 'vidnest',
    name: 'VidNest',
    getMovieUrl: (tmdbId, color, progress, isAnime, anilistId, animeLanguage = 'sub') => 
      isAnime && anilistId
        ? `https://vidnest.fun/anime/${anilistId}/1/${animeLanguage}`
        : `https://vidnest.fun/movie/${tmdbId}${progress && progress > 0 ? `?startAt=${Math.floor(progress)}` : ''}`,
    getTvUrl: (tmdbId, season, episode, color, progress, isAnime, anilistId, animeLanguage = 'sub') => 
      isAnime && anilistId
        ? `https://vidnest.fun/anime/${anilistId}/${episode}/${animeLanguage}`
        : `https://vidnest.fun/tv/${tmdbId}/${season}/${episode}${progress && progress > 0 ? `?progress=${Math.floor(progress)}` : ''}`,
    supportsPostMessage: false
  },
  {
    id: 'vidnest_animepahe',
    name: 'VidNest AnimePahe',
    getMovieUrl: (tmdbId, color, progress, isAnime, anilistId, animeLanguage = 'sub') => 
      isAnime && anilistId
        ? `https://vidnest.fun/animepahe/${anilistId}/1/${animeLanguage}`
        : `https://vidnest.fun/movie/${tmdbId}${progress && progress > 0 ? `?startAt=${Math.floor(progress)}` : ''}`,
    getTvUrl: (tmdbId, season, episode, color, progress, isAnime, anilistId, animeLanguage = 'sub') => 
      isAnime && anilistId
        ? `https://vidnest.fun/animepahe/${anilistId}/${episode}/${animeLanguage}`
        : `https://vidnest.fun/tv/${tmdbId}/${season}/${episode}${progress && progress > 0 ? `?progress=${Math.floor(progress)}` : ''}`,
    supportsPostMessage: false
  },
  {
    id: 'peachify',
    name: 'Peachify',
    getMovieUrl: (tmdbId, color, progress, isAnime, anilistId, animeLanguage, language, subtitle) => {
      const dubVal = language || 'Hindi';
      const subVal = subtitle === 'None' ? '' : (subtitle || 'English');
      return `https://peachify.pro/embed/movie/${tmdbId}?accent=${color.replace('#', '')}&dub=${dubVal}&sub=${subVal}&quality=1080&showNextBtn=true&autoPlay=true${progress && progress > 0 ? `&startAt=${Math.floor(progress)}` : ''}`;
    },
    getTvUrl: (tmdbId, season, episode, color, progress, isAnime, anilistId, animeLanguage, language, subtitle) => {
      const dubVal = language || 'Hindi';
      const subVal = subtitle === 'None' ? '' : (subtitle || 'English');
      return `https://peachify.pro/embed/tv/${tmdbId}/${season}/${episode}?accent=${color.replace('#', '')}&dub=${dubVal}&sub=${subVal}&quality=1080&autoNext=30&showNextBtn=true&autoPlay=true${progress && progress > 0 ? `&startAt=${Math.floor(progress)}` : ''}`;
    },
    supportsPostMessage: false
  },
  {
    id: 'zxcstream',
    name: 'ZXCStream',
    getMovieUrl: (tmdbId, color, progress, isAnime, anilistId, animeLanguage, language, subtitle) => {
      const dub = language ? getAudioCode(language, 'iso') : 'hi';
      const subVal = subtitle && subtitle !== 'None' ? `&sub=${getSubtitleCode(subtitle, 'iso')}` : '';
      return `https://zxcstream.xyz/player/movie/${tmdbId}?dubLang=${dub}&color=${color.replace('#', '')}&autoplay=true${subVal}${progress && progress > 0 ? `&startAt=${Math.floor(progress)}` : ''}`;
    },
    getTvUrl: (tmdbId, season, episode, color, progress, isAnime, anilistId, animeLanguage, language, subtitle) => {
      const dub = language ? getAudioCode(language, 'iso') : 'hi';
      const subVal = subtitle && subtitle !== 'None' ? `&sub=${getSubtitleCode(subtitle, 'iso')}` : '';
      return `https://zxcstream.xyz/player/tv/${tmdbId}/${season}/${episode}?dubLang=${dub}&color=${color.replace('#', '')}&autoplay=true${subVal}${progress && progress > 0 ? `&startAt=${Math.floor(progress)}` : ''}`;
    },
    supportsPostMessage: true
  },
];
