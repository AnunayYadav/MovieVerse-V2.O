import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { FocusableButton } from '../FocusableButton/FocusableButton';
import { Movie } from '../../types';
import Colors from '../../theme/colors';
import Typography from '../../theme/typography';
import Spacing from '../../theme/spacing';
import { getMovieVerseRating } from '../../utils/rating';

interface MovieCardProps {
  movie: Movie;
  onPress: (movie: Movie) => void;
  onFocus?: (movie: Movie) => void;
}

export const MovieCard: React.FC<MovieCardProps> = React.memo(({
  movie,
  onPress,
  onFocus,
}) => {
  if (!movie) return null;

  const title = movie.title || movie.name || 'Untitled';
  const year = (movie.release_date || movie.first_air_date || '').split('-')[0] || 'TBA';
  const rating = getMovieVerseRating(
    movie.id,
    movie.vote_average,
    movie.popularity,
    movie.vote_count,
    movie.release_date || movie.first_air_date
  );

  const backdropPath = movie.backdrop_path || movie.poster_path;
  const imageUrl = backdropPath
    ? `https://image.tmdb.org/t/p/w342${backdropPath}`
    : 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=500&auto=format&fit=crop&q=60'; // High quality fallback placeholder

  const progress = movie.play_progress || 0;
  const showProgress = progress > 0 && progress < 98;

  const handleFocus = () => {
    if (onFocus) {
      onFocus(movie);
    }
  };

  return (
    <FocusableButton
      onPress={() => onPress(movie)}
      onFocus={handleFocus}
      style={styles.card}
      scaleOnFocus={1.05}
    >
      {({ focused }) => (
        <View style={styles.contentContainer}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
          
          {/* Liquid Glass style gradient overlay */}
          <View style={[styles.overlay, focused && styles.overlayFocused]} />

          {/* Watch Progress Indicator */}
          {showProgress && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>
          )}

          {/* Text content details */}
          <View style={styles.metaContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {focused && (
              <View style={styles.detailsRow}>
                <Text style={styles.year}>{year}</Text>
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingText}>MV {rating.toFixed(1)}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      )}
    </FocusableButton>
  );
});

const styles = StyleSheet.create({
  card: {
    width: Spacing.cardWidth * 1.5, // 240px width (16:9 aspect landscape cards)
    height: Spacing.cardHeight / 1.7, // 141px height
    backgroundColor: Colors.surface,
    borderRadius: Spacing.borderRadius,
    marginRight: Spacing.cardSpacing,
    position: 'relative',
  },
  contentContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: Spacing.borderRadius - 2,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: Spacing.borderRadius - 2,
  },
  overlayFocused: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 10,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  metaContainer: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    right: Spacing.sm,
    zIndex: 5,
  },
  title: {
    color: Colors.text,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.body - 2,
    fontWeight: Typography.weights.bold,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  year: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.caption,
  },
  ratingBadge: {
    backgroundColor: Colors.primary,
    borderRadius: Spacing.borderRadiusSm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 1,
  },
  ratingText: {
    color: Colors.text,
    fontSize: 10,
    fontWeight: Typography.weights.bold,
  },
});

export default MovieCard;
