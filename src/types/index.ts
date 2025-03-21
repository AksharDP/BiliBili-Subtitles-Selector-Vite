export interface TokenData {
    token: string;
    base_url: string;
    timestamp: number;
}

export interface SubtitleData {
    id: string;
    content: string;
    fileName: string;
    language: string;
    title: string;
    timestamp: number;
}

export interface SettingsData {
    fontSize: number;
    fontColor: string;
    bgEnabled: boolean;
    bgColor: string;
    bgOpacity: number;
    outlineEnabled: boolean;
    outlineColor: string;
    syncOffset: number;
    animationEnabled: boolean;
    animationType: string;
    animationDuration: number;
}

export interface TokenData {
    token: string;
    base_url: string;
    timestamp: number;
    userData?: {
        allowed_downloads: number;
        level: string;
        user_id: number;
        ext_installed: boolean;
        vip: boolean;
        downloads_count: number;
        remaining_downloads: number;
    };
}