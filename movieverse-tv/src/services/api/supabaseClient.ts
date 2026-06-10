import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { Movie, UserProfile, AppNotification, UserSettings } from '../../types';

let supabaseInstance: SupabaseClient | null = null;
let supabaseUrlCache: string | null = null;
let supabaseKeyCache: string | null = null;

// Preload configurations from storage at startup
export const initSupabase = async (): Promise<void> => {
  try {
    supabaseUrlCache = await AsyncStorage.getItem('movieverse_supabase_url');
    supabaseKeyCache = await AsyncStorage.getItem('movieverse_supabase_key');
    if (supabaseUrlCache && supabaseKeyCache) {
      supabaseInstance = createClient(supabaseUrlCache, supabaseKeyCache, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        }
      });
    }
  } catch (e) {
    console.error("Supabase pre-init failed:", e);
  }
};

export const getSupabase = (): SupabaseClient | null => {
  if (supabaseInstance) return supabaseInstance;

  const envUrl = (process as any).env?.SUPABASE_URL || "";
  const envKey = (process as any).env?.SUPABASE_KEY || "";

  const url = supabaseUrlCache || envUrl;
  const key = supabaseKeyCache || envKey;

  if (url && key) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        }
      });
      return supabaseInstance;
    } catch (e) {
      console.error("Invalid Supabase Config", e);
      return null;
    }
  }
  return null;
};

export const updateSupabaseConfig = async (url: string, key: string): Promise<void> => {
  try {
    await AsyncStorage.setItem('movieverse_supabase_url', url);
    await AsyncStorage.setItem('movieverse_supabase_key', key);
    supabaseUrlCache = url;
    supabaseKeyCache = key;
    supabaseInstance = createClient(url, key, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      }
    });
  } catch (e) {
    console.error("Failed to save Supabase config:", e);
  }
};

// Helper: get current user ID from cached session (no network call)
const getCurrentUserId = async (): Promise<{ id: string; email?: string } | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  return { id: session.user.id, email: session.user.email };
};

// --- AUTHENTICATION ---

export const signInWithGoogle = async () => {
  // OAuth redirects are not directly supported without complex deep-linking.
  // We recommend using standard email/password login on TVs.
  Alert.alert("Unsupported Feature", "Google Sign-In is not supported on Android TV. Please sign in with your email and password.");
  throw new Error("OAuth Google Sign-in not supported on TV platforms.");
};

export const signInWithEmail = async (email: string, password: string) => {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

export const signUpWithEmail = async (email: string, password: string, metaData: any) => {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.auth.signUp({ 
    email, 
    password,
    options: { data: metaData } 
  });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.auth.signOut();
};

// --- DATABASE SYNC ---

export interface UserData {
  watchlist: Movie[];
  favorites: Movie[];
  watched: Movie[];
  customLists: Record<string, Movie[]>;
  profile: UserProfile;
  settings?: UserSettings;
  searchHistory?: string[];
}

export const syncUserData = async (userData: UserData) => {
  const supabase = getSupabase();
  if (!supabase) return;

  const user = await getCurrentUserId();
  if (!user) return;

  const { error } = await supabase
    .from('user_data')
    .upsert({
      id: user.id,
      email: user.email,
      watchlist: userData.watchlist,
      favorites: userData.favorites,
      watched: userData.watched,
      custom_lists: userData.customLists,
      profile: userData.profile,
      settings: userData.settings,
      search_history: userData.searchHistory,
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error("Sync Error:", error);
  }
};

export const fetchUserData = async (): Promise<UserData | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const user = await getCurrentUserId();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_data')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return {
        watchlist: [],
        favorites: [],
        watched: [],
        customLists: {},
        profile: { name: "New User", age: "", genres: [] },
        settings: {},
        searchHistory: []
      };
    }
    console.warn("Fetch Error", error);
    return null;
  }

  if (!data) return null;

  const fetchedProfile = data.profile || { name: "", age: "", genres: [] };
  if (data.can_watch === true) {
    fetchedProfile.canWatch = true;
  }

  return {
    watchlist: data.watchlist || [],
    favorites: data.favorites || [],
    watched: data.watched || [],
    customLists: data.custom_lists || {},
    profile: fetchedProfile,
    settings: data.settings || {},
    searchHistory: data.search_history || []
  };
};

// --- NOTIFICATIONS ---

export const getNotifications = async (): Promise<AppNotification[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const user = await getCurrentUserId();
    if (!user) return [];

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return [];

    return (data || []).map((n: any) => ({
      id: n.id,
      title: n.title,
      message: n.message || n.body || "",
      read: n.is_read || false,
      time: new Date(n.created_at).toLocaleDateString() + ' ' + new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    }));

  } catch (e) {
    console.error("Notification Fetch Exception", e);
    return [];
  }
};

export const markNotificationsRead = async () => {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const user = await getCurrentUserId();
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
  } catch (e) {
    console.warn("Failed to mark read");
  }
};

export const sendNotification = async (title: string, message: string) => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const user = await getCurrentUserId();
  if (!user) return null;

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: user.id,
      title,
      message,
      is_read: false
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const triggerSystemNotification = (title: string, body: string) => {
  // Display a local alert in place of HTML5 web Notification API
  Alert.alert(title, body);
};

export const submitSupportTicket = async (subject: string, message: string, contactEmail: string) => {
  const supabase = getSupabase();
  await new Promise(resolve => setTimeout(resolve, 1500));

  if (!supabase) return true; 

  try {
    const user = await getCurrentUserId();
    const { error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: user?.id || null,
        email: contactEmail,
        subject,
        message
      });

    if (error) return true;
    return true;
  } catch (e) {
    return false;
  }
};

// --- WATCH PROGRESS ---

export const upsertWatchProgress = async (
  mediaId: number,
  mediaType: string,
  progress: number,
  currentTime: number,
  duration: number,
  season?: number,
  episode?: number
) => {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const user = await getCurrentUserId();
    if (!user) return;

    const { error } = await supabase
      .from('watch_progress')
      .upsert({
        user_id: user.id,
        media_id: mediaId,
        media_type: mediaType,
        progress,
        current_time: currentTime,
        duration,
        season: season || null,
        episode: episode || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,media_id,media_type'
      });

    if (error) {
      console.error("Error upserting watch progress:", error);
    }
  } catch (e) {
    console.error("Watch progress sync exception", e);
  }
};

export const fetchWatchProgress = async (mediaId: number, mediaType: string) => {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const user = await getCurrentUserId();
    if (!user) return null;

    const { data, error } = await supabase
      .from('watch_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('media_id', mediaId)
      .eq('media_type', mediaType)
      .maybeSingle();

    if (error) {
      console.error("Error fetching watch progress:", error);
      return null;
    }
    return data;
  } catch (e) {
    console.error("Watch progress fetch exception", e);
    return null;
  }
};

// --- WATCH PARTY LIFE CYCLE ---

export const createWatchPartyRoom = async (
  mediaId: number,
  mediaType: string,
  season?: number,
  episode?: number
): Promise<string | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const user = await getCurrentUserId();
    if (!user) return null;

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let roomCode = '';
    for (let i = 0; i < 5; i++) {
      roomCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const { error } = await supabase
      .from('watch_parties')
      .insert({
        id: roomCode,
        host_id: user.id,
        media_id: mediaId,
        media_type: mediaType,
        season: season || null,
        episode: episode || null,
        current_time: 0,
        is_playing: true,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error("Error creating watch party room:", error);
      return null;
    }

    return roomCode;
  } catch (e) {
    console.error("Watch party creation exception", e);
    return null;
  }
};

export const getWatchPartyRoom = async (roomCode: string): Promise<any | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('watch_parties')
      .select('*')
      .eq('id', roomCode.toUpperCase())
      .maybeSingle();

    if (error) {
      console.error("Error fetching watch party room:", error);
      return null;
    }
    return data;
  } catch (e) {
    console.error("Watch party fetch exception", e);
    return null;
  }
};

export const updateWatchPartyRoom = async (roomCode: string, updates: any): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('watch_parties')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', roomCode.toUpperCase());

    if (error) {
      console.error("Error updating watch party room:", error);
    }
  } catch (e) {
    console.error("Watch party update exception", e);
  }
};

export const deleteWatchPartyRoom = async (roomCode: string): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('watch_parties')
      .delete()
      .eq('id', roomCode.toUpperCase());

    if (error) {
      console.error("Error deleting watch party room:", error);
    }
  } catch (e) {
    console.error("Watch party delete exception", e);
  }
};
