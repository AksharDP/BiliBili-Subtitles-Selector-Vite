import { VIP_API_ENDPOINT, PUBLIC_API_ENDPOINT, MOCK_API_ENDPOINT, API_KEY, USER_AGENT } from '../utils/constants';
import { loadCachedLanguages, storeLanguages, getSubtitleFromCache, storeSubtitle } from '../db/indexedDB';
import { TokenData } from '../types';


// export async function loginWithToken(token: string): Promise<any> {
//     const response = await fetch(`${VIP_API_ENDPOINT}/login`, {
//         method: "POST",
//         headers: {
//             "Content-Type": "application/json",
//             "Api-Key": API_KEY,
//             "User-Agent": USER_AGENT,
//         },
//         body: JSON.stringify({ token }),
//     });
//     return response.json();
// }

export async function validateToken(token: string): Promise<any> {
    try {
        const response = await fetch(`${PUBLIC_API_ENDPOINT}/infos/user`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Api-Key": API_KEY,
                "Authorization": `Bearer ${token}`,
                "User-Agent": USER_AGENT,
            },
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
    const isLocallyValid = tokenAge < 30 * 24 * 60 * 60 * 1000; // 30 days

    if (isLocallyValid) return true;

    const apiEndpoint = tokenData.base_url === 'vip-api.opensubtitles.com' ? VIP_API_ENDPOINT : PUBLIC_API_ENDPOINT;
    try {
        const response = await fetch(`${apiEndpoint}/infos/user`, {
            headers: {
                "Content-Type": "application/json",
                "Api-Key": API_KEY,
                "Authorization": `Bearer ${tokenData.token}`,
                "User-Agent": USER_AGENT,
            },
        });
        return response.ok;
    } catch (error) {
        console.error('Error verifying token with server:', error);
        return true; // Assume valid on network error
    }
}

export async function getUserInfo(tokenData: TokenData): Promise<any> {
    if (!tokenData?.token) return null;

    const apiEndpoint = tokenData.base_url === 'vip-api.opensubtitles.com' ? VIP_API_ENDPOINT : PUBLIC_API_ENDPOINT;
    try {
        const response = await fetch(`${apiEndpoint}/infos/user`, {
            headers: {
                "Content-Type": "application/json",
                "Api-Key": API_KEY,
                "Authorization": `Bearer ${tokenData.token}`,
                "User-Agent": USER_AGENT,
            },
        });
        
        const data = await response.json();
        data.timestamp = Date.now();
        return data;
    } catch (error) {
        console.error('Error fetching user info:', error);
        return null;
    }
}

export async function getLanguages(): Promise<any> {
    try {
        const cached = await loadCachedLanguages();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (cached && cached.data && cached.data.length > 0 && (Date.now() - cached.timestamp) < sevenDays) {
            console.log("[Subtitles Selector] Returning cached languages");
            return { data: cached.data };
        }
        const response = await fetch(`${MOCK_API_ENDPOINT}/infos/languages`, {
            headers: {
                "Content-Type": "application/json",
                "Api-Key": API_KEY,
                "User-Agent": USER_AGENT,
            },
        });
        const result = await response.json();
        // Save result along with current timestamp
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
    // print endpoint and params
    console.log(apiEndpoint);
    console.log(searchParams.toString());
    try {
        const response = await fetch(`${apiEndpoint}/subtitles?${searchParams.toString()}`, {
            method: 'GET',
            headers: {
                'Api-Key': API_KEY,
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenData.token}`,
                'User-Agent': USER_AGENT
            }
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `API error: ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('Error searching subtitles:', error);
        throw error;
    }
}

export async function fetchSubtitleContent(tokenData: TokenData, fileId: string): Promise<any> {
    if (!tokenData?.token) {
        throw new Error("Authentication required");
    }

    const apiEndpoint = tokenData.base_url?.includes("vip") 
        ? VIP_API_ENDPOINT 
        : PUBLIC_API_ENDPOINT;
    
    try {
        const response = await fetch(`${apiEndpoint}/subtitles/${fileId}`, {
            method: 'GET',
            headers: {
                'Api-Key': API_KEY,
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenData.token}`,
                'User-Agent': USER_AGENT
            }
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `API error: ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error(`Error fetching subtitle content for ID ${fileId}:`, error);
        throw error;
    }
}

export async function downloadSubtitle(tokenData: TokenData, fileId: string): Promise<any> {
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
                'User-Agent': USER_AGENT
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

export async function fetchSubtitleData(tokenData: TokenData, subtitleId: string, resultData?: any): Promise<any> {
    // Check cache first
    const cachedSubtitle = await getSubtitleFromCache(subtitleId);
    if (cachedSubtitle) {
        console.log(`[Subtitles Selector] Using cached subtitle: ${subtitleId}`);
        return cachedSubtitle;
    }

    if (!tokenData?.token) {
        throw new Error("Authentication required");
    }

    const apiEndpoint = tokenData.base_url?.includes("vip") 
        ? VIP_API_ENDPOINT 
        : PUBLIC_API_ENDPOINT;
    
    // Extract file_id from result data if available
    const fileId = resultData?.attributes?.files?.[0]?.file_id || resultData?.attributes?.file_id;
    if (!fileId) {
        throw new Error("Could not find file_id in subtitle information");
    }

    try {
        // Step 1: Get download link
        const response = await fetch(`${apiEndpoint}/download`, {
            method: 'POST',
            headers: {
                'Api-Key': API_KEY,
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenData.token}`,
                'User-Agent': USER_AGENT
            },
            body: JSON.stringify({ file_id: fileId }),
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `API error: ${response.status}`);
        }
        
        const data = await response.json();
        const downloadLink = data.link;
        
        // Step 2: Download the actual subtitle content
        const contentResponse = await fetch(downloadLink);
        if (!contentResponse.ok) {
            throw new Error(`Failed to download subtitle content: ${contentResponse.statusText}`);
        }
        
        const content = await contentResponse.text();
        const fileName = data.file_name || `subtitle_${subtitleId}.srt`;
        
        // Create a subtitle data object
        const subtitleData = {
            id: subtitleId,
            content,
            fileName,
            title: resultData?.attributes?.feature_details?.title || fileName,
            timestamp: Date.now()
        };
        
        // Store in cache
        await storeSubtitle(subtitleData);
        
        return subtitleData;
    } catch (error) {
        console.error(`Error fetching subtitle data for ID ${subtitleId}:`, error);
        throw error;
    }
}