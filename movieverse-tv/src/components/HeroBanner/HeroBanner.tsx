import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions, Platform } from 'react-native';
import { Play, Info } from 'lucide-react-native';
import FocusableButton from '../FocusableButton/FocusableButton';
import { Movie } from '../../types';
import Colors from '../../theme/colors';
import Spacing from '../../theme/spacing';
import Typography from '../../theme/typography';
import { getMovieVerseRating } from '../../utils/rating';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface HeroBannerProps {
  movie: Movie | null;
  onPlayPress: (movie: Movie) => void;
  onInfoPress: (movie: Movie) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  movie,
  onPlayPress,
  onInfoPress,
}) => {
  if (!movie) {
    return <View style={styles.placeholder} />;
  }

  const title = movie.title || movie.name || 'Featured Title';
  const year = (movie.release_date || movie.first_air_date || '').split('-')[0] || 'TBA';
  const rating = getMovieVerseRating(
    movie.id,
    movie.vote_average,
    movie.popularity,
    movie.vote_count,
    movie.release_date || movie.first_air_date
  );

  const backdropUrl = movie.backdrop_path
    ? `https://image.tmdb.org/t/p/w780${movie.backdrop_path}`
    : `https://image.tmdb.org/t/p/w780${movie.poster_path}`;

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: backdropUrl }}
        style={styles.backdrop}
        resizeMode="cover"
      />
      
      {/* Heavy shadow overlays (left-to-right & bottom-to-top) for legibility */}
      <View style={styles.leftGradient} />
      <View style={styles.bottomGradient} />

      <View style={styles.content}>
        {/* Rating and Release Tag */}
        <View style={styles.badgeRow}>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>MV {rating.toFixed(1)}</Text>
          </View>
          <Text style={styles.metaText}>{year}</Text>
          <Text style={styles.metaText}>•</Text>
          <Text style={styles.metaText}>{movie.media_type === 'tv' ? 'TV Series' : 'Movie'}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>

        {/* Synopsis */}
        <Text style={styles.overview} numberOfLines={3}>
          {movie.overview || 'No synopsis available.'}
        </Text>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <FocusableButton
            onPress={() => onPlayPress(movie)}
            style={styles.playButton}
            scaleOnFocus={1.05}
          >
            {({ focused }) => (
              <View style={styles.buttonContent}>
                <Play size={20} stroke={focused ? Colors.background : Colors.text} fill={focused ? Colors.background : 'none'} />
                <Text style={[styles.playButtonText, focused && styles.focusedButtonText]}>Play</Text>
              </View>
            )}
          </FocusableButton>

          <FocusableButton
            onPress={() => onInfoPress(movie)}
            style={styles.infoButton}
            scaleOnFocus={1.05}
          >
            {({ focused }) => (
              <View style={styles.buttonContent}>
                <Info size={20} stroke={Colors.text} />
                <Text style={styles.infoButtonText}>Info</Text>
              </View>
            )}
          </FocusableButton>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: Spacing.heroHeight,
    backgroundColor: Colors.background,
    position: 'relative',
  },
  placeholder: {
    width: '100%',
    height: Spacing.heroHeight,
    backgroundColor: Colors.surface,
  },
  backdrop: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  leftGradient: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SCREEN_WIDTH * 0.6,
    // Emulate a smooth black fade from left to right
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    ...Platform.select({
      android: {
        // Multi-layered overlays to simulate gradients without external SVG libs
        opacity: 0.85,
      },
      ios: {
        opacity: 0.85,
      }
    }),
  },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: Spacing.heroHeight * 0.4,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  content: {
    position: 'absolute',
    bottom: Spacing.xxl,
    left: Spacing.rowPadding,
    right: SCREEN_WIDTH * 0.4,
    justifyContent: 'flex-end',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  ratingBadge: {
    backgroundColor: Colors.primary,
    borderRadius: Spacing.borderRadiusSm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    marginRight: Spacing.sm,
  },
  ratingText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: Typography.weights.bold,
  },
  metaText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.heroSubtitle - 2,
    marginRight: Spacing.sm,
    fontWeight: Typography.weights.medium,
  },
  title: {
    color: Colors.text,
    fontSize: Typography.sizes.heroTitle,
    fontWeight: Typography.weights.heavy,
    lineHeight: Typography.lineHeights.heroTitle,
    marginBottom: Spacing.sm,
  },
  overview: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.body,
    lineHeight: Typography.lineHeights.body,
    marginBottom: Spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButton: {
    backgroundColor: Colors.text, // white background
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.md,
  },
  playButtonText: {
    color: Colors.background, // black text
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
    marginLeft: Spacing.xs,
  },
  infoButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // transparent white
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  infoButtonText: {
    color: Colors.text,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
    marginLeft: Spacing.xs,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  focusedButtonText: {
    color: Colors.text,
  },
});

export default HeroBanner;
