export const DB_NAME = "BiliBiliSubtitlesSelector";
export const DB_VERSION = 1;
export const STORE_NAME = "tokens";
export const SUBTITLES_STORE_NAME = "subtitles";
export const SETTINGS_STORE_NAME = "settings";
export const VIP_API_ENDPOINT = "https://vip-api.opensubtitles.com/api/v1";
export const PUBLIC_API_ENDPOINT = "https://api.opensubtitles.com/api/v1";
export const MOCK_API_ENDPOINT = "https://stoplight.io/mocks/opensubtitles/opensubtitles-api/2781383";
export const API_KEY = "tvtbGAFEHAWjXcQD0QxOAfKIPbRWFGSW";
export const USER_AGENT = "BiliBili Subtitles Selector 0.0.1";
export const TOKEN_EXPIRY_DAYS = 30;
export const LANGUAGES_STORE_NAME = "languages";
export const SUBTITLE_CACHE_SIZE = 20;

export let subtitleApplicationInProgress = false;
export let currentSearchResults: any[] = [];
export let currentPage = 1;
export let totalPages = 1;
export let totalCount = 0;
export let perPage = 50;
export let currentSearchQuery = "";
export let currentSearchParams: string | null = null;

export let currentFontColor = "#FFFFFF";
export let currentOutlineColor = "#000000";
export let currentBgColor = "#000000";