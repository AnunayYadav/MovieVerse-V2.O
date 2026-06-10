import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import AppNavigator from './src/navigation/AppNavigator';
import queryClient from './src/services/cache/queryClient';
import { initSupabase } from './src/services/api/supabaseClient';

export function App(): React.JSX.Element {
  useEffect(() => {
    // Preload Supabase tokens and auth session from AsyncStorage on boot
    initSupabase();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <AppNavigator />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

export default App;
