import {API_KEY, MOCK_API_ENDPOINT, PUBLIC_API_ENDPOINT, USER_AGENT, VIP_API_ENDPOINT} from '../utils/constants';

import {getSubtitleFromCache, loadCachedLanguages, storeLanguages, storeSubtitle, getUserInfoFromDB, saveUserInfoToDB} from '../db/indexedDB';
import {TokenData} from '../types';

export async function validateToken(token: string): Promise<any> {
    console.log("Validating token:", token);
    try {
        
        
        const response = await fetch(`${PUBLIC_API_ENDPOINT}/infos/user`, {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "Api-Key": API_KEY,
                "Authorization": `Bearer ${token}`,
                "X-User-Agent": USER_AGENT
            }
        });

        if (!response.ok) {
            throw new Error(`API returned status ${response.status}`);
        }

        console.log(response);
        
        const data = await response.json();
        return {
            valid: true,
            userData: data.data,
            token: token,
            base_url: 'api.opensubtitles.com'
        };
    } catch (error) {
        console.error('Error validating token:', error);
        return { valid: false, error };
    }
}

export async function checkToken(tokenData: TokenData): Promise<boolean> {
    if (!tokenData?.token) return false;

    const tokenAge = Date.now() - (tokenData.timestamp || 0);
    if (tokenAge < (30 * 24 * 60 * 60 * 1000)) return true;

    const apiEndpoint = tokenData.base_url === 'vip-api.opensubtitles.com' ? VIP_API_ENDPOINT : PUBLIC_API_ENDPOINT;
    try {
        const response = await fetch(`${apiEndpoint}/infos/user`, {
            headers: {
                "Content-Type": "application/json",
                "Api-Key": API_KEY,
                "Authorization": `Bearer ${tokenData.token}`,
                "X-User-Agent": USER_AGENT,
            },
        });
        return response.ok;
    } catch (error) {
        console.error('Error verifying token with server:', error);
        return true;
    }
}

export async function getUserInfo(tokenData: TokenData): Promise<any> {
    if (!tokenData?.token) return null;

    const cachedUserInfo = await getUserInfoFromDB();
    if (cachedUserInfo && (Date.now() - cachedUserInfo.timestamp) < (30 * 24 * 60 * 60 * 1000)) {
        console.log("[Subtitles Selector] Returning cached user info");
        return cachedUserInfo;
    }

    const apiEndpoint = tokenData.base_url === 'vip-api.opensubtitles.com' ? VIP_API_ENDPOINT : PUBLIC_API_ENDPOINT;
    try {
        const response = await fetch(`${apiEndpoint}/infos/user`, {
            headers: {
                "Content-Type": "application/json",
                "Api-Key": API_KEY,
                "Authorization": `Bearer ${tokenData.token}`,
                "X-User-Agent": USER_AGENT,
            },
        });
        
        const data = await response.json();
        data.timestamp = Date.now();
        await saveUserInfoToDB(data);
        return data;
    } catch (error) {
        console.error('Error fetching user info:', error);
        return null;
    }
}

export async function getLanguages(): Promise<any> {
    try {
        const cached = await loadCachedLanguages();
        if (cached && cached.data && cached.data.length > 0 && (Date.now() - cached.timestamp) < (7 * 24 * 60 * 60 * 1000)) {
            console.log("[Subtitles Selector] Returning cached languages");
            return { data: cached.data };
        }
        const response = await fetch(`${MOCK_API_ENDPOINT}/infos/languages`, {
            headers: {
                "Content-Type": "application/json",
                "Api-Key": API_KEY,
                "X-User-Agent": USER_AGENT,
            },
        });
        const result = await response.json();
        await storeLanguages({ data: result.data, timestamp: Date.now() });
        return result;
    } catch (error) {
        console.error('Error fetching languages:', error);
        return null;
    }
}

export async function searchSubtitles(tokenData: TokenData, searchParams: URLSearchParams): Promise<any> {
    if (!tokenData?.token) {
        throw new Error("Authentication required");
    }

    const apiEndpoint = tokenData.base_url?.includes("vip") 
        ? VIP_API_ENDPOINT 
        : PUBLIC_API_ENDPOINT;
    console.log(apiEndpoint);
    console.log(searchParams.toString());
    try {
        const response = await fetch(`${apiEndpoint}/subtitles?${searchParams.toString()}`, {
            method: 'GET',
            headers: {
                'Api-Key': API_KEY,
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenData.token}`,
                'X-User-Agent': USER_AGENT
            }
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `API error: ${response.status}`);
        }
        console.log(data);
        return data;
    } catch (error) {
        console.error('Error searching subtitles:', error);
        throw error;
    }
}

export async function getDownloadSubtitleInfo(tokenData: TokenData, fileId: string): Promise<any> {
    const cachedSubtitle = await getSubtitleFromCache(fileId);
    if (cachedSubtitle) {
        console.log(`[Subtitles Selector] Using cached subtitle: ${fileId}`);
        return cachedSubtitle;
    }

    if (!tokenData?.token) {
        throw new Error("Authentication required");
    }

    const apiEndpoint = tokenData.base_url?.includes("vip") 
        ? VIP_API_ENDPOINT 
        : PUBLIC_API_ENDPOINT;
    
    try {
        const response = await fetch(`${apiEndpoint}/download`, {
            method: 'POST',
            headers: {
                'Api-Key': API_KEY,
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenData.token}`,
                'X-User-Agent': USER_AGENT
            },
            body: JSON.stringify({
                file_id: fileId
            })
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `API error: ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error(`Error downloading subtitle ID ${fileId}:`, error);
        throw error;
    }
}

export async function fetchSubtitleData(tokenData: TokenData, subtitleId: string): Promise<any> {
    const cachedSubtitle = await getSubtitleFromCache(subtitleId);
    if (cachedSubtitle) {
        console.log(`[Subtitles Selector] Using cached subtitle: ${subtitleId}`);
        return cachedSubtitle;
    }

    if (!tokenData?.token) {
        throw new Error("Authentication required");
    }
    
    try {
        const downloadData = await getDownloadSubtitleInfo(tokenData, subtitleId);
        
        const contentResponse = await fetch(downloadData.link);
        if (!contentResponse.ok) {
            throw new Error(`Failed to download subtitle content: ${contentResponse.statusText}`);
        }
        const content = await contentResponse.text();
        
        const fileId = downloadData.files && downloadData.files.length > 0 ? downloadData.files[0].file_id : subtitleId;
        const fileName = downloadData.file_name || `subtitle_${subtitleId}.srt`;
        
        const subtitleData = {
            id: fileId,
            content,
            fileName,
            title: downloadData.file_name,
            timestamp: Date.now(),
        };
        
        await storeSubtitle(subtitleData);
        
        return subtitleData;
    } catch (error) {
        console.error(`Error fetching subtitle data for ID ${subtitleId}:`, error);
        throw error;
    }
}
