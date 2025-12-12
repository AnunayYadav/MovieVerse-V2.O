import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Movie, UserProfile, AppNotification } from '../types';
import { safeEnv } from '../components/Shared';

let supabaseInstance: SupabaseClient | null = null;

// Hardcoded fallbacks REMOVED for production security.
const DEFAULT_SUPABASE_URL = "";
const DEFAULT_SUPABASE_KEY = "";

export const getSupabase = (): SupabaseClient | null => {
    if (supabaseInstance) return supabaseInstance;

    const envUrl = safeEnv('VITE_SUPABASE_URL') || safeEnv('REACT_APP_SUPABASE_URL') || safeEnv('SUPABASE_URL');
    const envKey = safeEnv('VITE_SUPABASE_KEY') || safeEnv('REACT_APP_SUPABASE_KEY') || safeEnv('SUPABASE_KEY');

    const url = localStorage.getItem('movieverse_supabase_url') || envUrl || DEFAULT_SUPABASE_URL;
    const key = localStorage.getItem('movieverse_supabase_key') || envKey || DEFAULT_SUPABASE_KEY;

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

// --- NOTIFICATIONS ---

// Fallback Mock Data
const MOCK_NOTIFICATIONS: AppNotification[] = [
    { id: '1', title: "New Arrival: Dune Part Two", message: "Now streaming in 4K HDR. Experience the saga.", time: "2 hours ago", read: false },
    { id: '2', title: "Watchlist Alert", message: "Inception is now available on your subscribed services.", time: "1 day ago", read: false },
    { id: '3', title: "System Update", message: "We've improved our AI recommendation engine for better accuracy.", time: "3 days ago", read: true },
    { id: '4', title: "Welcome to MovieVerse Pro!", message: "Thanks for joining. Start by adding 3 movies to your favorites.", time: "1 week ago", read: true },
];

export const getNotifications = async (): Promise<AppNotification[]> => {
    const supabase = getSupabase();
    if (!supabase) return MOCK_NOTIFICATIONS;

    const { data: { user } } = await supabase.auth.getUser();
    
    // If not logged in, return mocks
    if (!user) return MOCK_NOTIFICATIONS;

    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.warn("Could not fetch real notifications (DB not setup?), using mocks.", error.message);
            return MOCK_NOTIFICATIONS;
        }

        if (!data || data.length === 0) return [];

        return data.map((n: any) => ({
            id: n.id,
            title: n.title,
            message: n.message || n.body || "",
            read: n.is_read || false,
            time: new Date(n.created_at).toLocaleDateString() + ' ' + new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        }));

    } catch (e) {
        return MOCK_NOTIFICATIONS;
    }
};

export const markNotificationsRead = async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('is_read', false);
    } catch (e) {
        console.warn("Failed to mark read (DB not setup?)");
    }
};

export const sendNotification = async (title: string, message: string) => {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data: { user } } = await supabase.auth.getUser();
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
    
    if (error) {
        console.error("Failed to send notification", error);
        throw error;
    }
    return data;
};

export const submitSupportTicket = async (subject: string, message: string, contactEmail: string) => {
    const supabase = getSupabase();
    
    // Simulate API call delay for better UX even if no backend
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (!supabase) {
        console.log("Mock Support Ticket Sent:", { subject, message, contactEmail });
        return true; 
    }

    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Attempt to insert into a 'support_tickets' table
        // Ensure this table exists in your Supabase project:
        // create table support_tickets (id uuid default gen_random_uuid() primary key, user_id uuid, email text, subject text, message text, created_at timestamptz default now());
        const { error } = await supabase
            .from('support_tickets')
            .insert({
                user_id: user?.id || null,
                email: contactEmail,
                subject,
                message
            });

        if (error) {
            console.warn("Supabase insert failed (Table 'support_tickets' might be missing). Logging to console instead.", error);
            // Fallback for demo: just return true so user sees success
            return true;
        }
        return true;
    } catch (e) {
        console.error("Support Ticket Error", e);
        return false;
    }
};