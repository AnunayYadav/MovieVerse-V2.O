export const getMovieAgeInYears = (releaseDateStr?: string): number => {
  if (!releaseDateStr) return 5; // Default to 5 years if date is unknown
  try {
    const releaseDate = new Date(releaseDateStr);
    const currentDate = new Date();
    const diffMs = currentDate.getTime() - releaseDate.getTime();
    if (isNaN(diffMs) || diffMs < 0) return 0;
    return diffMs / (1000 * 60 * 60 * 24 * 365.25);
  } catch (e) {
    return 5;
  }
};

export const getMovieVerseRating = (
  id: number,
  voteAverage: number,
  popularity: number = 0,
  voteCount: number = 0,
  releaseDate?: string
): number => {
  if (!voteAverage) return 0;
  
  // 1. Bayesian Quality Score
  const C = 6.8; // average rating
  const M = 1500; // confidence threshold
  const Q = (voteCount * voteAverage + M * C) / (voteCount + M);
  
  // 2. Confidence Multiplier
  const conf = 1 + 0.05 * Math.min(1, Math.log10(voteCount + 1) / 5);
  
  // 3. Age Stability Factor
  const ageInYears = getMovieAgeInYears(releaseDate);
  const age = 0.96 + 0.04 * Math.min(1, ageInYears / 5);
  
  // 4. Popularity Relevance
  const pop = 1 + 0.02 * Math.min(1, Math.log10(popularity + 1) / 4);
  
  // Final MovieVerse platform score
  let mvRating = Q * conf * age * pop;
  mvRating = Math.max(1.0, Math.min(10.0, mvRating));
  return parseFloat(mvRating.toFixed(1));
};
