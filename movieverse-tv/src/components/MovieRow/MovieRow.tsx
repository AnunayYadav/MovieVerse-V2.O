import React, { useRef } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import MovieCard from '../MovieCard/MovieCard';
import { Movie } from '../../types';
import Colors from '../../theme/colors';
import Spacing from '../../theme/spacing';
import Typography from '../../theme/typography';

interface MovieRowProps {
  title: string;
  movies: Movie[];
  onMoviePress: (movie: Movie) => void;
  onMovieFocus?: (movie: Movie) => void;
}

export const MovieRow: React.FC<MovieRowProps> = React.memo(({
  title,
  movies,
  onMoviePress,
  onMovieFocus,
}) => {
  const listRef = useRef<FlatList>(null);

  if (!movies || movies.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.rowTitle}>{title}</Text>
      
      <FlatList
        ref={listRef}
        data={movies}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => `movie-card-${item.id}`}
        renderItem={({ item }) => (
          <MovieCard
            movie={item}
            onPress={onMoviePress}
            onFocus={onMovieFocus}
          />
        )}
        contentContainerStyle={styles.listContainer}
        
        // Virtualization & performance optimizations
        windowSize={3}
        maxToRenderPerBatch={5}
        initialNumToRender={5}
        removeClippedSubviews={true}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.md,
  },
  rowTitle: {
    color: Colors.text,
    fontSize: Typography.sizes.sectionHeader,
    fontWeight: Typography.weights.bold,
    paddingHorizontal: Spacing.rowPadding,
    marginBottom: Spacing.sm,
  },
  listContainer: {
    paddingHorizontal: Spacing.rowPadding,
  },
});

export default MovieRow;
