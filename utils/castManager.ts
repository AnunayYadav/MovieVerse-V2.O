import { useState, useEffect } from 'react';

declare const window: any;

export interface CastSessionState {
    isAvailable: boolean;
    isCasting: boolean;
    deviceName: string | null;
}

let castContext: any = null;
const castListeners = new Set<(state: CastSessionState) => void>();
const currentState: CastSessionState = {
    isAvailable: false,
    isCasting: false,
    deviceName: null
};

/**
 * Dynamically injects Google Cast Sender SDK and sets up listener.
 */
export function initCastSDK() {
    if (typeof window === 'undefined') return;

    window.__onGCastApiAvailable = (isAvailable: boolean) => {
        if (isAvailable && window.cast && window.cast.framework) {
            try {
                castContext = window.cast.framework.CastContext.getInstance();
                castContext.setOptions({
                    receiverApplicationId: window.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
                    autoJoinPolicy: window.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
                });

                currentState.isAvailable = true;
                notifyListeners();

                // Listen to cast session changes
                castContext.addEventListener(
                    window.cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
                    (event: any) => {
                        const sessionState = event.sessionState;
                        const CastSessionState = window.cast.framework.SessionState;
                        
                        const isCasting = sessionState === CastSessionState.SESSION_STARTED || 
                                          sessionState === CastSessionState.SESSION_RESUMED;
                        
                        let deviceName = null;
                        if (isCasting) {
                            const session = castContext.getCurrentSession();
                            deviceName = session?.getCastDevice()?.getFriendlyName() || "Chromecast Device";
                        }

                        currentState.isCasting = isCasting;
                        currentState.deviceName = deviceName;
                        notifyListeners();
                    }
                );
            } catch (e) {
                console.error("Failed to initialize Google Cast Context:", e);
            }
        }
    };

    // Inject SDK script
    if (!document.getElementById('google-cast-sdk')) {
        const script = document.createElement('script');
        script.id = 'google-cast-sdk';
        script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
        document.body.appendChild(script);
    }
}

function notifyListeners() {
    castListeners.forEach(l => l({ ...currentState }));
}

export function subscribeToCastState(listener: (state: CastSessionState) => void) {
    castListeners.add(listener);
    listener({ ...currentState });
    return () => {
        castListeners.delete(listener);
    };
}

export async function startCastSession(streamUrl: string, title: string, logoUrl?: string) {
    if (!castContext) return false;

    try {
        let session = castContext.getCurrentSession();
        if (!session) {
            await castContext.requestSession();
            session = castContext.getCurrentSession();
        }

        if (session) {
            const mediaInfo = new window.chrome.cast.media.MediaInfo(streamUrl, 'application/x-mpegurl');
            mediaInfo.metadata = new window.chrome.cast.media.GenericMediaMetadata();
            mediaInfo.metadata.title = title;
            mediaInfo.metadata.metadataType = window.chrome.cast.media.MetadataType.GENERIC;
            
            if (logoUrl) {
                mediaInfo.metadata.images = [{ url: logoUrl }];
            }

            const request = new window.chrome.cast.media.LoadRequest(mediaInfo);
            await session.loadMedia(request);
            return true;
        }
    } catch (e) {
        console.error("Google Cast session failed:", e);
    }
    return false;
}

export function stopCastSession() {
    if (castContext) {
        try {
            castContext.endCurrentSession(true);
        } catch (e) {
            console.error("End cast session error:", e);
        }
    }
}

export function triggerAirPlay(videoElement: HTMLVideoElement | null) {
    if (videoElement && (videoElement as any).webkitShowPlaybackTargetPicker) {
        try {
            (videoElement as any).webkitShowPlaybackTargetPicker();
            return true;
        } catch (e) {
            console.error("AirPlay trigger error:", e);
        }
    }
    return false;
}

/**
 * Custom React hook to manage Chromecast and AirPlay sessions.
 */
export function useCasting(videoElement: HTMLVideoElement | null) {
    const [castState, setCastState] = useState<CastSessionState>({
        isAvailable: false,
        isCasting: false,
        deviceName: null
    });
    
    const [isAirPlaySupported, setIsAirPlaySupported] = useState(false);

    useEffect(() => {
        initCastSDK();
        
        const unsubscribe = subscribeToCastState((state) => {
            setCastState(state);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!videoElement) return;

        const handleAvailability = (event: any) => {
            setIsAirPlaySupported(event.availability === 'available');
        };

        // Standard Apple event for AirPlay target changes
        videoElement.addEventListener('webkitplaybacktargetavailabilitychanged', handleAvailability);
        return () => {
            videoElement.removeEventListener('webkitplaybacktargetavailabilitychanged', handleAvailability);
        };
    }, [videoElement]);

    const castChannel = async (url: string, title: string, logo?: string) => {
        return startCastSession(url, title, logo);
    };

    const airPlay = () => {
        return triggerAirPlay(videoElement);
    };

    return {
        isChromecastAvailable: castState.isAvailable || (typeof window !== 'undefined' && !!window.chrome?.cast),
        isCasting: castState.isCasting,
        castingDevice: castState.deviceName,
        isAirPlayAvailable: isAirPlaySupported || (videoElement && (videoElement as any).webkitShowPlaybackTargetPicker !== undefined),
        castChannel,
        airPlay,
        stopCasting: stopCastSession
    };
}
