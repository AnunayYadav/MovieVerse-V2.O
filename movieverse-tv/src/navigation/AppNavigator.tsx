import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import HomeScreen from '../screens/Home/HomeScreen';
import SearchScreen from '../screens/Search/SearchScreen';
import DetailsScreen from '../screens/Details/DetailsScreen';
import PlayerScreen from '../screens/Player/PlayerScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';

export type RootStackParamList = {
  Home: undefined;
  Search: undefined;
  Details: { mediaId: number; mediaType: 'movie' | 'tv' };
  Player: { mediaId: number; mediaType: 'movie' | 'tv'; season?: number; episode?: number; title: string };
  Settings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#000000' },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="Details" component={DetailsScreen} />
        <Stack.Screen name="Player" component={PlayerScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
