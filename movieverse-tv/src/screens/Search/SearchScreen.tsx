import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  FlatList, 
  StyleSheet, 
  Dimensions 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Search, ArrowLeft } from 'lucide-react-native';

import { RootStackParamList } from '../../navigation/AppNavigator';
import { useSearchQuery } from '../../hooks/useMovieData';
import Colors from '../../theme/colors';
import Spacing from '../../theme/spacing';
import Typography from '../../theme/typography';
import MovieCard from '../../components/MovieCard/MovieCard';
import FocusableButton from '../../components/FocusableButton/FocusableButton';
import Loader from '../../components/Loading/Loader';
import { Movie } from '../../types';

type SearchScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Search'>;

export const SearchScreen: React.FC = () => {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const [query, setQuery] = useState('');
  const [inputFocused, setInputFocused] = useState(false);

  // Search query hook
  const { data, isLoading } = useSearchQuery(query);

  const results = data?.results || [];

  const handleMoviePress = (movie: Movie) => {
    navigation.navigate('Details', {
      mediaId: movie.id,
      mediaType: movie.media_type === 'tv' ? 'tv' : 'movie',
    });
  };

  return (
    <View style={styles.container}>
      {/* Header Search Bar */}
      <View style={styles.header}>
        <FocusableButton 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <ArrowLeft size={20} stroke={Colors.text} />
        </FocusableButton>

        <View style={[styles.searchBar, inputFocused && styles.searchBarFocused]}>
          <Search size={20} stroke={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Search movies, TV shows, and people..."
            placeholderTextColor={Colors.textMuted}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            autoFocus={true}
          />
        </View>
      </View>

      {/* Results Section */}
      <View style={styles.resultsContainer}>
        {isLoading ? (
          <Loader />
        ) : query.length > 2 && results.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No results found for "{query}".</Text>
          </View>
        ) : query.length <= 2 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.promptText}>Type 3 or more characters to search...</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => `search-item-${item.id}`}
            numColumns={4}
            contentContainerStyle={styles.gridContainer}
            columnWrapperStyle={styles.gridColumnWrapper}
            renderItem={({ item }) => (
              <MovieCard
                movie={item}
                onPress={handleMoviePress}
              />
            )}
            windowSize={3}
            maxToRenderPerBatch={8}
            initialNumToRender={8}
            removeClippedSubviews={true}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.rowPadding,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    marginRight: Spacing.md,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Spacing.borderRadius,
    paddingHorizontal: Spacing.md,
    height: 44,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  searchBarFocused: {
    borderColor: Colors.focus,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: Typography.sizes.body,
    padding: 0, // reset native input paddings
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: Spacing.rowPadding,
  },
  gridContainer: {
    paddingBottom: Spacing.xxl * 2,
  },
  gridColumnWrapper: {
    justifyContent: 'flex-start',
    marginBottom: Spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 16,
  },
  promptText: {
    color: Colors.textMuted,
    fontSize: 16,
  },
});

export default SearchScreen;
