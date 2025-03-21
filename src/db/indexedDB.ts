import { DB_NAME, DB_VERSION, STORE_NAME, SUBTITLES_STORE_NAME, SETTINGS_STORE_NAME, LANGUAGES_STORE_NAME, SUBTITLE_CACHE_SIZE } from '../utils/constants';
import { TokenData, SubtitleData, SettingsData } from '../types';

export async function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id" });
            }
            if (!db.objectStoreNames.contains(SUBTITLES_STORE_NAME)) {
                db.createObjectStore(SUBTITLES_STORE_NAME, { keyPath: "id" });
            }
            if (!db.objectStoreNames.contains(SETTINGS_STORE_NAME)) {
                db.createObjectStore(SETTINGS_STORE_NAME, { keyPath: "id" });
            }
            if (!db.objectStoreNames.contains(LANGUAGES_STORE_NAME)) {
                db.createObjectStore(LANGUAGES_STORE_NAME, { keyPath: "id" });
            }
        };
    });
}

export async function storeToken(tokenData: TokenData): Promise<void> {
    const db = await openDatabase();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.put({ id: "current", ...tokenData });
    return new Promise((resolve) => transaction.oncomplete = () => resolve());
}

export async function getToken(): Promise<TokenData | null> {
    const db = await openDatabase();
    if (!db.objectStoreNames.contains(STORE_NAME)) return null;
    const store = db.transaction([STORE_NAME], "readonly").objectStore(STORE_NAME);
    const request = store.get("current");
    return new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
    });
}

export async function storeSubtitle(subtitleData: any): Promise<void> {
    try {
        const db = await openDatabase();
        const transaction = db.transaction([SUBTITLES_STORE_NAME], "readwrite");
        const store = transaction.objectStore(SUBTITLES_STORE_NAME);
        
        // Check cache size
        const count = await countSubtitlesInCache(store);
        if (count >= SUBTITLE_CACHE_SIZE) {
            // Evict oldest subtitles
            await evictOldestSubtitles(store, count - (SUBTITLE_CACHE_SIZE - 1));
        }
        
        // Store the new subtitle
        store.put(subtitleData);
        
        return new Promise((resolve) => {
            transaction.oncomplete = () => resolve();
        });
    } catch (error) {
        console.error("Error storing subtitle in cache:", error);
        throw error;
    }
}

async function countSubtitlesInCache(store: IDBObjectStore): Promise<number> {
    return new Promise((resolve, reject) => {
        const countRequest = store.count();
        countRequest.onsuccess = () => resolve(countRequest.result);
        countRequest.onerror = () => reject(countRequest.error);
    });
}

async function evictOldestSubtitles(store: IDBObjectStore, deleteCount: number): Promise<void> {
    // Get all subtitles sorted by timestamp
    const allSubtitles = await getAllSubtitlesSortedByTimestamp(store);
    
    // Delete the oldest ones
    for (let i = 0; i < deleteCount && i < allSubtitles.length; i++) {
        await deleteSubtitleFromCache(store, allSubtitles[i].id);
    }
}

async function getAllSubtitlesSortedByTimestamp(store: IDBObjectStore): Promise<any[]> {
    return new Promise((resolve, reject) => {
        const request = store.index("timestamp").openCursor();
        const subtitles: any[] = [];
        
        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
                subtitles.push(cursor.value);
                cursor.continue();
            } else {
                resolve(subtitles);
            }
        };
        
        request.onerror = () => reject(request.error);
    });
}

async function deleteSubtitleFromCache(store: IDBObjectStore, subtitleId: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const request = store.delete(subtitleId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function getSubtitleFromCache(subtitleId: string): Promise<any | null> {
    try {
        const db = await openDatabase();
        const store = db.transaction([SUBTITLES_STORE_NAME], "readonly").objectStore(SUBTITLES_STORE_NAME);
        const request = store.get(subtitleId);
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error retrieving subtitle from cache:", error);
        return null;
    }
}

export async function storeSettings(settings: SettingsData): Promise<void> {
    const db = await openDatabase();
    const transaction = db.transaction([SETTINGS_STORE_NAME], "readwrite");
    const store = transaction.objectStore(SETTINGS_STORE_NAME);
    store.put({ id: "userSettings", ...settings });
    return new Promise((resolve) => transaction.oncomplete = () => resolve());
}

export async function loadSettingsFromIndexedDB(): Promise<SettingsData> {
    const db = await openDatabase();
    const store = db.transaction([SETTINGS_STORE_NAME], "readonly").objectStore(SETTINGS_STORE_NAME);
    const request = store.get("userSettings");
    return new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result || getDefaultSettings());
        request.onerror = () => resolve(getDefaultSettings());
    });
}

function getDefaultSettings(): SettingsData {
    return {
        fontSize: 16,
        fontColor: "#FFFFFF",
        bgEnabled: true,
        bgColor: "#000000",
        bgOpacity: 0.5,
        outlineEnabled: false,
        outlineColor: "#000000",
        syncOffset: 0,
        animationEnabled: true,
        animationType: "fade",
        animationDuration: 200
    };
}

export async function saveSettingsToIndexedDB(settings: SettingsData): Promise<void> {
    const db = await openDatabase();
    const transaction = db.transaction([SETTINGS_STORE_NAME], "readwrite");
    const store = transaction.objectStore(SETTINGS_STORE_NAME);
    store.put({ id: "userSettings", ...settings });
    return new Promise((resolve) => transaction.oncomplete = () => resolve());
}

export async function saveUserInfoToDB(userData: any): Promise<void> {
    const db = await openDatabase();
    const transaction = db.transaction([SETTINGS_STORE_NAME], "readwrite");
    const store = transaction.objectStore(SETTINGS_STORE_NAME);
    store.put({ id: "userInfo", ...userData });
    return new Promise((resolve) => transaction.oncomplete = () => resolve());
}

export async function getUserInfoFromDB(): Promise<any | null> {
    const db = await openDatabase();
    const transaction = db.transaction([SETTINGS_STORE_NAME], "readonly");
    const store = transaction.objectStore(SETTINGS_STORE_NAME);
    const request = store.get("userInfo");
    return new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
    });
}

export async function getTokenDataFromDB(): Promise<TokenData | null> {
    const db = await openDatabase();
    const store = db.transaction([STORE_NAME], "readonly").objectStore(STORE_NAME);
    const request = store.get("current");
    return new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
    });
}

export async function storeLanguages(languagesData: { data: any[]; timestamp: number }): Promise<void> {
    const db = await openDatabase();
    const transaction = db.transaction([LANGUAGES_STORE_NAME], "readwrite");
    const store = transaction.objectStore(LANGUAGES_STORE_NAME);
    store.put({ id: "cachedLanguages", ...languagesData });
    return new Promise((resolve) => transaction.oncomplete = () => resolve());
}

export async function loadCachedLanguages(): Promise<{ data: any[]; timestamp: number } | null> {
    const db = await openDatabase();
    const transaction = db.transaction([LANGUAGES_STORE_NAME], "readonly");
    const store = transaction.objectStore(LANGUAGES_STORE_NAME);
    const request = store.get("cachedLanguages");
    return new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
    });
}

export async function checkSubtitleInCache(subtitleId: string): Promise<any | null> {
    const db = await openDatabase();
    if (!db) {
        return null;
    }

    try {
        return await new Promise((resolve) => {
            const transaction = db.transaction([SUBTITLES_STORE_NAME], "readonly");
            const subtitlesStore = transaction.objectStore(SUBTITLES_STORE_NAME);
            const request = subtitlesStore.get(subtitleId);

            request.onsuccess = () => {
                resolve(request.result || null);
            };

            request.onerror = (event) => {
                console.error("Error checking subtitle cache:", event);
                resolve(null);
            };
        });
    } catch (error) {
        console.error("Transaction error checking subtitle cache:", error);
        return null;
    }
}