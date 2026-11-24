/**
 * Ultra-lightweight, zero-dependency Offline Storage using IndexedDB
 * with automatic fallback to localStorage and in-memory cache.
 */

const DB_NAME = 'yoogi_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'user_cache';
const memoryStore = new Map();

const getIDB = () => {
    if (typeof window !== 'undefined' && window.indexedDB) return window.indexedDB;
    return null;
};

const openDatabase = () => {
    const idb = getIDB();
    if (!idb) return Promise.resolve(null);

    return new Promise((resolve) => {
        try {
            const request = idb.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = (err) => {
                console.warn('[OfflineStorage] IndexedDB open error, using fallback:', err);
                resolve(null);
            };
        } catch (e) {
            console.warn('[OfflineStorage] IndexedDB exception:', e);
            resolve(null);
        }
    });
};

export const setCacheItem = async (key, value) => {
    try {
        const db = await openDatabase();
        if (db) {
            return new Promise((resolve) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const req = store.put(value, key);
                req.onsuccess = () => resolve(true);
                req.onerror = () => {
                    fallbackSet(key, value);
                    resolve(false);
                };
            });
        } else {
            fallbackSet(key, value);
            return true;
        }
    } catch (e) {
        fallbackSet(key, value);
        return false;
    }
};

export const getCacheItem = async (key) => {
    try {
        const db = await openDatabase();
        if (db) {
            return new Promise((resolve) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const req = store.get(key);
                req.onsuccess = () => {
                    if (req.result !== undefined) {
                        resolve(req.result);
                    } else {
                        resolve(fallbackGet(key));
                    }
                };
                req.onerror = () => {
                    resolve(fallbackGet(key));
                };
            });
        } else {
            return fallbackGet(key);
        }
    } catch (e) {
        return fallbackGet(key);
    }
};

// Fallback helpers for localStorage and memoryStore
const fallbackSet = (key, value) => {
    const storageKey = `yoogi_cache_${key}`;
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            window.localStorage.setItem(storageKey, JSON.stringify(value));
            return;
        } catch (e) {
            // Quota exceeded
        }
    }
    memoryStore.set(storageKey, value);
};

const fallbackGet = (key) => {
    const storageKey = `yoogi_cache_${key}`;
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            const raw = window.localStorage.getItem(storageKey);
            if (raw) return JSON.parse(raw);
        } catch (e) {
            // ignore
        }
    }
    return memoryStore.has(storageKey) ? memoryStore.get(storageKey) : null;
};

/**
 * Cache complete user application data snapshot for offline startup.
 */
export const saveUserAppData = async (userId, data) => {
    if (!userId || !data) return;
    const payload = {
        ...data,
        cachedAt: Date.now()
    };
    await setCacheItem(`app_data_${userId}`, payload);
};

/**
 * Load cached user application data snapshot.
 */
export const loadUserAppData = async (userId) => {
    if (!userId) return null;
    return await getCacheItem(`app_data_${userId}`);
};
