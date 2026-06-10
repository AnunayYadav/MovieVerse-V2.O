import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  ScrollView, 
  StyleSheet, 
  FlatList, 
  Dimensions, 
  Pressable 
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ArrowLeft, Play, Bookmark, BookmarkCheck } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { RootStackParamList } from '../../navigation/AppNavigator';
import { useDetailsQuery } from '../../hooks/useMovieData';
import Colors from '../../theme/colors';
import Spacing from '../../theme/spacing';
import Typography from '../../theme/typography';
import Loader from '../../components/Loading/Loader';
import FocusableButton from '../../components/FocusableButton/FocusableButton';
import MovieRow from '../../components/MovieRow/MovieRow';
import { Movie } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type DetailsScreenRouteProp = RouteProp<RootStackParamList, 'Details'>;
type DetailsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Details'>;

export const DetailsScreen: React.FC = () => {
  const route = useRoute<DetailsScreenRouteProp>();
  const navigation = useNavigation<DetailsScreenNavigationProp>();
  const { mediaId, mediaType } = route.params;

  const [inWatchlist, setInWatchlist] = useState(false);

  // Fetch details using React Query
  const { data: details, isLoading, error } = useDetailsQuery(mediaId, mediaType);

  // Check watchlist status on mount/id change
  useEffect(() => {
    const checkWatchlist = async () => {
      try {
        const stored = await AsyncStorage.getItem('movieverse_watchlist');
        const list: Movie[] = stored ? JSON.parse(stored) : [];
        const exists = list.some(item => item.id === mediaId);
        setInWatchlist(exists);
      } catch (e) {
        console.warn("Failed to check watchlist storage", e);
      }
    };
    checkWatchlist();
  }, [mediaId]);

  const toggleWatchlist = async () => {
    try {
      const stored = await AsyncStorage.getItem('movieverse_watchlist');
      let list: Movie[] = stored ? JSON.parse(stored) : [];
      
      if (inWatchlist) {
        list = list.filter(item => item.id !== mediaId);
        setInWatchlist(false);
      } else if (details) {
        // Construct movie item
        const movieItem: Movie = {
          id: details.id,
          title: details.title || details.name || '',
          poster_path: details.poster_path,
          backdrop_path: details.backdrop_path,
          vote_average: details.vote_average,
          vote_count: details.vote_count,
          popularity: details.popularity,
          media_type: mediaType,
          overview: details.overview,
        };
        list.push(movieItem);
        setInWatchlist(true);
      }
      await AsyncStorage.setItem('movieverse_watchlist', JSON.stringify(list));
    } catch (e) {
      console.warn("Failed to toggle watchlist storage", e);
    }
  };

  const handlePlayPress = (seasonNum?: number, epNum?: number) => {
    if (!details) return;
    navigation.navigate('Player', {
      mediaId,
      mediaType,
      season: seasonNum,
      episode: epNum,
      title: details.title || details.name || 'Video Player',
    });
  };

  if (isLoading) {
    return <Loader fullScreen />;
  }

  if (error || !details) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load content details.</Text>
        <FocusableButton onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </FocusableButton>
      </View>
    );
  }

  const title = details.title || details.name || 'Untitled';
  const tagline = details.tagline || '';
  const year = (details.release_date || details.first_air_date || '').split('-')[0] || 'TBA';
  const rating = details.vote_average ? details.vote_average.toFixed(1) : 'NR';
  const runtime = details.runtime 
    ? `${details.runtime} mins` 
    : (details.episode_run_time && details.episode_run_time[0] 
        ? `${details.episode_run_time[0]} mins` 
        : '');

  const backdropUrl = details.backdrop_path
    ? `https://image.tmdb.org/t/p/w780${details.backdrop_path}`
    : `https://image.tmdb.org/t/p/w780${details.poster_path}`;

  const cast = details.credits?.cast?.slice(0, 10) || [];
  const similar = details.similar?.results || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      
      {/* Background Graphic */}
      <View style={styles.headerContainer}>
        <Image source={{ uri: backdropUrl }} style={styles.backdrop} resizeMode="cover" />
        <View style={styles.gradientLeft} />
        <View style={styles.gradientBottom} />

        <FocusableButton onPress={() => navigation.goBack()} style={styles.floatingBackButton}>
          <ArrowLeft size={20} stroke={Colors.text} />
        </FocusableButton>

        <View style={styles.headerContent}>
          {/* Metadata Row */}
          <View style={styles.metaRow}>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>MV {rating}</Text>
            </View>
            <Text style={styles.metaText}>{year}</Text>
            {runtime ? <Text style={styles.metaText}>•</Text> : null}
            {runtime ? <Text style={styles.metaText}>{runtime}</Text> : null}
            <Text style={styles.metaText}>•</Text>
            <Text style={styles.metaText}>{mediaType === 'tv' ? 'TV Series' : 'Movie'}</Text>
          </View>

          {/* Title */}
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
          {tagline ? <Text style={styles.tagline}>{tagline}</Text> : null}

          {/* Overview */}
          <Text style={styles.overview}>{details.overview || 'No synopsis available.'}</Text>

          {/* Details Buttons */}
          <View style={styles.buttonRow}>
            <FocusableButton onPress={() => handlePlayPress()} style={styles.playButton}>
              {({ focused }) => (
                <View style={styles.btnContent}>
                  <Play size={20} stroke={focused ? Colors.background : Colors.text} fill={focused ? Colors.background : 'none'} />
                  <Text style={[styles.playBtnText, focused && styles.focusedBtnText]}>
                    {mediaType === 'tv' ? 'Play S1:E1' : 'Play'}
                  </Text>
                </View>
              )}
            </FocusableButton>

            <FocusableButton onPress={toggleWatchlist} style={styles.watchlistButton}>
              {({ focused }) => (
                <View style={styles.btnContent}>
                  {inWatchlist ? (
                    <BookmarkCheck size={20} stroke={Colors.success} />
                  ) : (
                    <Bookmark size={20} stroke={Colors.text} />
                  )}
                  <Text style={styles.watchlistBtnText}>
                    {inWatchlist ? 'Watchlisted' : 'Watchlist'}
                  </Text>
                </View>
              )}
            </FocusableButton>
          </View>
        </View>
      </View>

      {/* Main Details Body */}
      <View style={styles.body}>
        
        {/* Cast list */}
        {cast.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cast</Text>
            <FlatList
              data={cast}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => `cast-${item.id}`}
              contentContainerStyle={styles.castList}
              renderItem={({ item }) => {
                const profileUrl = item.profile_path
                  ? `https://image.tmdb.org/t/p/w185${item.profile_path}`
                  : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=60';
                return (
                  <View style={styles.castCard}>
                    <Image source={{ uri: profileUrl }} style={styles.castAvatar} />
                    <Text style={styles.castName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.castCharacter} numberOfLines={1}>{item.character}</Text>
                  </View>
                );
              }}
            />
          </View>
        ) : null}

        {/* TV Series Seasons/Episodes selection */}
        {mediaType === 'tv' && details.seasons && details.seasons.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seasons & Episodes</Text>
            <FlatList
              data={details.seasons.filter(s => s.season_number > 0)} // exclude specials
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => `season-${item.id}`}
              contentContainerStyle={styles.seasonList}
              renderItem={({ item }) => (
                <FocusableButton 
                  onPress={() => handlePlayPress(item.season_number, 1)} 
                  style={styles.seasonCard}
                >
                  <Text style={styles.seasonTitleText}>{item.name}</Text>
                  <Text style={styles.episodeCountText}>{item.episode_count} Episodes</Text>
                </FocusableButton>
              )}
            />
          </View>
        ) : null}

        {/* Similar Movies/Shows */}
        {similar.length > 0 ? (
          <MovieRow
            title="More Like This"
            movies={similar}
            onMoviePress={(movie) => {
              // Push navigation to the details screen of similar movie
              navigation.push('Details', {
                mediaId: movie.id,
                mediaType: movie.media_type === 'tv' ? 'tv' : 'movie',
              });
            }}
          />
        ) : null}

      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    paddingBottom: Spacing.xxl * 2,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: Colors.error,
    fontSize: 20,
    marginBottom: Spacing.lg,
  },
  backButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
  },
  backButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerContainer: {
    width: '100%',
    height: Spacing.heroHeight + 50,
    position: 'relative',
  },
  backdrop: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  gradientLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SCREEN_WIDTH * 0.55,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  gradientBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  floatingBackButton: {
    position: 'absolute',
    top: Spacing.xl,
    left: Spacing.rowPadding,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 20,
  },
  headerContent: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.rowPadding,
    right: SCREEN_WIDTH * 0.45,
    zIndex: 10,
  },
  metaRow: {
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
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  title: {
    color: Colors.text,
    fontSize: Typography.sizes.heroTitle - 4,
    fontWeight: Typography.weights.heavy,
    marginBottom: Spacing.xs,
  },
  tagline: {
    color: Colors.primary,
    fontSize: 16,
    fontStyle: 'italic',
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
    backgroundColor: Colors.text,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.md,
  },
  playBtnText: {
    color: Colors.background,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
    marginLeft: Spacing.xs,
  },
  focusedBtnText: {
    color: Colors.text,
  },
  watchlistButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  watchlistBtnText: {
    color: Colors.text,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
    marginLeft: Spacing.xs,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  body: {
    marginTop: Spacing.lg,
  },
  section: {
    marginVertical: Spacing.md,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: Typography.sizes.sectionHeader,
    fontWeight: Typography.weights.bold,
    paddingHorizontal: Spacing.rowPadding,
    marginBottom: Spacing.md,
  },
  castList: {
    paddingHorizontal: Spacing.rowPadding,
  },
  castCard: {
    width: 100,
    marginRight: Spacing.lg,
    alignItems: 'center',
  },
  castAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.xs,
  },
  castName: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    width: '100%',
  },
  castCharacter: {
    color: Colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
    width: '100%',
  },
  seasonList: {
    paddingHorizontal: Spacing.rowPadding,
  },
  seasonCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Spacing.borderRadius,
    marginRight: Spacing.md,
    width: 150,
    alignItems: 'flex-start',
  },
  seasonTitleText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  episodeCountText: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: Spacing.xs,
  },
});

export default DetailsScreen;
