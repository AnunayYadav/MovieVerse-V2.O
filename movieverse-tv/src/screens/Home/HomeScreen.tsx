import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

import HeroBanner from '../../components/HeroBanner/HeroBanner';
import MovieRow from '../../components/MovieRow/MovieRow';
import Loader from '../../components/Loading/Loader';
import Colors from '../../theme/colors';
import Spacing from '../../theme/spacing';

import {
  useTrendingQuery,
  usePopularQuery,
  usePlatformQuery,
  useRegionalQuery,
} from '../../hooks/useMovieData';
import { Movie } from '../../types';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [featuredMovie, setFeaturedMovie] = useState<Movie | null>(null);

  // Queries
  const { data: trending, isLoading: loadingTrending } = useTrendingQuery('all');
  const { data: popular, isLoading: loadingPopular } = usePopularQuery('movie');
  const { data: netflix, isLoading: loadingNetflix } = usePlatformQuery(8); // Netflix provider id
  const { data: prime, isLoading: loadingPrime } = usePlatformQuery(119); // Prime provider id
  const { data: disney, isLoading: loadingDisney } = usePlatformQuery(337); // Disney provider id
  const { data: hindi, isLoading: loadingHindi } = useRegionalQuery('hi');
  const { data: south, isLoading: loadingSouth } = useRegionalQuery('te|ta|kn');

  // Set initial featured movie to the first trending item
  useEffect(() => {
    if (trending && trending.length > 0 && !featuredMovie) {
      setFeaturedMovie(trending[0]);
    }
  }, [trending]);

  const handleMoviePress = (movie: Movie) => {
    navigation.navigate('Details', {
      mediaId: movie.id,
      mediaType: movie.media_type === 'tv' ? 'tv' : 'movie',
    });
  };

  const handleMovieFocus = (movie: Movie) => {
    setFeaturedMovie(movie);
  };

  const isScreenLoading = 
    loadingTrending && 
    loadingPopular && 
    loadingNetflix && 
    loadingPrime;

  if (isScreenLoading) {
    return <Loader fullScreen />;
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      removeClippedSubviews={true}
    >
      {/* Featured Header Hero Banner */}
      <HeroBanner
        movie={featuredMovie}
        onPlayPress={handleMoviePress}
        onInfoPress={handleMoviePress}
      />

      <View style={styles.rowsContainer}>
        {/* Horizontal Rows */}
        <MovieRow
          title="Trending Now"
          movies={trending || []}
          onMoviePress={handleMoviePress}
          onMovieFocus={handleMovieFocus}
        />

        <MovieRow
          title="Blockbuster Hits"
          movies={popular || []}
          onMoviePress={handleMoviePress}
          onMovieFocus={handleMovieFocus}
        />

        <MovieRow
          title="Netflix Originals"
          movies={netflix || []}
          onMoviePress={handleMoviePress}
          onMovieFocus={handleMovieFocus}
        />

        <MovieRow
          title="Prime Video Picks"
          movies={prime || []}
          onMoviePress={handleMoviePress}
          onMovieFocus={handleMovieFocus}
        />

        <MovieRow
          title="Disney+ Collection"
          movies={disney || []}
          onMoviePress={handleMoviePress}
          onMovieFocus={handleMovieFocus}
        />

        <MovieRow
          title="Bollywood Hits (Hindi)"
          movies={hindi || []}
          onMoviePress={handleMoviePress}
          onMovieFocus={handleMovieFocus}
        />

        <MovieRow
          title="South Indian Mass Cinema"
          movies={south || []}
          onMoviePress={handleMoviePress}
          onMovieFocus={handleMovieFocus}
        />
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
  rowsContainer: {
    marginTop: -Spacing.xl, // pull rows slightly over the banner bottom gradient
  },
});

export default HomeScreen;
