import { DB_NAME, DB_VERSION, STORE_NAME, SUBTITLES_STORE_NAME, SETTINGS_STORE_NAME } from '../utils/constants';
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

export async function storeSubtitle(subtitleData: SubtitleData): Promise<void> {
    const db = await openDatabase();
    const transaction = db.transaction([SUBTITLES_STORE_NAME], "readwrite");
    const store = transaction.objectStore(SUBTITLES_STORE_NAME);
    store.put(subtitleData);
    return new Promise((resolve) => transaction.oncomplete = () => resolve());
}

export async function getSubtitleFromCache(subtitleId: string): Promise<SubtitleData | null> {
    const db = await openDatabase();
    const store = db.transaction([SUBTITLES_STORE_NAME], "readonly").objectStore(SUBTITLES_STORE_NAME);
    const request = store.get(subtitleId);
    return new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
    });
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

export async function saveSettings(settings: SettingsData): Promise<void> {
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
    userData.id = "userInfo";
    store.put(userData);
    return new Promise((resolve) => transaction.oncomplete = () => resolve());
}

export async function getUserInfoFromDB(): Promise<TokenData | null> {
    const db = await openDatabase();
    const store = db.transaction([STORE_NAME], "readonly").objectStore(STORE_NAME);
    const request = store.get("current");
    return new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
    });
}

export async function getQuotaInfoFromDB(): Promise<TokenData | null> {
    const db = await openDatabase();
    const store = db.transaction([STORE_NAME], "readonly").objectStore(STORE_NAME);
    const request = store.get("current");
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