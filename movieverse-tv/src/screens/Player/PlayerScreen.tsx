import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, BackHandler, Pressable } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { WebView } from 'react-native-webview';
import { X } from 'lucide-react-native';

import { RootStackParamList } from '../../navigation/AppNavigator';
import Colors from '../../theme/colors';
import Spacing from '../../theme/spacing';
import FocusableButton from '../../components/FocusableButton/FocusableButton';

type PlayerScreenRouteProp = RouteProp<RootStackParamList, 'Player'>;
type PlayerScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Player'>;

export const PlayerScreen: React.FC = () => {
  const route = useRoute<PlayerScreenRouteProp>();
  const navigation = useNavigation<PlayerScreenNavigationProp>();
  const webViewRef = useRef<WebView>(null);

  const { mediaId, mediaType, season = 1, episode = 1 } = route.params;

  const isTvShow = mediaType === 'tv';
  const embedUrl = isTvShow 
    ? `https://player.videasy.net/tv/${mediaId}/${season}/${episode}?nextEpisode=true&autoplayNextEpisode=true&episodeSelector=true&overlay=false&color=E50914&autoplay=true`
    : `https://player.videasy.net/movie/${mediaId}?overlay=false&color=E50914&autoplay=true`;

  // Handle hardware Back press on Android TV
  useEffect(() => {
    const handleBackPress = () => {
      // Navigate back to Details screen
      navigation.goBack();
      return true; // prevent default behavior
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => {
      subscription.remove();
    };
  }, [navigation]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: embedUrl }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsFullscreenVideo={true}
        userAgent="Mozilla/5.0 (Linux; Android 10; SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Mobile Safari/537.36"
      />

      {/* Floating close button - focused first */}
      <View style={styles.closeBtnContainer}>
        <FocusableButton 
          onPress={() => navigation.goBack()} 
          style={styles.closeButton}
          scaleOnFocus={1.1}
        >
          <X size={20} stroke={Colors.text} />
        </FocusableButton>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
  closeBtnContainer: {
    position: 'absolute',
    top: Spacing.xl,
    right: Spacing.xl,
    zIndex: 100,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
});

export default PlayerScreen;
