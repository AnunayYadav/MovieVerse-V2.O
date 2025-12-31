
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Movie, UserProfile, AppNotification, WatchParty } from '../types';
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

export interface UserSettings {
    tmdbKey?: string;
    geminiKey?: string;
}

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
            settings: userData.settings, // Sync API Keys/Settings
            search_history: userData.searchHistory, // Sync Search History
            updated_at: new Date().toISOString()
        });

    if (error) {
        console.error("Sync Error:", error);
        // Alert developer/user if the table is missing
        if (error.code === '42P01') { 
            triggerSystemNotification(
                "Database Setup Required",
                "The 'user_data' table is missing in Supabase. Please run the SQL setup script."
            );
        }
    }
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

    if (error) {
        // Code 42P01: Undefined Table (Table doesn't exist)
        if (error.code === '42P01') {
            console.error("Supabase Table Missing: user_data");
            triggerSystemNotification("Database Error", "Missing 'user_data' table. Run SQL script.");
            return null;
        }
        
        // Code PGRST116: JSON object requested, multiple (or no) rows returned
        // This usually means the user is Authenticated but has NO data row yet (New User).
        // We should return a default object so the App treats them as a valid fresh user.
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

    // Map database profile + permission flags to app UserProfile
    const fetchedProfile = data.profile || { name: "", age: "", genres: [] };
    // Gatekeeper Logic: Check the 'can_watch' column in the database
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
    // Strictly return empty if no backend configured
    if (!supabase) return [];

    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // If not logged in, return empty
        if (!user) return [];

        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.warn("Failed to fetch notifications:", error.message);
            // Return empty array on error instead of mocks
            return [];
        }

        // Return actual data or empty array if null
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
        const { data: { user } } = await supabase.auth.getUser();
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

export const triggerSystemNotification = (title: string, body: string) => {
    if (!("Notification" in window)) return;
    
    if (Notification.permission === "granted") {
        new Notification(title, { body });
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                new Notification(title, { body });
            }
        });
    }
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

// --- WATCH PARTY MANAGEMENT (Local Mock for Demo Reliability) ---

const PARTY_KEY = 'movieverse_parties';

const getParties = (): WatchParty[] => {
    const stored = localStorage.getItem(PARTY_KEY);
    return stored ? JSON.parse(stored) : [];
};

const saveParties = (parties: WatchParty[]) => {
    localStorage.setItem(PARTY_KEY, JSON.stringify(parties));
};

export const createWatchParty = async (name: string, isPrivate: boolean, password?: string, hostName?: string, movie?: Movie): Promise<WatchParty> => {
    // Simulate network delay
    await new Promise(r => setTimeout(r, 500));
    
    const newParty: WatchParty = {
        id: Math.random().toString(36).substr(2, 6).toUpperCase(), // Short room ID
        name,
        hostName: hostName || "Anonymous",
        isPrivate,
        password,
        movie,
        viewers: 1,
        settings: {
            allowChat: true,
            allowControls: false // By default only host controls
        },
        createdAt: Date.now()
    };

    const parties = getParties();
    parties.push(newParty);
    saveParties(parties);
    return newParty;
};

export const joinWatchParty = async (partyId: string, password?: string): Promise<WatchParty | null> => {
    await new Promise(r => setTimeout(r, 600));
    const parties = getParties();
    const party = parties.find(p => p.id === partyId);
    
    if (!party) throw new Error("Party not found");
    if (party.isPrivate && party.password !== password) throw new Error("Incorrect Password");
    
    // Increment viewer count mock
    party.viewers += 1;
    saveParties(parties);
    
    return party;
};

export const getPublicParties = async (): Promise<WatchParty[]> => {
    await new Promise(r => setTimeout(r, 400));
    const parties = getParties();
    // Return all parties for the list, UI can indicate locked status
    return parties.sort((a,b) => b.createdAt - a.createdAt);
};

export const updatePartySettings = async (partyId: string, settings: any) => {
    const parties = getParties();
    const idx = parties.findIndex(p => p.id === partyId);
    if (idx !== -1) {
        parties[idx].settings = { ...parties[idx].settings, ...settings };
        saveParties(parties);
    }
};

export const updatePartyMovie = async (partyId: string, movie: Movie) => {
    const parties = getParties();
    const idx = parties.findIndex(p => p.id === partyId);
    if (idx !== -1) {
        parties[idx].movie = movie;
        saveParties(parties);
    }
};
