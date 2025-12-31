
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Movie, UserProfile, AppNotification, WatchParty, PartyMessage } from '../types';
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

    const { data: { user } } = await supabase.auth.getUser();
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
        const { data: { user } } = await supabase.auth.getUser();
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
    
    if (error) throw error;
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
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (!supabase) return true; 

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

        if (error) return true;
        return true;
    } catch (e) {
        return false;
    }
};

// --- WATCH PARTY MANAGEMENT (REALTIME SUPABASE) ---

export const createWatchParty = async (name: string, isPrivate: boolean, password?: string, hostName?: string, movie?: Movie): Promise<WatchParty> => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase not configured");

    const id = Math.random().toString(36).substr(2, 6).toUpperCase();
    
    const { data, error } = await supabase
        .from('watch_parties')
        .insert({
            id,
            name,
            host_name: hostName || "Anonymous",
            is_private: isPrivate,
            password: password,
            movie_data: movie,
            settings: { allowChat: true, allowControls: false, coHosts: [] }
        })
        .select()
        .single();

    if (error) throw error;

    return {
        id: data.id,
        name: data.name,
        hostName: data.host_name,
        isPrivate: data.is_private,
        password: data.password,
        movie: data.movie_data,
        settings: data.settings,
        viewers: 1,
        createdAt: new Date(data.created_at).getTime()
    };
};

export const deleteWatchParty = async (partyId: string) => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { error } = await supabase.from('watch_parties').delete().eq('id', partyId);
    if (error) console.error("Error closing party:", error);
};

export const joinWatchParty = async (partyId: string, password?: string): Promise<WatchParty | null> => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase not configured");

    const { data, error } = await supabase
        .from('watch_parties')
        .select('*')
        .eq('id', partyId)
        .single();

    if (error) throw new Error("Party not found");
    if (data.is_private && data.password !== password) throw new Error("Incorrect Password");

    return {
        id: data.id,
        name: data.name,
        hostName: data.host_name,
        isPrivate: data.is_private,
        password: data.password,
        movie: data.movie_data,
        settings: data.settings,
        viewers: 1, 
        createdAt: new Date(data.created_at).getTime()
    };
};

export const getPublicParties = async (): Promise<WatchParty[]> => {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('watch_parties')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) return [];

    return data.map((p: any) => ({
        id: p.id,
        name: p.name,
        hostName: p.host_name,
        isPrivate: p.is_private,
        password: p.password,
        movie: p.movie_data,
        settings: p.settings,
        viewers: 0,
        createdAt: new Date(p.created_at).getTime()
    }));
};

export const updatePartySettings = async (partyId: string, settings: any) => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from('watch_parties').update({ settings }).eq('id', partyId);
};

export const updatePartyMovie = async (partyId: string, movie: Movie) => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from('watch_parties').update({ movie_data: movie }).eq('id', partyId);
};

export const sendPartyMessage = async (partyId: string, userName: string, content: string, isSystem: boolean = false) => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from('watch_party_messages').insert({
        party_id: partyId,
        user_name: userName,
        content,
        is_system: isSystem
    });
};

export const subscribeToParty = (
    partyId: string, 
    userProfile: UserProfile,
    callbacks: {
        onMessage: (msg: PartyMessage) => void,
        onUpdate: (party: Partial<WatchParty>) => void,
        onViewersUpdate: (count: number, viewers: any[]) => void,
        onDelete: () => void
    }
) => {
    const supabase = getSupabase();
    if (!supabase) return () => {};

    // 1. Subscribe to DB Changes (Messages & Settings & DELETE)
    const dbChannel = supabase.channel(`party-db:${partyId}`)
        .on(
            'postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'watch_party_messages', filter: `party_id=eq.${partyId}` }, 
            (payload) => {
                callbacks.onMessage({
                    id: payload.new.id,
                    user: payload.new.user_name,
                    text: payload.new.content,
                    timestamp: new Date(payload.new.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                    isSystem: payload.new.is_system
                });
            }
        )
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'watch_parties', filter: `id=eq.${partyId}` },
            (payload) => {
                const p = payload.new;
                callbacks.onUpdate({
                    movie: p.movie_data,
                    settings: p.settings
                });
            }
        )
        .on(
            'postgres_changes',
            { event: 'DELETE', schema: 'public', table: 'watch_parties', filter: `id=eq.${partyId}` },
            () => {
                callbacks.onDelete();
            }
        )
        .subscribe();

    // 2. Subscribe to Presence (Viewers)
    const presenceChannel = supabase.channel(`party-presence:${partyId}`, {
        config: { presence: { key: userProfile.name } }
    });

    presenceChannel
        .on('presence', { event: 'sync' }, () => {
            const state = presenceChannel.presenceState();
            let count = 0;
            const viewers: any[] = [];
            for (const key in state) {
                count += state[key].length;
                viewers.push(...state[key]);
            }
            callbacks.onViewersUpdate(count, viewers);
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await presenceChannel.track({
                    user: userProfile.name,
                    avatar: userProfile.avatar || "",
                    online_at: new Date().toISOString()
                });
            }
        });

    return () => {
        supabase.removeChannel(dbChannel);
        supabase.removeChannel(presenceChannel);
    };
};
