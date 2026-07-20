import { useState, useEffect } from 'react';

export type StreamStatus = 'online' | 'offline' | 'slow' | 'checking';

const statusCache = new Map<string, StreamStatus>();
const listeners = new Set<(url: string, status: StreamStatus) => void>();

export function getCachedStatus(url: string): StreamStatus {
    return statusCache.get(url) || 'checking';
}

export function subscribeToStatus(listener: (url: string, status: StreamStatus) => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

// Queue for checking status in batches
const checkQueue: string[] = [];
let activeChecks = 0;
const MAX_CONCURRENT_CHECKS = 4;

async function processQueue() {
    if (checkQueue.length === 0 || activeChecks >= MAX_CONCURRENT_CHECKS) return;

    const url = checkQueue.shift();
    if (!url) return;

    activeChecks++;
    
    // Notify listeners that checking has started
    statusCache.set(url, 'checking');
    listeners.forEach(l => l(url, 'checking'));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000); // 7 seconds timeout
    const start = performance.now();

    try {
        // Fetch with no-cors. If it responds (even with opaque body), the server is alive
        await fetch(url, {
            method: 'GET',
            mode: 'no-cors',
            signal: controller.signal,
            headers: {
                'Range': 'bytes=0-1' // Request only first byte to save bandwidth
            }
        });
        clearTimeout(timeoutId);
        const duration = performance.now() - start;
        const status = duration > 4000 ? 'slow' : 'online';
        statusCache.set(url, status);
        listeners.forEach(l => l(url, status));
    } catch (e) {
        clearTimeout(timeoutId);
        statusCache.set(url, 'offline');
        listeners.forEach(l => l(url, 'offline'));
    } finally {
        activeChecks--;
        // Process next item in queue
        processQueue();
    }
}

export function enqueueStreamCheck(url: string) {
    if (statusCache.has(url) && statusCache.get(url) !== 'checking') return;
    
    // Avoid double queuing
    if (checkQueue.includes(url)) return;

    checkQueue.push(url);
    processQueue();
}

/**
 * Custom React hook to subscribe to stream statuses for a list of URLs
 */
export function useStreamStatuses(urls: string[]) {
    const [statuses, setStatuses] = useState<Record<string, StreamStatus>>(() => {
        const initial: Record<string, StreamStatus> = {};
        urls.forEach(url => {
            initial[url] = getCachedStatus(url);
        });
        return initial;
    });

    useEffect(() => {
        // Enqueue status checks
        urls.forEach(url => {
            enqueueStreamCheck(url);
        });

        const unsubscribe = subscribeToStatus((url, newStatus) => {
            setStatuses(prev => {
                // Only update state if the status has actually changed
                if (prev[url] === newStatus) return prev;
                return {
                    ...prev,
                    [url]: newStatus
                };
            });
        });

        return () => unsubscribe();
    }, [urls]);

    return statuses;
}
