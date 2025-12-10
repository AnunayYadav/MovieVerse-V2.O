import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Movie, UserProfile } from '../types';

let supabaseInstance: SupabaseClient | null = null;

const DEFAULT_SUPABASE_URL = "https://ieclcfngpqxknggeurpo.supabase.co";
const DEFAULT_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllY2xjZm5ncHF4a25nZ2V1cnBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNDMxMDgsImV4cCI6MjA4MDkxOTEwOH0.FNg_ToqN2ZvkmYhBoOYJhIxmcYEVOY0yvSPZcICivGs";

export const getSupabase = (): SupabaseClient | null => {
    if (supabaseInstance) return supabaseInstance;

    const url = localStorage.getItem('movieverse_supabase_url') || DEFAULT_SUPABASE_URL;
    const key = localStorage.getItem('movieverse_supabase_key') || DEFAULT_SUPABASE_KEY;

    if (url && key) {
        try {
            supabaseInstance = createClient(url, key);
            return supabaseInstance;
        } catch (e) {
            console.error("Invalid Supabase Config", e);
            return null;
        }
    }
    return null;
};

// --- AUTHENTICATION ---

export const signInWithGoogle = async () => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase not configured");
    
    // Redirect flow
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin
        }
    });
    if (error) throw error;
    return data;
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
}

export const syncUserData = async (userData: UserData) => {
    const supabase = getSupabase();
    if (!supabase) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Upsert into 'user_data' table
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
            updated_at: new Date().toISOString()
        });

    if (error) console.error("Sync Error:", error);
};

export const fetchUserData = async (): Promise<UserData | null> => {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('user_data')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error || !data) return null;

    return {
        watchlist: data.watchlist || [],
        favorites: data.favorites || [],
        watched: data.watched || [],
        customLists: data.custom_lists || {},
        profile: data.profile || { name: "", age: "", genres: [] }
    };
};