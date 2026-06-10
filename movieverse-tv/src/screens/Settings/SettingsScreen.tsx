import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  ScrollView, 
  Alert 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ArrowLeft, Save } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { RootStackParamList } from '../../navigation/AppNavigator';
import { getSupabase, updateSupabaseConfig } from '../../services/api/supabaseClient';
import Colors from '../../theme/colors';
import Spacing from '../../theme/spacing';
import Typography from '../../theme/typography';
import FocusableButton from '../../components/FocusableButton/FocusableButton';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  
  const [tmdbKey, setTmdbKey] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [supabaseConnected, setSupabaseConnected] = useState(false);

  const [tmdbFocused, setTmdbFocused] = useState(false);
  const [urlFocused, setUrlFocused] = useState(false);
  const [keyFocused, setKeyFocused] = useState(false);

  // Load values on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedTmdb = await AsyncStorage.getItem('movieverse_tmdb_key') || '';
        const storedUrl = await AsyncStorage.getItem('movieverse_supabase_url') || '';
        const storedKey = await AsyncStorage.getItem('movieverse_supabase_key') || '';
        
        setTmdbKey(storedTmdb);
        setSupabaseUrl(storedUrl);
        setSupabaseKey(storedKey);

        const client = getSupabase();
        setSupabaseConnected(client !== null);
      } catch (e) {
        console.warn("Failed to load settings from storage", e);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    try {
      await AsyncStorage.setItem('movieverse_tmdb_key', tmdbKey);
      
      if (supabaseUrl && supabaseKey) {
        await updateSupabaseConfig(supabaseUrl, supabaseKey);
        setSupabaseConnected(true);
      } else {
        await AsyncStorage.removeItem('movieverse_supabase_url');
        await AsyncStorage.removeItem('movieverse_supabase_key');
        setSupabaseConnected(false);
      }

      Alert.alert("Success", "Settings saved successfully!");
    } catch (e) {
      Alert.alert("Error", "Failed to save settings.");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <FocusableButton 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <ArrowLeft size={20} stroke={Colors.text} />
        </FocusableButton>
        <Text style={styles.headerTitle}>System Settings</Text>
      </View>

      {/* Main Settings Form */}
      <View style={styles.form}>
        
        {/* TMDB API Key */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>TMDB API Key</Text>
          <View style={[styles.inputContainer, tmdbFocused && styles.inputFocused]}>
            <TextInput
              style={styles.input}
              value={tmdbKey}
              onChangeText={setTmdbKey}
              placeholder="Enter TMDB API Key..."
              placeholderTextColor={Colors.textMuted}
              secureTextEntry={true}
              onFocus={() => setTmdbFocused(true)}
              onBlur={() => setTmdbFocused(false)}
            />
          </View>
        </View>

        {/* Supabase URL */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Supabase URL</Text>
          <View style={[styles.inputContainer, urlFocused && styles.inputFocused]}>
            <TextInput
              style={styles.input}
              value={supabaseUrl}
              onChangeText={setSupabaseUrl}
              placeholder="https://your-project.supabase.co"
              placeholderTextColor={Colors.textMuted}
              onFocus={() => setUrlFocused(true)}
              onBlur={() => setUrlFocused(false)}
            />
          </View>
        </View>

        {/* Supabase Key */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Supabase Annon Key</Text>
          <View style={[styles.inputContainer, keyFocused && styles.inputFocused]}>
            <TextInput
              style={styles.input}
              value={supabaseKey}
              onChangeText={setSupabaseKey}
              placeholder="Enter Supabase Annon Key..."
              placeholderTextColor={Colors.textMuted}
              secureTextEntry={true}
              onFocus={() => setKeyFocused(true)}
              onBlur={() => setKeyFocused(false)}
            />
          </View>
        </View>

        {/* Connection Status Badge */}
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Supabase Status: </Text>
          <Text style={[
            styles.statusBadge, 
            supabaseConnected ? styles.statusConnected : styles.statusDisconnected
          ]}>
            {supabaseConnected ? 'Connected' : 'Not Configured'}
          </Text>
        </View>

        {/* Save Button */}
        <FocusableButton onPress={handleSave} style={styles.saveButton}>
          {({ focused }) => (
            <View style={styles.saveBtnContent}>
              <Save size={20} stroke={focused ? Colors.background : Colors.text} />
              <Text style={[styles.saveBtnText, focused && styles.focusedBtnText]}>Save Settings</Text>
            </View>
          )}
        </FocusableButton>

      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: Spacing.rowPadding,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl * 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    marginRight: Spacing.md,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
  },
  form: {
    maxWidth: 600,
    alignSelf: 'stretch',
  },
  formGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    color: Colors.text,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    marginBottom: Spacing.xs,
  },
  inputContainer: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.borderRadius,
    paddingHorizontal: Spacing.md,
    height: 44,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
  },
  inputFocused: {
    borderColor: Colors.focus,
  },
  input: {
    color: Colors.text,
    fontSize: Typography.sizes.body,
    padding: 0,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  statusLabel: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  statusBadge: {
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Spacing.borderRadiusSm,
  },
  statusConnected: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    color: Colors.success,
  },
  statusDisconnected: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: Colors.error,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    height: 44,
    marginTop: Spacing.lg,
  },
  saveBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveBtnText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: Spacing.xs,
  },
  focusedBtnText: {
    color: Colors.background,
  },
});

export default SettingsScreen;
